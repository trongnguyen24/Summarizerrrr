// @ts-nocheck
import { GoogleGenAI } from '@google/genai'
import { BaseProvider } from './baseProvider.js'
import { geminiModelsConfig } from '../geminiConfig.js' // Import geminiModelsConfig

export class GeminiProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey)
    this.genAI = new GoogleGenAI({ apiKey })
  }

  async generateContent(model, contents, systemInstruction, generationConfig) {
    const result = await this.genAI.models.generateContent({
      model: model,
      contents: contents,
      systemInstruction: systemInstruction,
      generationConfig: generationConfig,
    })
    console.log('Gemini API Result:', result)
    return result
  }

  parseResponse(rawResponse) {
    if (
      rawResponse &&
      rawResponse.candidates &&
      rawResponse.candidates.length > 0 &&
      rawResponse.candidates[0].content &&
      rawResponse.candidates[0].content.parts &&
      rawResponse.candidates[0].content.parts.length > 0
    ) {
      const text = rawResponse.candidates[0].content.parts[0].text
      if (text) {
        return text
      } else {
        throw new Error('Did not receive valid text content from the API.')
      }
    } else {
      throw new Error('Did not receive a valid summary result from the API.')
    }
  }

  handleError(error, model) {
    let errorMessage =
      'An error occurred while calling the Gemini API: ' + error.message

    if (error.message.includes('got status: 429')) {
      const modelConfig =
        geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash'] // Fallback to default

      if (model === 'gemini-2.5-pro-preview-05-06') {
        errorMessage =
          'You have exceeded your Gemini Pro 2.5 API quota. Please try switching to Gemini 2.5 Flash or Gemini 2.0 Flash for higher limits or try again in a few minutes.'
      } else {
        errorMessage =
          'You have exceeded your Gemini API quota. Please try switching to Gemini 2.5 Flash or Gemini 2.0 Flash for higher limits or try again in a few minutes.'
      }
    } else if (
      error.message.includes('got status: 400') &&
      error.message.includes('API key not valid')
    ) {
      errorMessage =
        'Invalid Gemini API key. Please check your API key in the settings.'
    } else if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      errorMessage =
        'Network error. Please check your internet connection and try again.'
    } else if (error.message.includes('API key')) {
      throw error // Re-throw API key specific errors
    }

    return errorMessage
  }
}
