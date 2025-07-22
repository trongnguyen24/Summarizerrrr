// @ts-nocheck
import { geminiModelsConfig } from './geminiConfig.js'
import { openrouterModelsConfig } from './openrouterConfig.js'
import { settings, loadSettings } from '../stores/settingsStore.svelte.js'
import {
  advancedModeSettings,
  loadAdvancedModeSettings,
} from '../stores/advancedModeSettingsStore.svelte.js'
import {
  basicModeSettings,
  loadBasicModeSettings,
} from '../stores/basicModeSettingsStore.svelte.js'
import { getProvider, providersConfig } from './providersConfig.js'
import { promptBuilders } from './promptBuilders.js'
import { systemInstructions } from './systemInstructions.js'
import { DEFAULT_OLLAMA_ENDPOINT } from './ollamaConfig.js'

/**
 * Helper function to get provider-specific configuration (API key, model, model config).
 * @param {object} userSettings - The current settings object.
 * @param {string} selectedProviderId - The ID of the selected provider.
 * @returns {{apiKey: string, model: string, modelConfig: object}} - Object containing provider config.
 * @throws {Error} If API key is not configured.
 */
function getProviderConfig(userSettings, selectedProviderId) {
  let apiKey
  let model
  let modelConfig

  switch (selectedProviderId) {
    case 'gemini':
      apiKey = userSettings.isAdvancedMode
        ? userSettings.geminiAdvancedApiKey
        : userSettings.geminiApiKey
      model = userSettings.isAdvancedMode
        ? userSettings.selectedGeminiAdvancedModel || 'gemini-2.0-flash'
        : userSettings.selectedGeminiModel || 'gemini-2.0-flash'
      modelConfig =
        geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash']
      break
    case 'openrouter':
      apiKey = userSettings.openrouterApiKey
      model = userSettings.selectedOpenrouterModel || 'openrouter/auto'
      modelConfig = { generationConfig: { temperature: 0.6, topP: 0.91 } } // Default values, will be overridden
      break
    case 'ollama':
      apiKey = userSettings.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT // Ollama uses endpoint as 'key'
      model = userSettings.selectedOllamaModel || 'llama2' // Default Ollama model
      modelConfig = { generationConfig: { temperature: 0.6, topP: 0.91 } } // Ollama doesn't use these directly, but keep for consistency
      break
    case 'openaiCompatible':
      apiKey = userSettings.openaiCompatibleApiKey
      model = userSettings.selectedOpenAICompatibleModel || 'gpt-3.5-turbo'
      modelConfig = { generationConfig: { temperature: 0.6, topP: 0.91 } }
      break
    default:
      // Fallback for other providers or if model config is not found
      apiKey = userSettings[`${selectedProviderId}ApiKey`]
      model = userSettings.selectedModel || 'gemini-2.0-flash' // Keep a generic selectedModel for other cases
      modelConfig = { generationConfig: { temperature: 0.6, topP: 0.91 } }
  }

  if (!apiKey) {
    throw new Error(
      `${providersConfig[selectedProviderId].name} API key is not configured. Click the settings icon on the right to add your API key.`
    )
  }

  return { apiKey, model, modelConfig }
}

/**
 * Checks if the selected provider supports streaming.
 * @param {string} selectedProviderId - The ID of the selected provider.
 * @returns {boolean} - True if provider supports streaming, false otherwise.
 */
export function providerSupportsStreaming(selectedProviderId) {
  try {
    const userSettings = settings
    const provider = getProvider(selectedProviderId, userSettings)
    return typeof provider.generateContentStream === 'function'
  } catch (error) {
    console.warn(
      `[api.js] Error checking streaming support for provider ${selectedProviderId}:`,
      error
    )
    return false
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
  await loadAdvancedModeSettings()
  await loadBasicModeSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  const { apiKey, model, modelConfig } = getProviderConfig(
    userSettings,
    selectedProviderId
  )

  const provider = getProvider(selectedProviderId, userSettings) // Pass full settings object

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
    // Apply user settings to generationConfig, overriding defaults
    const finalGenerationConfig = {
      ...modelConfig.generationConfig,
      temperature: userSettings.isAdvancedMode
        ? advancedModeSettings.temperature
        : basicModeSettings.temperature,
      topP: userSettings.isAdvancedMode
        ? advancedModeSettings.topP
        : basicModeSettings.topP,
    }

        let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else if (selectedProviderId === 'ollama') {
      contentsForProvider = userPrompt // Ollama expects raw prompt string
    } else if (selectedProviderId === 'openaiCompatible') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }]
    } else {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // Default for other providers
    }

    const rawResult = await (selectedProviderId === 'ollama'
      ? provider.generateContent(contentsForProvider) // Ollama's generateContent expects only prompt
      : provider.generateContent(
          model, // Pass model for other providers
          contentsForProvider,
          systemInstruction,
          finalGenerationConfig
        ))
    return provider.parseResponse(rawResult)
  } catch (e) {
    console.error(`${providersConfig[selectedProviderId].name} API Error:`, e)
    throw new Error(provider.handleError(e, model))
  }
}

export async function* summarizeContentStream(text, contentType) {
  // Ensure settings are initialized
  await loadSettings()
  await loadAdvancedModeSettings()
  await loadBasicModeSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  const { apiKey, model, modelConfig } = getProviderConfig(
    userSettings,
    selectedProviderId
  )

  const provider = getProvider(selectedProviderId, userSettings) // Pass full settings object

  // Check if the provider supports streaming
  if (typeof provider.generateContentStream !== 'function') {
    throw new Error(
      `The selected provider "${providersConfig[selectedProviderId].name}" does not support streaming.`
    )
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
    // Apply user settings to generationConfig, overriding defaults
    const finalGenerationConfig = {
      ...modelConfig.generationConfig,
      temperature: userSettings.isAdvancedMode
        ? advancedModeSettings.temperature
        : basicModeSettings.temperature,
      topP: userSettings.isAdvancedMode
        ? advancedModeSettings.topP
        : basicModeSettings.topP,
    }

        let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else if (selectedProviderId === 'ollama') {
      contentsForProvider = userPrompt // Ollama expects raw prompt string
    } else if (selectedProviderId === 'openaiCompatible') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }]
    } else {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // Default for other providers
    }

    const stream = provider.generateContentStream(
      model,
      contentsForProvider,
      systemInstruction,
      finalGenerationConfig
    )

    for await (const chunk of stream) {
      yield chunk
    }
  } catch (e) {
    console.error(
      `${providersConfig[selectedProviderId].name} API Stream Error:`,
      e
    )
    throw new Error(provider.handleError(e, model))
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
  await loadAdvancedModeSettings()
  await loadBasicModeSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  const { apiKey, model, modelConfig } = getProviderConfig(
    userSettings,
    selectedProviderId
  )

  const provider = getProvider(selectedProviderId, userSettings) // Pass full settings object

  const contentConfig = promptBuilders['promptEnhance']

  if (!contentConfig.buildPrompt) {
    throw new Error(
      `Configuration for content type "promptEnhance" is incomplete.`
    )
  }

  const { systemInstruction, userPrompt: enhancedPrompt } =
    contentConfig.buildPrompt(userPrompt, userSettings.summaryLang)

  try {
    // Apply user settings to generationConfig, overriding defaults
    const finalGenerationConfig = {
      ...modelConfig.generationConfig,
      temperature: userSettings.isAdvancedMode
        ? advancedModeSettings.temperature
        : basicModeSettings.temperature,
      topP: userSettings.isAdvancedMode
        ? advancedModeSettings.topP
        : basicModeSettings.topP,
    }

    let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: enhancedPrompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: enhancedPrompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else if (selectedProviderId === 'ollama') {
      contentsForProvider = enhancedPrompt // Ollama expects raw prompt string
    } else {
      contentsForProvider = [{ parts: [{ text: enhancedPrompt }] }] // Default for other providers
    }

    const rawResult = await (selectedProviderId === 'ollama'
      ? provider.generateContent(contentsForProvider) // Ollama's generateContent expects only prompt
      : provider.generateContent(
          model, // Pass model for other providers
          contentsForProvider,
          systemInstruction,
          finalGenerationConfig
        ))
    return provider.parseResponse(rawResult)
  } catch (e) {
    console.error(`${providersConfig[selectedProviderId].name} API Error:`, e)
    throw new Error(provider.handleError(e, model))
  }
}

/**
 * Summarizes YouTube video content by chapter using the selected AI provider.
 * Summarizes YouTube video content by chapter using the selected AI provider.
 * @param {string} timestampedTranscript - Video transcript with timestamps.
 * @returns {Promise<string>} - Promise that resolves with the chapter summary in Markdown format.
 */
export async function summarizeChapters(timestampedTranscript) {
  // Ensure settings are initialized
  await loadSettings()
  await loadAdvancedModeSettings()
  await loadBasicModeSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  const { apiKey, model, modelConfig } = getProviderConfig(
    userSettings,
    selectedProviderId
  )

  if (!apiKey) {
    throw new Error(
      `${providersConfig[selectedProviderId].name} API key is not configured. Click the settings icon on the right to add your API key.`
    )
  }

  const provider = getProvider(selectedProviderId, userSettings) // Pass full settings object

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
    const finalGenerationConfig = {
      ...modelConfig.generationConfig,
      temperature: userSettings.isAdvancedMode
        ? advancedModeSettings.temperature
        : basicModeSettings.temperature,
      topP: userSettings.isAdvancedMode
        ? advancedModeSettings.topP
        : basicModeSettings.topP,
    }

        let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else if (selectedProviderId === 'ollama') {
      contentsForProvider = userPrompt // Ollama expects raw prompt string
    } else if (selectedProviderId === 'openaiCompatible') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }]
    } else {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // Default for other providers
    }

    const rawResult = await (selectedProviderId === 'ollama'
      ? provider.generateContent(contentsForProvider) // Ollama's generateContent expects only prompt
      : provider.generateContent(
          model, // Pass model for other providers
          contentsForProvider,
          systemInstruction, // Use the systemInstruction from the buildPrompt result
          finalGenerationConfig
        ))
    return provider.parseResponse(rawResult)
  } catch (e) {
    console.error(
      `${providersConfig[selectedProviderId].name} API Error (Chapters):`,
      e
    )
    throw new Error(provider.handleError(e, model))
  }
}

export async function* summarizeChaptersStream(timestampedTranscript) {
  // Ensure settings are initialized
  await loadSettings()
  await loadAdvancedModeSettings()
  await loadBasicModeSettings()

  const userSettings = settings
  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  const { apiKey, model, modelConfig } = getProviderConfig(
    userSettings,
    selectedProviderId
  )

  if (!apiKey) {
    throw new Error(
      `${providersConfig[selectedProviderId].name} API key is not configured. Click the settings icon on the right to add your API key.`
    )
  }

  const provider = getProvider(selectedProviderId, userSettings) // Pass full settings object

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
    const finalGenerationConfig = {
      ...modelConfig.generationConfig,
      temperature: userSettings.isAdvancedMode
        ? advancedModeSettings.temperature
        : basicModeSettings.temperature,
      topP: userSettings.isAdvancedMode
        ? advancedModeSettings.topP
        : basicModeSettings.topP,
    }

        let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else if (selectedProviderId === 'ollama') {
      contentsForProvider = userPrompt // Ollama expects raw prompt string
    } else if (selectedProviderId === 'openaiCompatible') {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }]
    } else {
      contentsForProvider = [{ parts: [{ text: userPrompt }] }] // Default for other providers
    }

    const stream = provider.generateContentStream(
      model,
      contentsForProvider,
      systemInstruction,
      finalGenerationConfig
    )

    for await (const chunk of stream) {
      yield chunk
    }
  } catch (e) {
    console.error(
      `${providersConfig[selectedProviderId].name} API Stream Error (Chapters):`,
      e
    )
    throw new Error(provider.handleError(e, model))
  }
}
