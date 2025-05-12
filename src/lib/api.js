// @svelte-compiler-ignore
// @ts-nocheck
import { GoogleGenAI } from '@google/genai'
import { geminiModelsConfig } from './geminiConfig.js'

/**
 * Summarizes content using Google Gemini.
 * @param {string} text - Content to summarize (transcript or web page text).
 * @param {string} apiKey - Google AI API Key.
 * @param {boolean} isYouTube - True if the content is from YouTube.
 * @param {string} lang - Desired language for the summary.
 * @param {string} length - Desired length for the summary ('short', 'medium', 'long').
 * @param {string} format - Desired format for the summary ('heading', 'paragraph').
 * @returns {Promise<string>} - Promise that resolves with the summary in Markdown format.
 */
export async function summarizeWithGemini(
  text,
  apiKey,
  isYouTube,
  lang,
  length,
  format
) {
  if (!apiKey) {
    throw new Error(
      'Gemini API key is not configured. Click the settings icon on the right to add your API key.'
    )
  }

  let model = 'gemini-2.0-flash' // Default model
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    const result = await chrome.storage.sync.get('selectedModel')
    if (result.selectedModel) {
      model = result.selectedModel
    }
  } else if (typeof localStorage !== 'undefined') {
    model = localStorage.getItem('selectedModel_dev') || 'gemini-2.0-flash'
  }

  const modelConfig =
    geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash'] // Fallback to default

  let prompt
  if (isYouTube) {
    prompt = modelConfig.buildYouTubePrompt(text, lang, length, format)
  } else {
    prompt = modelConfig.buildGeneralPrompt(text, lang, length, format)
  }

  const genAI = new GoogleGenAI({ apiKey })
  try {
    const result = await genAI.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: isYouTube
        ? modelConfig.youTubeSystemInstruction
        : modelConfig.generalSystemInstruction,
      generationConfig: modelConfig.generationConfig,
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
    if (e.message.includes('API key')) {
      throw e // Re-throw API key specific errors
    } else {
      throw new Error(
        'An error occurred while calling the Gemini API: ' + e.message
      )
    }
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

  let model = 'gemini-2.0-flash' // Default model
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    const result = await chrome.storage.sync.get('selectedModel')
    if (result.selectedModel) {
      model = result.selectedModel
    }
  } else if (typeof localStorage !== 'undefined') {
    model = localStorage.getItem('selectedModel_dev') || 'gemini-2.0-flash'
  }

  const modelConfig =
    geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash'] // Fallback to default
  const prompt = modelConfig.buildChapterPrompt(
    timestampedTranscript,
    lang,
    length
  )

  const genAI = new GoogleGenAI({ apiKey })
  try {
    const result = await genAI.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: modelConfig.chapterSystemInstruction,
      generationConfig: modelConfig.generationConfig,
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
    if (e.message.includes('API key')) {
      throw e // Re-throw API key specific errors
    } else {
      throw new Error(
        'An error occurred while calling the Gemini API for chapters: ' +
          e.message
      )
    }
  }
}
