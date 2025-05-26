// @svelte-compiler-ignore
// @ts-nocheck
import { GoogleGenAI } from '@google/genai'
import { geminiModelsConfig } from './geminiConfig.js'

/**
 * Helper function to get user settings from storage.
 * @returns {Promise<object>} - Promise that resolves with user settings.
 */
async function getUserSettings() {
  let userSettings = {}
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    userSettings = await chrome.storage.sync.get([
      'selectedModel',
      'temperature',
      'topP',
      'summaryLang',
      'summaryLength',
      'summaryFormat',
    ])
  } else if (typeof localStorage !== 'undefined') {
    userSettings.selectedModel = localStorage.getItem('selectedModel_dev')
    userSettings.temperature = parseFloat(
      localStorage.getItem('temperature_dev')
    )
    userSettings.topP = parseFloat(localStorage.getItem('topP_dev'))
    userSettings.summaryLang = localStorage.getItem('summaryLang_dev')
    userSettings.summaryLength = localStorage.getItem('summaryLength_dev')
    userSettings.summaryFormat = localStorage.getItem('summaryFormat_dev')
  }
  return userSettings
}

/**
 * Summarizes content using Google Gemini.
 * @param {string} text - Content to summarize (transcript, web page text, or selected text).
 * @param {string} apiKey - Google AI API Key.
 * @param {'youtube' | 'general' | 'selectedText'} contentType - The type of content being summarized.
 * @returns {Promise<string>} - Promise that resolves with the summary in Markdown format.
 */
export async function summarizeWithGemini(text, apiKey, contentType) {
  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Click the settings icon on the right to add your API key.'
    )
  }

  const userSettings = await getUserSettings()
  const model = userSettings.selectedModel || 'gemini-2.0-flash' // Default model

  const modelConfig =
    geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash'] // Fallback to default

  // Object lookup for prompt and system instruction based on contentType
  const contentConfig = {
    youtube: {
      buildPrompt: modelConfig.buildYouTubePrompt,
      systemInstruction: modelConfig.youTubeSystemInstruction,
    },
    selectedText: {
      buildPrompt: modelConfig.buildSelectedTextPrompt,
      systemInstruction: modelConfig.selectedTextSystemInstruction,
    },
    general: {
      buildPrompt: modelConfig.buildGeneralPrompt,
      systemInstruction: modelConfig.generalSystemInstruction,
    },
  }

  const config = contentConfig[contentType] || contentConfig['general'] // Fallback to general

  if (!config.buildPrompt || !config.systemInstruction) {
    throw new Error(
      `Configuration for content type "${contentType}" is incomplete for model "${model}".`
    )
  }

  const prompt = config.buildPrompt(
    text,
    userSettings.summaryLang,
    userSettings.summaryLength,
    userSettings.summaryFormat
  )
  const systemInstruction = config.systemInstruction

  const genAI = new GoogleGenAI({ apiKey })
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

    const result = await genAI.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: systemInstruction,
      generationConfig: finalGenerationConfig,
    })
    console.log('Gemini API Result (summarizeWithGemini):', result) // Log the result object

    if (
      result &&
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const text = result.candidates[0].content.parts[0].text
      if (text) {
        return text
      } else {
        throw new Error('Did not receive valid text content from the API.')
      }
    } else {
      throw new Error('Did not receive a valid summary result from the API.')
    }
  } catch (e) {
    console.error('Gemini API Error:', e)
    let errorMessage =
      'An error occurred while calling the Gemini API: ' + e.message

    // Check for 429 status code in the error message
    if (e.message.includes('got status: 429')) {
      const userSettings = await getUserSettings()
      const model = userSettings.selectedModel || 'gemini-2.0-flash'

      if (model === 'gemini-2.5-pro-preview-05-06') {
        errorMessage =
          'You have exceeded your Gemini Pro 2.5 API quota. Please try switching to Gemini 2.5 Flash or Gemini 2.0 Flash for higher limits or try again in a few minutes.'
      } else {
        errorMessage =
          'You have exceeded your Gemini API quota. Please try switching to Gemini 2.5 Flash or Gemini 2.0 Flash for higher limits or try again in a few minutes.'
      }
    } else if (
      e.message.includes('got status: 400') &&
      e.message.includes('API key not valid')
    ) {
      errorMessage =
        'Invalid Gemini API key. Please check your API key in the settings.'
    } else if (
      e.message.includes('got status: 400') &&
      e.message.includes('API key not valid')
    ) {
      errorMessage =
        'Invalid Gemini API key for chapters. Please check your API key in the settings.'
    } else if (
      e instanceof TypeError &&
      e.message.includes('Failed to fetch')
    ) {
      errorMessage =
        'Network error. Please check your internet connection and try again.'
    } else if (
      e instanceof TypeError &&
      e.message.includes('Failed to fetch')
    ) {
      errorMessage =
        'Network error for chapters. Please check your internet connection and try again.'
    } else if (e.message.includes('API key')) {
      throw e // Re-throw API key specific errors
    }

    throw new Error(errorMessage)
  }
}

/**
 * Summarizes YouTube video content by chapter using Google Gemini.
 * @param {string} timestampedTranscript - Video transcript with timestamps.
 * @param {string} apiKey - Google AI API Key.
 * @param {string} lang - Desired language for the chapter summary.
 * @param {string} length - Desired length for the chapter summary ('short', 'medium', 'long').
 * @returns {Promise<string>} - Promise that resolves with the chapter summary in Markdown format.
 */
export async function summarizeChaptersWithGemini(
  timestampedTranscript,
  apiKey,
  lang,
  length
) {
  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Click the settings icon on the right to add your API key.'
    )
  }

  const userSettings = await getUserSettings()
  const model = userSettings.selectedModel || 'gemini-2.0-flash' // Default model

  const modelConfig =
    geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash'] // Fallback to default
  const prompt = modelConfig.buildChapterPrompt(
    timestampedTranscript,
    lang,
    length
  )

  const genAI = new GoogleGenAI({ apiKey })
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

    const result = await genAI.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: modelConfig.chapterSystemInstruction,
      generationConfig: finalGenerationConfig,
    })
    console.log('Gemini API Result (summarizeChaptersWithGemini):', result) // Log the result object

    if (
      result &&
      result.candidates &&
      result.candidates.length > 0 &&
      result.candidates[0].content &&
      result.candidates[0].content.parts &&
      result.candidates[0].content.parts.length > 0
    ) {
      const text = result.candidates[0].content.parts[0].text
      if (text) {
        return text
      } else {
        throw new Error(
          'Did not receive valid text content from the API for chapters.'
        )
      }
    } else {
      throw new Error(
        'Did not receive a valid chapter summary result from the API.'
      )
    }
  } catch (e) {
    console.error('Gemini API Error (Chapters):', e)
    let errorMessage =
      'An error occurred while calling the Gemini API for chapters: ' +
      e.message

    // Check for 429 status code in the error message
    if (e.message.includes('got status: 429')) {
      const userSettings = await getUserSettings()
      const model = userSettings.selectedModel || 'gemini-2.0-flash'

      if (model === 'gemini-2.5-pro-preview-05-06') {
        errorMessage =
          'You have exceeded your Gemini Pro 2.5 API quota. Please try switching to Gemini 2.5 Flash or Gemini 2.0 Flash for higher limits or try again in a few minutes.'
      } else {
        errorMessage =
          'You have exceeded your Gemini API quota. Please try switching to Gemini 2.5 Flash or Gemini 2.0 Flash for higher limits or try again in a few minutes.'
      }
    } else if (e.message.includes('API key')) {
      throw e // Re-throw API key specific errors
    }

    throw new Error(errorMessage)
  }
}
