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

/**
 * Maps provider ID and settings to AI SDK model instance
 * @param {string} providerId - The provider identifier
 * @param {object} settings - User settings object
 * @returns {object} AI SDK model instance
 */
export function getAISDKModel(providerId, settings) {
  switch (providerId) {
    case 'gemini':
      const geminiApiKey = settings.isAdvancedMode
        ? settings.geminiAdvancedApiKey
        : settings.geminiApiKey
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
        console.log(
          '[aiSdkAdapter] Google model created successfully with provider'
        )
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
  userPrompt
) {
  const baseModel = getAISDKModel(providerId, settings)
  const model = wrapModelWithReasoningExtraction(baseModel)
  const generationConfig = mapGenerationConfig(settings)

  try {
    const { text, reasoning } = await generateText({
      model,
      system: systemInstruction,
      prompt: userPrompt,
      ...generationConfig,
    })

    // Only return text content, reasoning (<think> tags) is automatically discarded
    return text
  } catch (error) {
    console.error('AI SDK Error:', error)
    throw error
  }
}

/**
 * Unified streaming content generation function using AI SDK
 * @param {string} providerId - Provider identifier
 * @param {object} settings - User settings
 * @param {object} advancedModeSettings - Advanced mode settings
 * @param {object} basicModeSettings - Basic mode settings
 * @param {string} systemInstruction - System instruction/prompt
 * @param {string} userPrompt - User prompt
 * @param {object} [streamOptions] - Additional streaming options
 * @returns {AsyncIterable<string>} Stream of generated content chunks
 */
export async function* generateContentStream(
  providerId,
  settings,
  systemInstruction,
  userPrompt,
  streamOptions = {}
) {
  const baseModel = getAISDKModel(providerId, settings)
  const model = wrapModelWithReasoningExtraction(baseModel)
  const generationConfig = mapGenerationConfig(settings)

  // Get browser compatibility info
  const browserCompatibility = getBrowserCompatibility()

  // Default smoothing options
  const defaultSmoothingOptions = {
    smoothing: {
      minDelayMs: 15,
      maxDelayMs: 80,
    },
  }

  // Determine if we should use smoothing based on browser compatibility
  const shouldUseSmoothing =
    browserCompatibility.streamingOptions.useSmoothing &&
    streamOptions.useSmoothing !== false

  const streamConfig = {
    model,
    system: systemInstruction,
    prompt: userPrompt,
    ...generationConfig,
    ...(shouldUseSmoothing ? defaultSmoothingOptions : {}),
    ...streamOptions,
  }

  try {
    const result = await streamText(streamConfig)

    // Use smoothTextStream if available and supported by browser
    const streamToUse =
      shouldUseSmoothing && result.smoothTextStream
        ? result.smoothTextStream
        : result.textStream

    // Only yield text chunks, reasoning (<think> tags) is automatically extracted and discarded
    for await (const chunk of streamToUse) {
      yield chunk
    }
  } catch (error) {
    console.error('AI SDK Stream Error:', error)

    // Check if this is a Firefox mobile specific error
    if (
      browserCompatibility.isFirefoxMobile &&
      error.message.includes('flush')
    ) {
      console.warn(
        'Firefox mobile streaming error detected, suggesting fallback to non-streaming'
      )
      // Re-throw with additional context for fallback handling
      error.isFirefoxMobileStreamingError = true
    }

    throw error
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
    // Use our updated generateContentStream that already handles reasoning extraction
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
    console.error('AI SDK Enhanced Stream Error:', error)

    // Check if this is a Firefox mobile specific error
    if (
      browserCompatibility.isFirefoxMobile &&
      error.message.includes('flush')
    ) {
      console.log('Firefox mobile streaming error detected in enhanced stream')
      error.isFirefoxMobileStreamingError = true
    }

    throw error
  }
}
