// @ts-nocheck
import {
  generateText,
  streamText,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createGroq } from '@ai-sdk/groq'
import { createCerebras } from '@ai-sdk/cerebras'
import { createOllama } from 'ai-sdk-ollama'
import { getBrowserCompatibility } from '@/lib/utils/browserDetection.js'
import { requiresApiProxy } from '@/lib/utils/contextDetection.js'
import { createOllamaProxyModel } from './ollamaProxyModel.js'
import {
  isOverloadError,
  isQuotaError,
  isModelUnavailableError,
  getNextFallbackModel,
  getNextAdvancedFallbackModel,
  shouldEnableAutoFallback,
  shouldEnableApiKeyRetry,
  getCurrentGeminiModel,
} from '@/lib/utils/geminiAutoFallback.js'
import { reportModelStatus as updateModelStatus } from '@/lib/api/modelStatusReporter.js'

import { showModelFallbackToast } from '@/lib/utils/toastUtils.js'


// Global index for round-robin key rotation
let currentKeyIndex = 0

/**
 * Helper to get the next Gemini API key using sequential calculation
 * @param {object} settings - User settings
 * @returns {string} The selected API key
 */
function getGeminiApiKey(settings) {
  // Combine main key and additional keys (unified for both modes)
  const allKeys = [
    settings.geminiApiKey,
    ...(settings.geminiAdditionalApiKeys || [])
  ]
  
  // Filter out empty keys
  const validKeys = allKeys.filter((k) => k && k.trim() !== '')

  if (validKeys.length === 0) {
    return settings.geminiApiKey // Fallback even if empty
  }

  // Use round-robin selection
  const key = validKeys[currentKeyIndex % validKeys.length]
  console.log(
    `[aiSdkAdapter] 🔑 Using Gemini Key Index ${currentKeyIndex % validKeys.length} (Total: ${validKeys.length})`
  )
  
  // Increment index for next call
  currentKeyIndex++
  
  return key
}

/**
 * Maps provider ID and settings to AI SDK model instance
 * @param {string} providerId - The provider identifier
 * @param {object} settings - User settings object
 * @returns {object} AI SDK model instance
 */
export function getAISDKModel(providerId, settings) {
  // Check if we need to use proxy for this provider in current context
  if (requiresApiProxy(providerId)) {
    return createOllamaProxyModel(settings)
  }

  switch (providerId) {
    case 'gemini':
      // Use sequential rotation for keys or specific key if provided
      const geminiApiKey = settings.specificApiKey || getGeminiApiKey(settings)
      const geminiModel = settings.selectedGeminiModel || 'gemini-3-flash-preview'

      if (!geminiApiKey || geminiApiKey.trim() === '') {
        throw new Error(
          `Gemini API key is not configured. Please add your API key in settings.`
        )
      }

      // Đảm bảo API key là string và không có khoảng trắng thừa
      const cleanApiKey = geminiApiKey.trim()

      try {
        // Tạo Google provider instance với API key
        const googleProvider = createGoogleGenerativeAI({
          apiKey: cleanApiKey,
        })

        // Tạo model từ provider
        const model = googleProvider(geminiModel)
        return model
      } catch (error) {
        console.error('[aiSdkAdapter] Error creating Google model:', error)
        throw error
      }

    case 'openai':
    case 'chatgpt':
      const openai = createOpenAI({
        apiKey: settings.chatgptApiKey,
        baseURL: settings.chatgptBaseUrl,
      })
      return openai(settings.selectedChatgptModel || 'gpt-5.6-luna')

    case 'groq':
      const groq = createGroq({
        apiKey: settings.groqApiKey,
      })
      return groq(settings.selectedGroqModel || 'llama-3.3-70b-versatile')

    case 'openrouter':
      const openrouter = createOpenRouter({
        apiKey: settings.openrouterApiKey,
      })
      return openrouter(settings.selectedOpenrouterModel || 'openrouter/free')

    case 'deepseek':
      // Dedicated DeepSeek provider (not the generic openai-compatible one) so
      // usage carries `prompt_cache_hit_tokens` → `cachedInputTokens`, letting
      // the UI show the cached-prompt count. Falls back to the provider's own
      // default baseURL when the user hasn't set a custom one.
      const deepseek = createDeepSeek({
        apiKey: settings.deepseekApiKey,
        baseURL: settings.deepseekBaseUrl || undefined,
      })
      return deepseek(settings.selectedDeepseekModel || 'deepseek-v4-flash')

    case 'ollama':
      const ollama = createOllama({
        baseURL: settings.ollamaEndpoint || 'http://127.0.0.1:11434',
      })
      return ollama(settings.selectedOllamaModel || 'llama2')

    case 'openaiCompatible':
      const openaiCompatible = createOpenAICompatible({
        name: 'openai-compatible',
        apiKey: settings.openaiCompatibleApiKey,
        baseURL: settings.openaiCompatibleBaseUrl,
      })
      return openaiCompatible(
        settings.selectedOpenAICompatibleModel || 'gpt-3.5-turbo'
      )

    case 'lmstudio':
      const lmstudio = createOpenAICompatible({
        name: 'lmstudio',
        apiKey: 'lmstudio', // LM Studio doesn't require API key, but OpenAI provider needs one
        baseURL: settings.lmStudioEndpoint || 'http://localhost:1234/v1',
      })
      return lmstudio(
        settings.selectedLmStudioModel || 'lmstudio-community/gemma-2b-it-GGUF'
      )

    case 'cerebras':
      const cerebras = createCerebras({
        apiKey: settings.cerebrasApiKey,
      })
      return cerebras(settings.selectedCerebrasModel || 'gpt-oss-120b')

    case 'nvidia':
      // NVIDIA NIM has no dedicated AI SDK package — it exposes an
      // OpenAI-compatible surface at integrate.api.nvidia.com/v1.
      const nvidia = createOpenAICompatible({
        name: 'nvidia',
        apiKey: settings.nvidiaApiKey,
        baseURL: 'https://integrate.api.nvidia.com/v1',
      })
      return nvidia(
        settings.selectedNvidiaModel || 'deepseek-ai/deepseek-v4-flash'
      )

    default:
      throw new Error(`Unsupported provider: ${providerId}`)
  }
}

/**
 * Maps user settings to AI SDK generation configuration
 * @param {object} settings - User settings object
 * @returns {object} Generation configuration for AI SDK
 */
export function mapGenerationConfig(settings) {
  const config = {
    maxOutputTokens: 4000, // Default max output tokens
  }
  
  return config
}

/**
 * Wraps a model with extractReasoningMiddleware to automatically remove <think> tags
 * @param {object} model - The base AI SDK model instance
 * @returns {object} Wrapped model that extracts reasoning content
 */
export function wrapModelWithReasoningExtraction(model) {
  return wrapLanguageModel({
    model,
    middleware: extractReasoningMiddleware({
      tagName: 'think',
    }),
  })
}

/**
 * Validate and normalize a provider-agnostic generation request.
 * Exactly one input form is allowed so prompt callers and message callers use
 * the same retry, fallback, proxy, and abort paths.
 * @param {import('../chat/contracts.js').GenerationRequest & object} request
 * @returns {import('../chat/contracts.js').GenerationRequest & object}
 */
export function normalizeGenerationRequest(request) {
  if (!request || typeof request !== 'object') {
    throw new TypeError('Generation request must be an object')
  }

  const hasPrompt = request.prompt !== undefined
  const hasMessages = request.messages !== undefined

  if (hasPrompt === hasMessages) {
    throw new Error(
      'Generation request must contain exactly one of "prompt" or "messages"'
    )
  }
  if (hasMessages && !Array.isArray(request.messages)) {
    throw new TypeError('Generation request messages must be an array')
  }
  if (!request.providerId) {
    throw new Error('Generation request requires a providerId')
  }
  if (!request.settings || typeof request.settings !== 'object') {
    throw new Error('Generation request requires settings')
  }

  const { systemInstruction, ...normalized } = request
  return {
    ...normalized,
    system: normalized.system ?? systemInstruction,
  }
}

function createPromptGenerationRequest(
  providerId,
  settings,
  systemInstruction,
  userPrompt,
  options = {}
) {
  return normalizeGenerationRequest({
    ...options,
    providerId,
    settings,
    system: systemInstruction,
    prompt: userPrompt,
  })
}

/**
 * Compatibility wrapper for existing positional prompt callers.
 * @returns {Promise<string>} Generated content
 */
export async function generateContent(
  providerId,
  settings,
  systemInstruction,
  userPrompt,
  options = {}
) {
  return generateContentRequest(
    createPromptGenerationRequest(
      providerId,
      settings,
      systemInstruction,
      userPrompt,
      options
    )
  )
}

/**
 * Generate content from a normalized prompt or messages request.
 * @param {import('../chat/contracts.js').GenerationRequest & object} request
 * @returns {Promise<string>} Generated content
 */
export async function generateContentRequest(request) {
  const normalizedRequest = normalizeGenerationRequest(request)
  const {
    providerId,
    settings,
    system: systemInstruction,
    prompt,
    messages,
    providerOptions,
    abortSignal,
    tools,
    ...generationOptions
  } = normalizedRequest
  // Check if auto-fallback is enabled (Gemini Basic only)
  const autoFallbackEnabled = shouldEnableAutoFallback(providerId, settings)
  // Check if API key retry is enabled (Both Gemini Basic and Advanced)
  const apiKeyRetryEnabled = shouldEnableApiKeyRetry(providerId, settings)
  
  let currentModel = autoFallbackEnabled
    ? getCurrentGeminiModel(settings)
    : null
  let originalModel = currentModel // Track original model for fallback display
  let lastError = null
  let failedKeys = new Set() // Track failed keys for this request
  let currentApiKey = null // Track current key being used

  // Retry with fallback models if enabled
  while (true) {
    try {
      // Create settings with current model & key
      // If apiKeyRetryEnabled (Gemini Basic or Advanced), explicit key management is needed
      if (apiKeyRetryEnabled && !currentApiKey) {
           const allKeys = [
               settings.geminiApiKey,
               ...(settings.geminiAdditionalApiKeys || [])
             ]
           const validKeys = allKeys.filter(k => k && k.trim() !== '')
           
           if (validKeys.length > 0) {
               // Use the next sequential key
               currentApiKey = getGeminiApiKey(settings)
           }
      }

      const currentSettings = {
        ...settings,
        ...(autoFallbackEnabled ? { selectedGeminiModel: currentModel } : {}),
        ...(currentApiKey ? { specificApiKey: currentApiKey } : {})
      }

      // Determine model name for display and logging
      const modelName = autoFallbackEnabled
        ? currentModel
        : getDisplayModelName(providerId, settings)

      console.log(
        `[aiSdkAdapter] 📡 API Call - Provider: ${providerId}, Model: ${modelName}`
      )

      // Update UI with current model status
      const isFallback = autoFallbackEnabled && currentModel !== originalModel
      updateModelStatus(
        modelName,
        isFallback ? originalModel : null,
        isFallback
      )

      const baseModel = getAISDKModel(providerId, currentSettings)

      // Gemma models do not support system instructions via the API
      // User request: Remove system instruction completely for these smaller models as they don't handle long prompts well
      const isGemmaModel = modelName.toLowerCase().includes('gemma')
      const effectiveSystemInstruction = isGemmaModel ? undefined : systemInstruction
      const input = messages ? { messages } : { prompt }

      // Check if this is a proxy model
      const isProxyModel = requiresApiProxy(providerId)
      // DISABLE REASONING EXTRACTION MIDDLEWARE FOR TESTING - KEEP FULL OUTPUT WITH <think> TAGS
      const model = baseModel // Use raw baseModel without wrapping to preserve <think> tags
      const generationConfig = mapGenerationConfig(currentSettings)

      if (isProxyModel) {
        // Use the proxy model's custom generateText method
        console.log('[aiSdkAdapter] Using proxy model for generateContent')
        const result = await model.generateText({
          instructions: effectiveSystemInstruction,
          ...input,
          ...generationConfig,
          ...generationOptions,
          ...(tools && { tools }),
          ...(providerOptions && { providerOptions }),
          ...(abortSignal && { abortSignal }),
        })
        console.log('[DEBUG] Proxy raw result:', result.text) // Add debug log
        console.log(`[aiSdkAdapter] ✅ API Success - Model: ${modelName}`)
        return result.text
      } else {
        // Use the standard AI SDK generateText for direct calls - no middleware
        const { text } = await generateText({
          model,
          instructions: effectiveSystemInstruction,
          ...input,
          maxRetries: 0, // Disable AI SDK built-in retry to allow custom fallback to work faster
          ...generationConfig,
          ...generationOptions,
          ...(tools && { tools }),
          ...(providerOptions && { providerOptions }),
          ...(abortSignal && { abortSignal }),
        })
        console.log(`[aiSdkAdapter] ✅ API Success - Model: ${modelName}`)
        return text
      }
    } catch (error) {
      const failedModel = autoFallbackEnabled
        ? currentModel
        : getDisplayModelName(providerId, settings)
      console.error(
        `[aiSdkAdapter] ❌ API Failed - Model: ${failedModel}`,
        error
      )

      // Enhanced logging for debugging fallback flow
      console.log('[aiSdkAdapter] 🔍 Error details:', {
        name: error?.constructor?.name,
        message: error?.message,
        status: error?.status || error?.statusCode,
        cause: error?.cause,
        isOverloadError: isOverloadError(error),
        autoFallbackEnabled,
        currentModel,
        providerId,
      })

      lastError = error

      // Check if this is an abort error - if so, just return (don't throw)
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log('[aiSdkAdapter] Request aborted by user')
        throw error // Re-throw abort error so caller knows it was aborted
      }

        // 1. Check for Quota Error (429) -> Try different KEY (for both Basic and Advanced)
      if (apiKeyRetryEnabled && isQuotaError(error)) {
         console.log(`[aiSdkAdapter] ⚠️ Quota exceeded for key ending in ...${currentApiKey?.slice(-4)}`)
         failedKeys.add(currentApiKey)
         
         // Find a key that hasn't failed yet
         const allKeys = [
               settings.geminiApiKey,
               ...(settings.geminiAdditionalApiKeys || [])
             ]
         const validKeys = allKeys.filter(k => k && k.trim() !== '')
         const availableKeys = validKeys.filter(k => !failedKeys.has(k))
         
         if (availableKeys.length > 0) {
             // Pick next available key
             currentApiKey = availableKeys[0]
             console.log(`[aiSdkAdapter] 🔄 Switching to fresh API key ending in ...${currentApiKey.slice(-4)}`)
             continue // Retry loop with new key
         } else {
             console.log('[aiSdkAdapter] ❌ All API keys exhausted (Quota)')
             // If all keys exhausted for Advanced mode, throw error
             // For Basic mode, try model fallback as last resort
         }
      }

      // 2. Check for Overload Error (503), a retired model (404), OR (All keys failed quota) -> Try different MODEL
      if (autoFallbackEnabled) {
          if (isOverloadError(error) || isModelUnavailableError(error) || (isQuotaError(error) && failedKeys.size >= ([settings.geminiApiKey, ...(settings.geminiAdditionalApiKeys||[])].filter(k => k && k.trim() !== '').length || 1))) {
               const nextModel = getNextAdvancedFallbackModel(currentModel, settings)
                  || getNextFallbackModel(currentModel)

                if (nextModel) {
                  console.log(
                    `[aiSdkAdapter] 🔄 Auto-fallback triggered: ${currentModel} → ${nextModel}`
                  )
                  showModelFallbackToast(currentModel, nextModel)
                  currentModel = nextModel
                  // Reset failed keys when switching model? 
                  // Maybe lighter model works with same keys? 
                  // Let's keep failed keys if it was quota error, but if it was 503, keys might be fine.
                  // If 503, keys are likely fine. 
                  if (isOverloadError(error) && !isQuotaError(error)) {
                      // It was purely overload, keys are innocent.
                      // But we shouldn't reset specificApiKey if we want to stick to one key? 
                      // No, if we switch model, we can retry with *current* key first.
                  } else {
                      // It was quota error and we ran out of keys. 
                      // Switching model *might* help if different models have different quotas (Gemini Flash vs Pro often do).
                      // So we should RESET failed keys to try all keys again on the new model.
                      failedKeys.clear()
                      // Pick a fresh key (or start from current)
                       const allKeys = [
                         settings.geminiApiKey,
                         ...(settings.geminiAdditionalApiKeys || [])
                        ].filter(k => k && k.trim() !== '')
                        if (allKeys.length > 0) currentApiKey = allKeys[0] // Reset to first available? Or just random?
                  }
                  
                  continue // Retry with next model
                } else {
                  console.log(
                    '[aiSdkAdapter] ❌ No more fallback models available, throwing error'
                  )
                }
          }
      }

      // No fallback available or not an overload error, throw
      throw error
    }
  }
}

/**
 * Compatibility wrapper for existing positional prompt streaming callers.
 * @returns {AsyncIterable<string>} Stream of generated content chunks
 */
export async function* generateContentStream(
  providerId,
  settings,
  systemInstruction,
  userPrompt,
  streamOptions = {}
) {
  yield* generateContentStreamRequest(
    createPromptGenerationRequest(
      providerId,
      settings,
      systemInstruction,
      userPrompt,
      streamOptions
    )
  )
}

function normalizeProviderStreamError(error) {
  if (error instanceof Error) return error

  const normalized = new Error(
    typeof error === 'string'
      ? error
      : error?.message || 'The provider stream failed without an error message.'
  )
  if (error !== undefined) normalized.cause = error
  return normalized
}

/**
 * Read text from either an AI SDK structured stream or a legacy proxy stream.
 * Structured streams are preferred because their error parts would otherwise
 * be filtered out by textStream.
 */
async function* readProviderStream(result) {
  if (result?.fullStream) {
    for await (const part of result.fullStream) {
      if (part?.type === 'error') {
        throw normalizeProviderStreamError(part.error)
      }

      if (part?.type === 'text-delta') {
        yield part.text
      }
    }
    return
  }

  // Compatibility for older/custom proxies that only expose textStream.
  if (result?.textStream) {
    for await (const chunk of result.textStream) {
      yield chunk
    }
    return
  }

  throw new Error('The provider did not return a readable text stream.')
}

/**
 * Stream content from a normalized prompt or messages request.
 * @param {import('../chat/contracts.js').GenerationRequest & object} request
 * @returns {AsyncIterable<string>} Stream of generated content chunks
 */
export async function* generateContentStreamRequest(request) {
  const normalizedRequest = normalizeGenerationRequest(request)
  const {
    providerId,
    settings,
    system: systemInstruction,
    prompt,
    messages,
    providerOptions,
    abortSignal,
    tools,
    useSmoothing,
    ...generationOptions
  } = normalizedRequest
  // Check if auto-fallback is enabled (Gemini Basic only)
  const autoFallbackEnabled = shouldEnableAutoFallback(providerId, settings)
  // Check if API key retry is enabled (Both Gemini Basic and Advanced)
  const apiKeyRetryEnabled = shouldEnableApiKeyRetry(providerId, settings)
  
  let currentModel = autoFallbackEnabled
    ? getCurrentGeminiModel(settings)
    : null
  let originalModel = currentModel // Track original model for fallback display
  let lastError = null
  let failedKeys = new Set() // Track failed keys for this request
  let currentApiKey = null // Track current key being used

  // Get browser compatibility info
  const browserCompatibility = getBrowserCompatibility()

  // Retry with fallback models if enabled
  while (true) {
    try {
      // Create settings with current model & key
      // If apiKeyRetryEnabled (Gemini Basic or Advanced), explicit key management is needed
      if (apiKeyRetryEnabled && !currentApiKey) {
           const allKeys = [
               settings.geminiApiKey,
               ...(settings.geminiAdditionalApiKeys || [])
             ]
           const validKeys = allKeys.filter(k => k && k.trim() !== '')
           
           if (validKeys.length > 0) {
               // Use the next sequential key
               currentApiKey = getGeminiApiKey(settings)
           }
      }

      const currentSettings = {
        ...settings,
        ...(autoFallbackEnabled ? { selectedGeminiModel: currentModel } : {}),
        ...(currentApiKey ? { specificApiKey: currentApiKey } : {})
      }

      // Determine model name for display and logging
      const modelName = autoFallbackEnabled
        ? currentModel
        : getDisplayModelName(providerId, settings)

      console.log(
        `[aiSdkAdapter] 📡 API Stream Call - Provider: ${providerId}, Model: ${modelName}`
      )

      // Update UI with current model status
      const isFallback = autoFallbackEnabled && currentModel !== originalModel
      updateModelStatus(
        modelName,
        isFallback ? originalModel : null,
        isFallback
      )

      const baseModel = getAISDKModel(providerId, currentSettings)

      // Handle specific model limitations
      // Gemma models do not support system instructions via the API
      // User request: Remove system instruction completely for these smaller models as they don't handle long prompts well
      const isGemmaModel = modelName.toLowerCase().includes('gemma')
      const effectiveSystemInstruction = isGemmaModel ? undefined : systemInstruction
      const input = messages ? { messages } : { prompt }

      // Check if this is a proxy model (doesn't need reasoning extraction wrapper)
      const isProxyModel = requiresApiProxy(providerId)
      // DISABLE REASONING EXTRACTION MIDDLEWARE FOR TESTING - KEEP FULL OUTPUT WITH <think> TAGS
      const model = baseModel // Use raw baseModel without wrapping to preserve <think> tags
      const generationConfig = mapGenerationConfig(currentSettings)

      if (isProxyModel) {
        // Use proxy model's streamText method directly
        const result = await model.streamText({
          instructions: effectiveSystemInstruction,
          ...input,
          ...generationConfig,
          ...generationOptions,
          ...(tools && { tools }),
          ...(providerOptions && { providerOptions }),
          ...(abortSignal && { abortSignal }),
        })

        // Prefer a structured proxy stream so error parts reach the UI. Older
        // custom proxies remain compatible through the textStream fallback.
        for await (const chunk of readProviderStream(result)) {
          yield chunk
        }
      } else {
        // Use standard AI SDK streaming with smoothing options - no middleware
        const defaultSmoothingOptions = {
          smoothing: {
            minDelayMs: 15,
            maxDelayMs: 80,
          },
        }

        const shouldUseSmoothing =
          browserCompatibility.streamingOptions.useSmoothing &&
          useSmoothing !== false

        const streamConfig = {
          model,
          instructions: effectiveSystemInstruction,
          ...input,
          ...generationConfig,
          maxRetries: 0, // Disable AI SDK built-in retry to allow custom fallback to work faster
          ...(shouldUseSmoothing ? defaultSmoothingOptions : {}),
          ...generationOptions,
          ...(tools && { tools }),
          ...(providerOptions && { providerOptions }),
          ...(abortSignal && { abortSignal }),
        }

        const result = await streamText(streamConfig)

        // Consume the structured stream so provider errors are not discarded.
        for await (const chunk of readProviderStream(result)) {
          yield chunk
        }

        // Yield usage and warnings metadata from AI SDK result (if available)
        try {
          const usage = normalizeUsage(await result.usage)
          const warnings = await result.warnings
          const reasoningWarnings = extractReasoningWarnings(warnings, modelName, generationOptions)
          const meta = {}
          if (usage) meta.usage = usage
          if (reasoningWarnings.length) meta.reasoningWarnings = reasoningWarnings
          if (Object.keys(meta).length) {
            yield { __streamMeta: true, ...meta }
          }
        } catch {
          // Usage/warnings may not be available for all providers
        }
      }

      // If we successfully streamed, log success and return
      console.log(`[aiSdkAdapter] ✅ Stream Success - Model: ${modelName}`)
      return
    } catch (error) {
      const failedModel = autoFallbackEnabled
        ? currentModel
        : getDisplayModelName(providerId, settings)
      console.error(
        `[aiSdkAdapter] ❌ Stream Failed - Model: ${failedModel}`,
        error
      )

      // Enhanced logging for debugging fallback flow
      console.log('[aiSdkAdapter] 🔍 Error details:', {
        name: error?.constructor?.name,
        message: error?.message,
        status: error?.status || error?.statusCode,
        cause: error?.cause,
        isOverloadError: isOverloadError(error),
        autoFallbackEnabled,
        currentModel,
        providerId,
      })

      lastError = error

      // Check if this is an abort error - if so, just return (don't throw)
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        console.log('[aiSdkAdapter] Stream aborted by user')
        return // Exit gracefully without throwing
      }

      // Check if this is a Firefox mobile specific error
      if (
        browserCompatibility.isFirefoxMobile &&
        error.message.includes('flush')
      ) {
        // Re-throw with additional context for fallback handling
        error.isFirefoxMobileStreamingError = true
      }

        // 1. Check for Quota Error (429) -> Try different KEY (for both Basic and Advanced)
      if (apiKeyRetryEnabled && isQuotaError(error)) {
         console.log(`[aiSdkAdapter] ⚠️ Stream Quota exceeded for key ending in ...${currentApiKey?.slice(-4)}`)
         failedKeys.add(currentApiKey)
         
         // Find a key that hasn't failed yet
         const allKeys = [
               settings.geminiApiKey,
               ...(settings.geminiAdditionalApiKeys || [])
             ]
         const validKeys = allKeys.filter(k => k && k.trim() !== '')
         const availableKeys = validKeys.filter(k => !failedKeys.has(k))
         
         if (availableKeys.length > 0) {
             // Pick next available key
             currentApiKey = availableKeys[0]
             console.log(`[aiSdkAdapter] 🔄 Stream switching to fresh API key ending in ...${currentApiKey.slice(-4)}`)
             continue // Retry loop with new key
         } else {
             console.log('[aiSdkAdapter] ❌ All API keys exhausted (Quota) for streaming')
             // If all keys exhausted for Advanced mode, throw error
             // For Basic mode, try model fallback as last resort
         }
      }

      // 2. Check for Overload Error (503), a retired model (404), OR (All keys failed quota) -> Try different MODEL
      if (autoFallbackEnabled) {
          if (isOverloadError(error) || isModelUnavailableError(error) || (isQuotaError(error) && failedKeys.size >= ([settings.geminiApiKey, ...(settings.geminiAdditionalApiKeys||[])].filter(k => k && k.trim() !== '').length || 1))) {
                const nextModel = getNextAdvancedFallbackModel(currentModel, settings)
                  || getNextFallbackModel(currentModel)
        
                if (nextModel) {
                  console.log(
                    `[aiSdkAdapter] 🔄 Auto-fallback triggered: ${currentModel} → ${nextModel}`
                  )
                  showModelFallbackToast(currentModel, nextModel)
                  currentModel = nextModel
                  
                  // Reset failed keys for new model (different model might have different quota buckets)
                  if (isQuotaError(error)) {
                      failedKeys.clear()
                      const allKeys = [
                         settings.geminiApiKey,
                         ...(settings.geminiAdditionalApiKeys || [])
                        ].filter(k => k && k.trim() !== '')
                        if (allKeys.length > 0) currentApiKey = allKeys[0]
                  }
                  
                  continue // Retry with next model
                } else {
                  console.log(
                    '[aiSdkAdapter] ❌ No more fallback models available (stream), throwing error'
                  )
                }
          }
      }

      // No fallback available or not an overload error, throw
      throw error
    }
  }
}

/**
 * Normalize AI SDK usage into a canonical shape. AI SDK v5 reports
 * `inputTokens`/`outputTokens`/`totalTokens`; v4 reported
 * `promptTokens`/`completionTokens`. We persist both key styles so downstream
 * consumers (and older stored records) stay compatible.
 * @param {object|null|undefined} usage
 */
function normalizeUsage(usage) {
  if (!usage || typeof usage !== 'object') return null
  const promptTokens = usage.promptTokens ?? usage.inputTokens ?? null
  const completionTokens = usage.completionTokens ?? usage.outputTokens ?? null
  const totalTokens =
    usage.totalTokens ??
    (promptTokens != null && completionTokens != null ? promptTokens + completionTokens : null)
  // Cross-provider cached-prompt count. The installed core (ai@7) exposes it as
  // `usage.inputTokenDetails.cacheReadTokens` — every provider that reports a
  // cache read (OpenAI, DeepSeek, OpenRouter, Anthropic, …) funnels through this
  // one field, so reading it here surfaces cache for all of them at once. The
  // remaining names are fallbacks for other/older SDK shapes.
  const cachedInputTokens =
    usage.inputTokenDetails?.cacheReadTokens ??
    usage.cachedInputTokens ??
    usage.cachedPromptTokens ??
    usage.cacheReadInputTokens ??
    null
  if (promptTokens == null && completionTokens == null && totalTokens == null) return null
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    inputTokens: promptTokens,
    outputTokens: completionTokens,
    cachedInputTokens,
  }
}

/**
 * Extract reasoning-related warnings from AI SDK's warnings array and
 * normalize them into user-friendly messages. Logs a concise dev warning
 * without exposing API keys or raw provider payloads.
 *
 * @param {Array<{type: string, message?: string, [key: string]: unknown}> | null | undefined} warnings
 * @param {string} modelName
 * @param {object} generationOptions - to read the requested reasoning level
 * @returns {string[]} user-facing warning messages
 */
function extractReasoningWarnings(warnings, modelName, generationOptions) {
  if (!Array.isArray(warnings) || !warnings.length) return []

  const reasoningWarnings = []
  const requestedLevel = generationOptions?.reasoning || null

  for (const warning of warnings) {
    if (!warning || typeof warning !== 'object') continue

    // AI SDK may emit various warning types; filter for reasoning-related ones.
    // Known patterns: 'unsupported-setting' with setting === 'reasoning',
    // or any warning whose message mentions reasoning/thinking coercion.
    const msg = warning.message || ''
    const isReasoningRelated =
      (warning.type === 'unsupported-setting' && warning.setting === 'reasoning') ||
      /reasoning|thinking/i.test(msg)

    if (isReasoningRelated) {
      // Build a user-friendly message
      const userMsg = msg || `Reasoning effort is not fully supported by ${modelName}.`
      reasoningWarnings.push(userMsg)

      // Log a concise dev warning (no API keys, no raw payloads)
      console.warn(
        `[aiSdkAdapter] ⚠️ Reasoning warning — model: ${modelName}, ` +
        `requested: ${requestedLevel || 'none'}, type: ${warning.type || 'unknown'}: ${userMsg}`
      )
    }
  }

  return reasoningWarnings
}

/**
 * Compatibility wrapper for existing positional enhanced streaming callers.
 * @returns {AsyncIterable<{chunk: string, fullText: string, isComplete: boolean}>}
 */
export async function* generateContentStreamEnhanced(
  providerId,
  settings,
  systemInstruction,
  userPrompt,
  streamOptions = {}
) {
  yield* generateContentStreamEnhancedRequest(
    createPromptGenerationRequest(
      providerId,
      settings,
      systemInstruction,
      userPrompt,
      streamOptions
    )
  )
}

/**
 * Enhanced streaming with full text accumulation for normalized requests.
 * @param {import('../chat/contracts.js').GenerationRequest & object} request
 * @returns {AsyncIterable<{chunk: string, fullText: string, isComplete: boolean}>}
 */
export async function* generateContentStreamEnhancedRequest(request) {
  const normalizedRequest = normalizeGenerationRequest(request)
  let fullText = ''
  let usage = null
  let reasoningWarnings = []

  // Get browser compatibility info
  const browserCompatibility = getBrowserCompatibility()

  try {
    const streamGenerator = generateContentStreamRequest(normalizedRequest)

    for await (const chunk of streamGenerator) {
      // Detect metadata marker from generateContentStreamRequest
      if (chunk && typeof chunk === 'object' && chunk.__streamMeta) {
        usage = chunk.usage || null
        if (chunk.reasoningWarnings?.length) {
          reasoningWarnings = chunk.reasoningWarnings
        }
        continue
      }
      fullText += chunk
      yield {
        chunk,
        fullText,
        isComplete: false,
      }
    }

    // Final yield with completion flag, usage data, and reasoning warnings.
    // reasoningWarnings is additive — existing callers that ignore it keep working.
    yield {
      chunk: '',
      fullText,
      isComplete: true,
      usage,
      ...(reasoningWarnings.length ? { reasoningWarnings } : {}),
    }
  } catch (error) {
    // Check if this is a Firefox mobile specific error
    if (
      browserCompatibility.isFirefoxMobile &&
      error.message.includes('flush')
    ) {
      error.isFirefoxMobileStreamingError = true
    }

    throw error
  }
}

/**
 * Helper to get the display name of the model based on provider and settings
 * @param {string} providerId
 * @param {object} settings
 * @returns {string}
 */
function getDisplayModelName(providerId, settings) {
  switch (providerId) {
    case 'gemini':
      return getCurrentGeminiModel(settings)
    case 'openai':
    case 'chatgpt':
      return settings.selectedChatgptModel || 'gpt-5.6-luna'
    case 'groq':
      return settings.selectedGroqModel || 'llama-3.3-70b-versatile'
    case 'openrouter':
      return settings.selectedOpenrouterModel || 'openrouter/free'
    case 'deepseek':
      return settings.selectedDeepseekModel || 'deepseek-v4-flash'
    case 'ollama':
      return settings.selectedOllamaModel || 'llama2'
    case 'openaiCompatible':
      return settings.selectedOpenAICompatibleModel || 'gpt-3.5-turbo'
    case 'lmstudio':
      return settings.selectedLmStudioModel || 'lmstudio-community/gemma-2b-it-GGUF'
    case 'cerebras':
      return settings.selectedCerebrasModel || 'gpt-oss-120b'
    case 'nvidia':
      return settings.selectedNvidiaModel || 'deepseek-ai/deepseek-v4-flash'
    default:
      return providerId
  }
}
