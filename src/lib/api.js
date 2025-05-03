// @svelte-compiler-ignore
import { buildPrompt, buildChapterPrompt } from './utils.js' // Import necessary static functions

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

  const prompt = buildPrompt(text, lang, length, format, isYouTube) // Use the updated buildPrompt function

  let model = 'gemini-1.5-flash' // Default model
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    const result = await chrome.storage.sync.get('selectedModel')
    if (result.selectedModel) {
      model = result.selectedModel
    }
  } else if (typeof localStorage !== 'undefined') {
    model = localStorage.getItem('selectedModel_dev') || 'gemini-1.5-flash'
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    apiKey
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 65536 }, // Adjusted temperature slightly
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) {
      console.error('Gemini API Error Response:', data)
      if (data.error && data.error.message) {
        throw new Error('Gemini API Error: ' + data.error.message)
      } else {
        throw new Error('Unknown error from Gemini API')
      }
    }
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text)
      throw new Error('Did not receive a valid summary result from the API.')
    return data.candidates[0].content.parts[0].text
  } catch (e) {
    console.error('Fetch error:', e)
    // Check if the error is a network error or CORS issue
    if (e instanceof TypeError && e.message.includes('NetworkError')) {
      throw new Error(
        'Network error calling Gemini API. Check connection and CORS settings.'
      )
    } else if (e.message.includes('API key')) {
      throw e // Re-throw API key specific errors
    } else {
      throw new Error('An error occurred while calling the Gemini API.')
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

  const prompt = buildChapterPrompt(timestampedTranscript, lang, length) // Use the updated buildChapterPrompt function

  let model = 'gemini-1.5-flash' // Default model
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    const result = await chrome.storage.sync.get('selectedModel')
    if (result.selectedModel) {
      model = result.selectedModel
    }
  } else if (typeof localStorage !== 'undefined') {
    model = localStorage.getItem('selectedModel_dev') || 'gemini-1.5-flash'
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=` +
    apiKey
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    // Adjust generationConfig if needed, e.g., for longer/more detailed chapters
    generationConfig: { temperature: 0.4, maxOutputTokens: 65536 },
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) {
      console.error('Gemini API Error Response (Chapters):', data)
      if (data.error && data.error.message) {
        throw new Error('Gemini API Error (Chapters): ' + data.error.message)
      } else {
        throw new Error('Unknown error from Gemini API (Chapters)')
      }
    }
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text)
      throw new Error(
        'Did not receive a valid chapter summary result from the API.'
      )
    return data.candidates[0].content.parts[0].text
  } catch (e) {
    console.error('Fetch error (Chapters):', e)
    if (e instanceof TypeError && e.message.includes('NetworkError')) {
      throw new Error(
        'Network error calling Gemini API for chapters. Check connection and CORS settings.'
      )
    } else if (e.message.includes('API key')) {
      throw e // Re-throw API key specific errors
    } else {
      throw new Error(
        'An error occurred while calling the Gemini API for chapters.'
      )
    }
  }
}
