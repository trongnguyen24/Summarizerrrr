// @svelte-compiler-ignore
// @ts-nocheck
// @svelte-compiler-ignore
// @ts-nocheck
import { geminiModelsConfig } from './geminiConfig.js'
import { openrouterModelsConfig } from './openrouterConfig.js' // Import openrouterModelsConfig
import { settings, getIsInitialized } from '../stores/settingsStore.svelte.js'
import { getProvider, providersConfig } from './providersConfig.js'
import { promptBuilders } from './promptBuilders.js'

/**
 * Summarizes content using the selected AI provider.
 * @param {string} text - Content to summarize (transcript, web page text, or selected text).
 * @param {'youtube' | 'general' | 'selectedText'} contentType - The type of content being summarized.
 * @returns {Promise<string>} - Promise that resolves with the summary in Markdown format.
 */
export async function summarizeContent(text, contentType) {
  // Wait for settings to be initialized
  if (!getIsInitialized()) {
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (getIsInitialized()) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100) // Check every 100ms
    })
    console.log('[api] Cài đặt đã sẵn sàng trong summarizeContent.')
  }

  const userSettings = settings
  const selectedProviderId = userSettings.selectedProvider || 'gemini' // Default to gemini
  let apiKey
  if (selectedProviderId === 'gemini') {
    if (userSettings.isAdvancedMode) {
      apiKey = userSettings.geminiAdvancedApiKey
    } else {
      apiKey = userSettings.geminiApiKey
    }
  } else {
    apiKey = userSettings[`${selectedProviderId}ApiKey`]
  }

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

  if (!apiKey) {
    throw new Error(
      `${providersConfig[selectedProviderId].name} API key is not configured. Click the settings icon on the right to add your API key.`
    )
  }

  const provider = getProvider(selectedProviderId, apiKey)

  let model
  let modelConfig

  if (selectedProviderId === 'gemini') {
    if (userSettings.isAdvancedMode) {
      model = userSettings.selectedGeminiAdvancedModel || 'gemini-2.0-flash'
    } else {
      model = userSettings.selectedGeminiModel || 'gemini-2.0-flash'
    }
    modelConfig =
      geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash']
  } else if (selectedProviderId === 'openrouter') {
    model = userSettings.selectedOpenrouterModel || 'openrouter/auto'
    modelConfig =
      openrouterModelsConfig[model] || openrouterModelsConfig['openrouter/auto']
  } else {
    // Fallback for other providers or if model config is not found
    model = userSettings.selectedModel || 'gemini-2.0-flash' // Keep a generic selectedModel for other cases
    modelConfig = { generationConfig: { temperature: 0.6, topP: 0.91 } }
  }

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
      temperature:
        userSettings.temperature !== undefined
          ? userSettings.temperature
          : modelConfig.generationConfig.temperature,
      topP:
        userSettings.topP !== undefined
          ? userSettings.topP
          : modelConfig.generationConfig.topP,
    }

    let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // Default for other providers
    }

    const rawResult = await provider.generateContent(
      model,
      contentsForProvider,
      systemInstruction,
      finalGenerationConfig
    )
    return provider.parseResponse(rawResult)
  } catch (e) {
    console.error(`${providersConfig[selectedProviderId].name} API Error:`, e)
    throw new Error(provider.handleError(e, model))
  }
}

/**
 * Summarizes YouTube video content by chapter using the selected AI provider.
 * @param {string} timestampedTranscript - Video transcript with timestamps.
 * @param {string} lang - Desired language for the chapter summary.
 * @param {string} length - Desired length for the chapter summary ('short', 'medium', 'long').
 * @returns {Promise<string>} - Promise that resolves with the chapter summary in Markdown format.
 */
export async function summarizeChapters(timestampedTranscript) {
  if (!getIsInitialized()) {
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (getIsInitialized()) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100) // Check every 100ms
    })
    console.log('[api] Cài đặt đã sẵn sàng trong summarizeChapters.')
  }

  const userSettings = settings
  const selectedProviderId = userSettings.selectedProvider || 'gemini' // Default to gemini
  let apiKey
  if (selectedProviderId === 'gemini') {
    if (userSettings.isAdvancedMode) {
      apiKey = userSettings.geminiAdvancedApiKey
    } else {
      apiKey = userSettings.geminiApiKey
    }
  } else {
    apiKey = userSettings[`${selectedProviderId}ApiKey`]
  }

  if (!apiKey) {
    throw new Error(
      `${providersConfig[selectedProviderId].name} API key is not configured. Click the settings icon on the right to add your API key.`
    )
  }

  const provider = getProvider(selectedProviderId, apiKey)

  let model
  let modelConfig

  if (selectedProviderId === 'gemini') {
    if (userSettings.isAdvancedMode) {
      model = userSettings.selectedGeminiAdvancedModel || 'gemini-2.0-flash'
    } else {
      model = userSettings.selectedGeminiModel || 'gemini-2.0-flash'
    }
    modelConfig =
      geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash']
  } else if (selectedProviderId === 'openrouter') {
    model = userSettings.selectedOpenrouterModel || 'openrouter/auto'
    modelConfig =
      openrouterModelsConfig[model] || openrouterModelsConfig['openrouter/auto']
  } else {
    // Fallback for other providers or if model config is not found
    model = userSettings.selectedModel || 'gemini-2.0-flash' // Keep a generic selectedModel for other cases
    modelConfig = { generationConfig: { temperature: 0.6, topP: 0.91 } }
  }

  const chapterConfig = promptBuilders['chapter']

  if (!chapterConfig.buildPrompt || !chapterConfig.systemInstruction) {
    throw new Error(`Configuration for chapter summary is incomplete.`)
  }

  const prompt = chapterConfig.buildPrompt(
    timestampedTranscript,
    userSettings.summaryLang, // Lấy từ userSettings
    userSettings.summaryLength // Lấy từ userSettings
  )

  try {
    const finalGenerationConfig = {
      ...modelConfig.generationConfig,
      temperature:
        userSettings.temperature !== undefined
          ? userSettings.temperature
          : modelConfig.generationConfig.temperature,
      topP:
        userSettings.topP !== undefined
          ? userSettings.topP
          : modelConfig.generationConfig.topP,
    }

    let contentsForProvider
    if (selectedProviderId === 'gemini') {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // Gemini specific content format
    } else if (selectedProviderId === 'openrouter') {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // OpenRouter expects messages array, but our provider handles this mapping
    } else {
      contentsForProvider = [{ parts: [{ text: prompt }] }] // Default for other providers
    }

    const rawResult = await provider.generateContent(
      model,
      contentsForProvider,
      chapterConfig.systemInstruction,
      finalGenerationConfig
    )
    return provider.parseResponse(rawResult)
  } catch (e) {
    console.error(
      `${providersConfig[selectedProviderId].name} API Error (Chapters):`,
      e
    )
    throw new Error(provider.handleError(e, model))
  }
}
