// @ts-nocheck
import { generateText, streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createOllama } from 'ollama-ai-provider'

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
      return openai(settings.selectedChatgptModel || 'gpt-3.5-turbo', {
        apiKey: settings.chatgptApiKey,
        baseURL: settings.chatgptBaseUrl,
      })

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
      const ollamaProvider = createOllama({
        baseURL: settings.ollamaEndpoint || 'http://localhost:11434/api',
      })
      return ollamaProvider(settings.selectedOllamaModel || 'llama2')

    case 'openaiCompatible':
      const openaiCompatible = createOpenAICompatible({
        name: 'openai-compatible',
        apiKey: settings.openaiCompatibleApiKey,
        baseURL: settings.openaiCompatibleBaseUrl,
      })
      return openaiCompatible(
        settings.selectedOpenAICompatibleModel || 'gpt-3.5-turbo'
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
export function mapGenerationConfig(
  settings,
  advancedModeSettings,
  basicModeSettings
) {
  return {
    temperature: settings.isAdvancedMode
      ? advancedModeSettings.temperature
      : basicModeSettings.temperature,
    topP: settings.isAdvancedMode
      ? advancedModeSettings.topP
      : basicModeSettings.topP,
    maxTokens: 4000, // Default max tokens
  }
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
  advancedModeSettings,
  basicModeSettings,
  systemInstruction,
  userPrompt
) {
  const model = getAISDKModel(providerId, settings)
  const generationConfig = mapGenerationConfig(
    settings,
    advancedModeSettings,
    basicModeSettings
  )

  try {
    const { text } = await generateText({
      model,
      system: systemInstruction,
      prompt: userPrompt,
      ...generationConfig,
    })

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
 * @returns {AsyncIterable<string>} Stream of generated content chunks
 */
export async function* generateContentStream(
  providerId,
  settings,
  advancedModeSettings,
  basicModeSettings,
  systemInstruction,
  userPrompt
) {
  const model = getAISDKModel(providerId, settings)
  const generationConfig = mapGenerationConfig(
    settings,
    advancedModeSettings,
    basicModeSettings
  )

  try {
    const { textStream } = await streamText({
      model,
      system: systemInstruction,
      prompt: userPrompt,
      ...generationConfig,
    })

    for await (const chunk of textStream) {
      yield chunk
    }
  } catch (error) {
    console.error('AI SDK Stream Error:', error)
    throw error
  }
}
