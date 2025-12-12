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
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ai-sdk-ollama'
import { getBrowserCompatibility } from '@/lib/utils/browserDetection.js'
import { requiresApiProxy } from '@/lib/utils/contextDetection.js'
import { createOllamaProxyModel } from './ollamaProxyModel.js'
import {
  isOverloadError,
  isQuotaError,
  getNextFallbackModel,
  shouldEnableAutoFallback,
  getCurrentGeminiModel,
} from '@/lib/utils/geminiAutoFallback.js'
import { updateModelStatus } from '@/stores/summaryStore.svelte.js'

import { showModelFallbackToast } from '@/lib/utils/toastUtils.js'

// Global index for round-robin key rotation
let currentKeyIndex = 0

/**
 * Helper to get the next Gemini API key using sequential calculation
 * @param {object} settings - User settings
 * @returns {string} The selected API key
 */
function getGeminiApiKey(settings) {
  if (settings.isAdvancedMode) {
    return settings.geminiAdvancedApiKey
  }

  // Combine main key and additional keys
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
      let geminiApiKey
      if (settings.isAdvancedMode) {
        geminiApiKey = settings.geminiAdvancedApiKey
      } else {
        // Use sequential rotation for basic keys or specific key if provided
        geminiApiKey = settings.specificApiKey || getGeminiApiKey(settings)
      }
      const geminiModel = settings.isAdvancedMode
        ? settings.selectedGeminiAdvancedModel || 'gemini-2.0-flash'
        : settings.selectedGeminiModel || 'gemini-2.0-flash'

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
      return createOpenAI(settings.selectedChatgptModel || 'gpt-3.5-turbo', {
        apiKey: settings.chatgptApiKey,
        baseURL: settings.chatgptBaseUrl,
      })

    case 'groq':
      const groq = createOpenAICompatible({
        name: 'groq',
        apiKey: settings.groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })
      return groq(settings.selectedGroqModel || 'mixtral-8x7b-32768')

    case 'openrouter':
      const openrouter = createOpenAICompatible({
        name: 'openrouter',
        apiKey: settings.openrouterApiKey,
        baseURL: 'https://openrouter.ai/api/v1',
      })
      return openrouter(settings.selectedOpenrouterModel || 'openrouter/auto')

    case 'deepseek':
      const deepseek = createOpenAICompatible({
        name: 'deepseek',
        apiKey: settings.deepseekApiKey,
        baseURL: settings.deepseekBaseUrl || 'https://api.deepseek.com/v1',
      })
      return deepseek(settings.selectedDeepseekModel || 'deepseek-chat')

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

    default:
      throw new Error(`Unsupported provider: ${providerId}`)
  }
}

/**
 * Maps user settings to AI SDK generation configuration
 * @param {object} settings - User settings object
 * @param {object} advancedModeSettings - Advanced mode settings
 * @param {object} basicModeSettings - Basic mode settings
 * @returns {object} Generation configuration for AI SDK
 */
export function mapGenerationConfig(settings) {
  return {
    temperature: settings.temperature,
    topP: settings.topP,
    maxTokens: 4000, // Default max tokens
  }
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
 * Unified content generation function using AI SDK
 * WITH AUTO-FALLBACK for Gemini Basic when overloaded
 * @param {string} providerId - Provider identifier
 * @param {object} settings - User settings
 * @param {object} advancedModeSettings - Advanced mode settings
 * @param {object} basicModeSettings - Basic mode settings
 * @param {string} systemInstruction - System instruction/prompt
 * @param {string} userPrompt - User prompt
 * @returns {Promise<string>} Generated content
 */
export async function generateContent(
  providerId,
  settings,
  systemInstruction,
  userPrompt,
  options = {}
) {
  // Check if auto-fallback is enabled (Gemini Basic only)
  const autoFallbackEnabled = shouldEnableAutoFallback(providerId, settings)
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
      // If autoFallbackEnabled (Gemini Basic), explicit key management is needed
      if (autoFallbackEnabled && !currentApiKey) {
           const allKeys = [
             settings.geminiApiKey,
             ...(settings.geminiAdditionalApiKeys || [])
           ].filter(k => k && k.trim() !== '') || []
           
           if (allKeys.length > 0) {
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
      const effectiveUserPrompt = userPrompt

      // Check if this is a proxy model
      const isProxyModel = requiresApiProxy(providerId)
      // DISABLE REASONING EXTRACTION MIDDLEWARE FOR TESTING - KEEP FULL OUTPUT WITH <think> TAGS
      const model = baseModel // Use raw baseModel without wrapping to preserve <think> tags
      const generationConfig = mapGenerationConfig(currentSettings)

      if (isProxyModel) {
        // Use the proxy model's custom generateText method
        console.log('[aiSdkAdapter] Using proxy model for generateContent')
        const result = await model.generateText({
          system: effectiveSystemInstruction,
          prompt: effectiveUserPrompt,
          ...generationConfig,
          ...(options.abortSignal && { abortSignal: options.abortSignal }),
        })
        console.log('[DEBUG] Proxy raw result:', result.text) // Add debug log
        console.log(`[aiSdkAdapter] ✅ API Success - Model: ${modelName}`)
        return result.text
      } else {
        // Use the standard AI SDK generateText for direct calls - no middleware
        const { text } = await generateText({
          model,
          system: effectiveSystemInstruction,
          prompt: effectiveUserPrompt,
          maxRetries: 0, // Disable AI SDK built-in retry to allow custom fallback to work faster
          ...generationConfig,
          ...(options.abortSignal && { abortSignal: options.abortSignal }),
        })
        console.log(`[aiSdkAdapter] ✅ API Success - Model: ${modelName}`)
        return text
      }
    } catch (error) {
      const failedModel = autoFallbackEnabled
        ? currentModel
        : providerId === 'gemini'
        ? getCurrentGeminiModel(settings)
        : 'N/A'
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

        // Check if we should try fallback
      if (autoFallbackEnabled) {
          // 1. Check for Quota Error (429) -> Try different KEY
          if (isQuotaError(error)) {
             console.log(`[aiSdkAdapter] ⚠️ Quota exceeded for key ending in ...${currentApiKey?.slice(-4)}`)
             failedKeys.add(currentApiKey)
             
             // Find a key that hasn't failed yet
             const allKeys = [
                 settings.geminiApiKey,
                 ...(settings.geminiAdditionalApiKeys || [])
             ].filter(k => k && k.trim() !== '')
             
             const availableKeys = allKeys.filter(k => !failedKeys.has(k))
             
             if (availableKeys.length > 0) {
                 // Pick next available key
                 currentApiKey = availableKeys[0]
                 console.log(`[aiSdkAdapter] 🔄 Switching to fresh API key ending in ...${currentApiKey.slice(-4)}`)
                 continue // Retry loop with new key
             } else {
                 console.log('[aiSdkAdapter] ❌ All API keys exhausted (Quota)')
                 // If all keys exhausted, logic could potentially fall through to model fallback 
                 // BUT usually quota means quota. Let's see if IS_OVERLOAD is also true?
                 // If we want to switch model after ALL keys fail, we can proceed.
                 // For now, let's treat "All Keys Quota" as a potential reason to switch model (maybe lighter model has different quota tracking? unlikely for same account, but maybe).
                 // Actually, usually quota is per project/account.
                 // Let's try model fallback as last resort if quota fails on all keys.
             }
          }

          // 2. Check for Overload Error (503) OR (All keys failed quota) -> Try different MODEL
          if (isOverloadError(error) || (isQuotaError(error) && failedKeys.size >= ([settings.geminiApiKey, ...(settings.geminiAdditionalApiKeys||[])].filter(k => k && k.trim() !== '').length || 1))) {
               const nextModel = getNextFallbackModel(currentModel)

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
      } else {
        // Log why fallback was not triggered
        if (autoFallbackEnabled) {
          console.log(
            '[aiSdkAdapter] ℹ️ Fallback not triggered - error not detected as overload'
          )
        }
      }

      // No fallback available or not an overload error, throw
      throw error
    }
  }
}

/**
 * Unified streaming content generation function using AI SDK
 * WITH AUTO-FALLBACK for Gemini Basic when overloaded
 * @param {string} providerId - Provider identifier
 * @param {object} settings - User settings
 * @param {object} advancedModeSettings - Advanced mode settings
 * @param {object} basicModeSettings - Basic mode settings
 * @param {string} systemInstruction - System instruction/prompt
 * @param {string} userPrompt - User prompt
 * @param {object} [streamOptions] - Additional streaming options
 * @param {AbortSignal} [streamOptions.abortSignal] - Optional abort signal for cancellation
 * @returns {AsyncIterable<string>} Stream of generated content chunks
 */
export async function* generateContentStream(
  providerId,
  settings,
  systemInstruction,
  userPrompt,
  streamOptions = {}
) {
  // Check if auto-fallback is enabled (Gemini Basic only)
  const autoFallbackEnabled = shouldEnableAutoFallback(providerId, settings)
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
      // If autoFallbackEnabled (Gemini Basic), explicit key management is needed
      if (autoFallbackEnabled && !currentApiKey) {
           const allKeys = [
             settings.geminiApiKey,
             ...(settings.geminiAdditionalApiKeys || [])
           ].filter(k => k && k.trim() !== '') || []
           
           if (allKeys.length > 0) {
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
      const effectiveUserPrompt = userPrompt

      // Check if this is a proxy model (doesn't need reasoning extraction wrapper)
      const isProxyModel = requiresApiProxy(providerId)
      // DISABLE REASONING EXTRACTION MIDDLEWARE FOR TESTING - KEEP FULL OUTPUT WITH <think> TAGS
      const model = baseModel // Use raw baseModel without wrapping to preserve <think> tags
      const generationConfig = mapGenerationConfig(currentSettings)

      if (isProxyModel) {
        // Use proxy model's streamText method directly
        const result = await model.streamText({
          system: effectiveSystemInstruction,
          prompt: effectiveUserPrompt,
          ...generationConfig,
          ...(streamOptions.abortSignal && {
            abortSignal: streamOptions.abortSignal,
          }),
        })

        // Yield chunks from proxy stream - now with full <think> content
        for await (const chunk of result.textStream) {
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
          streamOptions.useSmoothing !== false

        const streamConfig = {
          model,
          system: effectiveSystemInstruction,
          prompt: effectiveUserPrompt,
          ...generationConfig,
          maxRetries: 0, // Disable AI SDK built-in retry to allow custom fallback to work faster
          ...(shouldUseSmoothing ? defaultSmoothingOptions : {}),
          ...streamOptions,
          ...(streamOptions.abortSignal && {
            abortSignal: streamOptions.abortSignal,
          }),
        }

        const result = await streamText(streamConfig)

        // Use smoothTextStream if available and supported by browser
        const streamToUse =
          shouldUseSmoothing && result.smoothTextStream
            ? result.smoothTextStream
            : result.textStream

        // Yield full chunks including <think> tags (no extraction)
        for await (const chunk of streamToUse) {
          yield chunk
        }
      }

      // If we successfully streamed, log success and return
      console.log(`[aiSdkAdapter] ✅ Stream Success - Model: ${modelName}`)
      return
    } catch (error) {
      const failedModel = autoFallbackEnabled
        ? currentModel
        : providerId === 'gemini'
        ? getCurrentGeminiModel(settings)
        : 'N/A'
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

        // Check if we should try fallback
      if (autoFallbackEnabled) {
          // 1. Check for Quota Error (429) -> Try different KEY
          if (isQuotaError(error)) {
             console.log(`[aiSdkAdapter] ⚠️ Stream Quota exceeded for key ending in ...${currentApiKey?.slice(-4)}`)
             failedKeys.add(currentApiKey)
             
             // Find a key that hasn't failed yet
             const allKeys = [
                 settings.geminiApiKey,
                 ...(settings.geminiAdditionalApiKeys || [])
             ].filter(k => k && k.trim() !== '')
             
             const availableKeys = allKeys.filter(k => !failedKeys.has(k))
             
             if (availableKeys.length > 0) {
                 // Pick next available key
                 currentApiKey = availableKeys[0]
                 console.log(`[aiSdkAdapter] 🔄 Stream switching to fresh API key ending in ...${currentApiKey.slice(-4)}`)
                 continue // Retry loop with new key
             }
          }

          // 2. Check for Overload Error (503) OR (All keys failed quota) -> Try different MODEL
          if (isOverloadError(error) || (isQuotaError(error) && failedKeys.size >= ([settings.geminiApiKey, ...(settings.geminiAdditionalApiKeys||[])].filter(k => k && k.trim() !== '').length || 1))) {
                const nextModel = getNextFallbackModel(currentModel)
        
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
      } else {
        // Log why fallback was not triggered
        if (autoFallbackEnabled) {
          console.log(
            '[aiSdkAdapter] ℹ️ Fallback not triggered - error not detected as overload'
          )
        }
      }

      // No fallback available or not an overload error, throw
      throw error
    }
  }
}

/**
 * Enhanced streaming with full text accumulation for hybrid approach
 * @param {string} providerId - Provider identifier
 * @param {object} settings - User settings
 * @param {object} advancedModeSettings - Advanced mode settings
 * @param {object} basicModeSettings - Basic mode settings
 * @param {string} systemInstruction - System instruction/prompt
 * @param {string} userPrompt - User prompt
 * @param {object} [streamOptions] - Additional streaming options
 * @returns {AsyncIterable<{chunk: string, fullText: string, isComplete: boolean}>} Enhanced stream with full text
 */
export async function* generateContentStreamEnhanced(
  providerId,
  settings,
  systemInstruction,
  userPrompt,
  streamOptions = {}
) {
  let fullText = ''
  let isComplete = false

  // Get browser compatibility info
  const browserCompatibility = getBrowserCompatibility()

  try {
    // Use our updated generateContentStream that handles both proxy and direct models
    const streamGenerator = generateContentStream(
      providerId,
      settings,
      systemInstruction,
      userPrompt,
      streamOptions
    )

    for await (const chunk of streamGenerator) {
      fullText += chunk
      yield {
        chunk,
        fullText,
        isComplete: false,
      }
    }

    // Final yield with completion flag
    yield {
      chunk: '',
      fullText,
      isComplete: true,
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
      return settings.selectedChatgptModel || 'gpt-3.5-turbo'
    case 'groq':
      return settings.selectedGroqModel || 'mixtral-8x7b-32768'
    case 'openrouter':
      return settings.selectedOpenrouterModel || 'openrouter/auto'
    case 'deepseek':
      return settings.selectedDeepseekModel || 'deepseek-chat'
    case 'ollama':
      return settings.selectedOllamaModel || 'llama2'
    case 'openaiCompatible':
      return settings.selectedOpenAICompatibleModel || 'gpt-3.5-turbo'
    case 'lmstudio':
      return settings.selectedLmStudioModel || 'lmstudio-community/gemma-2b-it-GGUF'
    default:
      return providerId
  }
}

