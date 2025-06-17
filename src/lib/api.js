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
      modelConfig =
        openrouterModelsConfig[model] ||
        openrouterModelsConfig['openrouter/auto']
      break
    case 'ollama':
      apiKey = userSettings.ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT // Ollama uses endpoint as 'key'
      model = userSettings.selectedOllamaModel || 'llama2' // Default Ollama model
      modelConfig = { generationConfig: { temperature: 0.6, topP: 0.91 } } // Ollama doesn't use these directly, but keep for consistency
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
  const selectedProviderId = userSettings.selectedProvider || 'gemini' // Default to gemini

  const { apiKey, model, modelConfig } = getProviderConfig(
    userSettings,
    selectedProviderId
  )

  console.log('DEBUG: selectedProviderId:', selectedProviderId)
  console.log('DEBUG: isAdvancedMode:', userSettings.isAdvancedMode)
  console.log(
    'DEBUG: geminiApiKey:',
    userSettings.geminiApiKey ? 'CONFIGURED' : 'NOT CONFIGURED'
  )
  console.log(
    'DEBUG: geminiAdvancedApiKey:',
    userSettings.geminiAdvancedApiKey ? 'CONFIGURED' : 'NOT CONFIGURED'
  )
  console.log(
    'DEBUG: openrouterApiKey:',
    userSettings.openrouterApiKey ? 'CONFIGURED' : 'NOT CONFIGURED'
  )
  console.log(
    'DEBUG: final apiKey value:',
    apiKey ? 'CONFIGURED' : 'NOT CONFIGURED'
  )

  const provider = getProvider(selectedProviderId, userSettings) // Pass full settings object

  const contentConfig = promptBuilders[contentType] || promptBuilders['general'] // Fallback to general

  if (!contentConfig.buildPrompt || !contentConfig.systemInstruction) {
    throw new Error(
      `Configuration for content type "${contentType}" is incomplete.`
    )
  }

  const prompt = contentConfig.buildPrompt(
    text,
    userSettings.summaryLang,
    userSettings.summaryLength,
    userSettings.summaryFormat
  )
  const systemInstruction = contentConfig.systemInstruction

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

    console.log('--- summarizeContent Debug Info ---')
    console.log('isAdvancedMode:', userSettings.isAdvancedMode)
    console.log('selectedProviderId:', selectedProviderId)
    console.log('model:', model)
    console.log(
      'finalGenerationConfig (temperature):',
      finalGenerationConfig.temperature
    )
    console.log('finalGenerationConfig (topP):', finalGenerationConfig.topP)
    console.log(
      'advancedModeSettings (temperature):',
      advancedModeSettings.temperature
    )
    console.log('advancedModeSettings (topP):', advancedModeSettings.topP)
    console.log(
      'basicModeSettings (temperature):',
      basicModeSettings.temperature
    )
    console.log('basicModeSettings (topP):', basicModeSettings.topP)
    console.log('---------------------------------')

    let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else if (selectedProviderId === 'ollama') {
      contentsForProvider = prompt // Ollama expects raw prompt string
    } else {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // Default for other providers
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
 * @param {string} timestampedTranscript - Video transcript with timestamps.
 * @returns {Promise<string>} - Promise that resolves with the chapter summary in Markdown format.
 */
export async function summarizeChapters(timestampedTranscript) {
  // Ensure settings are initialized
  await loadSettings()
  await loadAdvancedModeSettings()
  await loadBasicModeSettings()

  const userSettings = settings
  const selectedProviderId = userSettings.selectedProvider || 'gemini' // Default to gemini

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

  if (!chapterConfig.buildPrompt || !chapterConfig.systemInstruction) {
    throw new Error(`Configuration for chapter summary is incomplete.`)
  }

  const prompt = chapterConfig.buildPrompt(
    timestampedTranscript,
    userSettings.summaryLang,
    userSettings.summaryLength
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

    console.log('--- summarizeChapters Debug Info ---')
    console.log('isAdvancedMode:', userSettings.isAdvancedMode)
    console.log('selectedProviderId:', selectedProviderId)
    console.log('model:', model)
    console.log(
      'finalGenerationConfig (temperature):',
      finalGenerationConfig.temperature
    )
    console.log('finalGenerationConfig (topP):', finalGenerationConfig.topP)
    console.log(
      'advancedModeSettings (temperature):',
      advancedModeSettings.temperature
    )
    console.log('advancedModeSettings (topP):', advancedModeSettings.topP)
    console.log(
      'basicModeSettings (temperature):',
      basicModeSettings.temperature
    )
    console.log('basicModeSettings (topP):', basicModeSettings.topP)
    console.log('---------------------------------')

    let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else if (selectedProviderId === 'ollama') {
      contentsForProvider = prompt // Ollama expects raw prompt string
    } else {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // Default for other providers
    }

    const rawResult = await (selectedProviderId === 'ollama'
      ? provider.generateContent(contentsForProvider) // Ollama's generateContent expects only prompt
      : provider.generateContent(
          model, // Pass model for other providers
          contentsForProvider,
          chapterConfig.systemInstruction,
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
