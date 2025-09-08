// @ts-nocheck
import { settings, loadSettings } from '@/stores/settingsStore.svelte.js'
import { promptBuilders } from '@/lib/prompting/promptBuilders.js'
import {
  generateContent as aiSdkGenerateContent,
  generateContentStream as aiSdkGenerateContentStream,
  generateContentStreamEnhanced as aiSdkGenerateContentStreamEnhanced,
} from './aiSdkAdapter.js'
import { getBrowserCompatibility } from '@/lib/utils/browserDetection.js'

/**
 * Checks if the selected provider supports streaming.
 * AI SDK 5 supports streaming for all providers.
 * @param {string} selectedProviderId - The ID of the selected provider.
 * @returns {boolean} - True if provider supports streaming, false otherwise.
 */
export function providerSupportsStreaming(selectedProviderId) {
  // AI SDK 5 supports streaming for all providers
  const supportedProviders = [
    'gemini',
    'openrouter',
    'ollama',
    'openaiCompatible',
    'chatgpt',
    'deepseek',
  ]

  // Check if provider is supported
  const isProviderSupported = supportedProviders.includes(selectedProviderId)

  // Check browser compatibility
  const browserCompatibility = getBrowserCompatibility()

  // Return true only if both provider and browser support streaming
  return isProviderSupported && browserCompatibility.supportsAdvancedStreaming
}

/**
 * Validates API key for the selected provider
 * @param {object} userSettings - The current settings object
 * @param {string} selectedProviderId - The ID of the selected provider
 * @throws {Error} If API key is not configured
 */
function validateApiKey(userSettings, selectedProviderId) {
  let apiKey
  let providerName

  switch (selectedProviderId) {
    case 'gemini':
      apiKey = userSettings.isAdvancedMode
        ? userSettings.geminiAdvancedApiKey
        : userSettings.geminiApiKey
      providerName = 'Google Gemini'
      break
    case 'openrouter':
      apiKey = userSettings.openrouterApiKey
      providerName = 'OpenRouter'
      break
    case 'ollama':
      // Ollama doesn't require API key, but needs endpoint
      return // Skip validation for Ollama
    case 'openaiCompatible':
      apiKey = userSettings.openaiCompatibleApiKey
      providerName = 'OpenAI Compatible'
      break
    case 'chatgpt':
      apiKey = userSettings.chatgptApiKey
      providerName = 'ChatGPT'
      break
    case 'deepseek':
      apiKey = userSettings.deepseekApiKey
      providerName = 'DeepSeek'
      break
    default:
      apiKey = userSettings[`${selectedProviderId}ApiKey`]
      providerName = selectedProviderId
  }

  if (!apiKey) {
    throw new Error(
      `${providerName} API key is not configured. Click the settings icon on the right to add your API key.`
    )
  }
}

/**
 * Summarizes content using the selected AI provider.
 * @param {string} text - Content to summarize (transcript, web page text, or selected text).
 * @param {'youtube' | 'general' | 'selectedText'} contentType - The type of content being summarized.
 * @returns {Promise<string>} - Promise that resolves with the summary in Markdown format.
 */
export async function summarizeContent(text, contentType) {
  // Ensure settings are initialized
  await loadSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  // Validate API key
  validateApiKey(userSettings, selectedProviderId)

  const contentConfig = promptBuilders[contentType] || promptBuilders['general'] // Fallback to general

  if (!contentConfig.buildPrompt) {
    throw new Error(
      `Configuration for content type "${contentType}" is incomplete.`
    )
  }

  const { systemInstruction, userPrompt } = contentConfig.buildPrompt(
    text,
    userSettings.summaryLang,
    userSettings.summaryLength,
    userSettings.summaryFormat,
    userSettings.summaryTone
  )

  try {
    // Use AI SDK adapter for unified content generation
    return await aiSdkGenerateContent(
      selectedProviderId,
      userSettings,
      systemInstruction,
      userPrompt
    )
  } catch (e) {
    console.error(`AI SDK Error for ${selectedProviderId}:`, e)
    throw e
  }
}

export async function* summarizeContentStream(text, contentType) {
  // Ensure settings are initialized
  await loadSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  // Validate API key
  validateApiKey(userSettings, selectedProviderId)

  // Check browser compatibility for streaming
  const browserCompatibility = getBrowserCompatibility()

  // If browser doesn't support advanced streaming, throw an error to trigger fallback
  if (!browserCompatibility.supportsAdvancedStreaming) {
    throw new Error('Browser does not support advanced streaming features')
  }

  const contentConfig = promptBuilders[contentType] || promptBuilders['general'] // Fallback to general

  if (!contentConfig.buildPrompt) {
    throw new Error(
      `Configuration for content type "${contentType}" is incomplete.`
    )
  }

  const { systemInstruction, userPrompt } = contentConfig.buildPrompt(
    text,
    userSettings.summaryLang,
    userSettings.summaryLength,
    userSettings.summaryFormat,
    userSettings.summaryTone
  )

  try {
    // Use AI SDK adapter for unified streaming với smoothing
    const streamGenerator = aiSdkGenerateContentStream(
      selectedProviderId,
      userSettings,
      systemInstruction,
      userPrompt,
      { useSmoothing: browserCompatibility.streamingOptions.useSmoothing }
    )

    for await (const chunk of streamGenerator) {
      yield chunk
    }
  } catch (e) {
    console.error(`AI SDK Stream Error for ${selectedProviderId}:`, e)

    // Add Firefox mobile specific error handling
    if (browserCompatibility.isFirefoxMobile && e.message.includes('flush')) {
      e.isFirefoxMobileStreamingError = true
    }

    throw e
  }
}

/**
 * Enhances a system prompt and user prompt using the selected AI provider.
 * @param {string} userPrompt - The user prompt to enhance.
 * @returns {Promise<string>} - Promise that resolves with the enhanced prompts.
 */
export async function enhancePrompt(userPrompt) {
  // Ensure settings are initialized
  await loadSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  // Validate API key
  validateApiKey(userSettings, selectedProviderId)

  const contentConfig = promptBuilders['promptEnhance']

  if (!contentConfig.buildPrompt) {
    throw new Error(
      `Configuration for content type "promptEnhance" is incomplete.`
    )
  }

  const { systemInstruction, userPrompt: enhancedPrompt } =
    contentConfig.buildPrompt(userPrompt, userSettings.summaryLang)

  try {
    // Use AI SDK adapter for unified content generation
    return await aiSdkGenerateContent(
      selectedProviderId,
      userSettings,
      systemInstruction,
      enhancedPrompt
    )
  } catch (e) {
    console.error(`AI SDK Error for ${selectedProviderId}:`, e)
    throw e
  }
}

/**
 * Summarizes YouTube video content by chapter using the selected AI provider.
 * @param {string} timestampedTranscript - Video transcript with timestamps.
 * @returns {Promise<string>} - Promise that resolves with the chapter summary in Markdown format.
 */
export async function summarizeChapters(timestampedTranscript) {
  // Ensure settings are initialized
  await loadSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  // Validate API key
  validateApiKey(userSettings, selectedProviderId)

  const chapterConfig = promptBuilders['chapter']

  if (!chapterConfig.buildPrompt) {
    throw new Error(`Configuration for chapter summary is incomplete.`)
  }

  const { systemInstruction, userPrompt } = chapterConfig.buildPrompt(
    timestampedTranscript,
    userSettings.summaryLang,
    userSettings.summaryLength,
    userSettings.summaryTone
  )

  try {
    // Use AI SDK adapter for unified content generation
    return await aiSdkGenerateContent(
      selectedProviderId,
      userSettings,
      systemInstruction,
      userPrompt
    )
  } catch (e) {
    console.error(`AI SDK Error for ${selectedProviderId} (Chapters):`, e)
    throw e
  }
}

export async function* summarizeChaptersStream(timestampedTranscript) {
  // Ensure settings are initialized
  await loadSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  // Validate API key
  validateApiKey(userSettings, selectedProviderId)

  // Check browser compatibility for streaming
  const browserCompatibility = getBrowserCompatibility()

  // If browser doesn't support advanced streaming, throw an error to trigger fallback
  if (!browserCompatibility.supportsAdvancedStreaming) {
    throw new Error('Browser does not support advanced streaming features')
  }

  const chapterConfig = promptBuilders['chapter']

  if (!chapterConfig.buildPrompt) {
    throw new Error(`Configuration for chapter summary is incomplete.`)
  }

  const { systemInstruction, userPrompt } = chapterConfig.buildPrompt(
    timestampedTranscript,
    userSettings.summaryLang,
    userSettings.summaryLength,
    userSettings.summaryTone
  )

  try {
    // Use AI SDK adapter for unified streaming với smoothing
    const streamGenerator = aiSdkGenerateContentStream(
      selectedProviderId,
      userSettings,
      systemInstruction,
      userPrompt,
      { useSmoothing: browserCompatibility.streamingOptions.useSmoothing }
    )

    for await (const chunk of streamGenerator) {
      yield chunk
    }
  } catch (e) {
    console.error(
      `AI SDK Stream Error for ${selectedProviderId} (Chapters):`,
      e
    )

    // Add Firefox mobile specific error handling
    if (browserCompatibility.isFirefoxMobile && e.message.includes('flush')) {
      e.isFirefoxMobileStreamingError = true
    }

    throw e
  }
}

/**
 * Enhanced streaming for content with full text accumulation
 * Useful cho hybrid approach với StreamingMarkdownV2
 */
export async function* summarizeContentStreamEnhanced(text, contentType) {
  // Ensure settings are initialized
  await loadSettings()

  const userSettings = settings
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini'
  }

  validateApiKey(userSettings, selectedProviderId)

  // Check browser compatibility for streaming
  const browserCompatibility = getBrowserCompatibility()

  // If browser doesn't support advanced streaming, throw an error to trigger fallback
  if (!browserCompatibility.supportsAdvancedStreaming) {
    throw new Error('Browser does not support advanced streaming features')
  }

  const contentConfig = promptBuilders[contentType] || promptBuilders['general']

  if (!contentConfig.buildPrompt) {
    throw new Error(
      `Configuration for content type "${contentType}" is incomplete.`
    )
  }

  const { systemInstruction, userPrompt } = contentConfig.buildPrompt(
    text,
    userSettings.summaryLang,
    userSettings.summaryLength,
    userSettings.summaryFormat,
    userSettings.summaryTone
  )

  try {
    const streamGenerator = aiSdkGenerateContentStreamEnhanced(
      selectedProviderId,
      userSettings,
      systemInstruction,
      userPrompt,
      { useSmoothing: browserCompatibility.streamingOptions.useSmoothing }
    )

    for await (const streamData of streamGenerator) {
      yield streamData
    }
  } catch (e) {
    console.error(`AI SDK Enhanced Stream Error for ${selectedProviderId}:`, e)

    // Add Firefox mobile specific error handling
    if (browserCompatibility.isFirefoxMobile && e.message.includes('flush')) {
      e.isFirefoxMobileStreamingError = true
    }

    throw e
  }
}
