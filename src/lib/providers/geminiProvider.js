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
    let errorMessage = 'An error occurred while calling the Gemini API.'

    if (error.message.includes('400')) {
      if (error.message.includes('INVALID_ARGUMENT')) {
        errorMessage =
          'Gemini API: Bad Request. The request body is malformed (typo or missing field). Check API reference for format and supported versions.'
      } else if (error.message.includes('FAILED_PRECONDITION')) {
        errorMessage =
          'Gemini API: Free tier not available in your country or billing not enabled. Please enable billing on your project in Google AI Studio.'
      } else if (error.message.includes('API key not valid')) {
        errorMessage =
          'Gemini API: Invalid API key. Please check your API key in the settings.'
      } else {
        errorMessage =
          'Gemini API: Bad Request. An unknown 400 error occurred. Please check your request.'
      }
    } else if (error.message.includes('403')) {
      errorMessage =
        "Gemini API: Permission Denied. Your API key doesn't have required permissions or you are using a tuned model without proper authentication. Check API key access or authentication for tuned models."
    } else if (error.message.includes('404')) {
      errorMessage =
        "Gemini API: Not Found. The requested resource (e.g., image, audio, video) wasn't found. Check if all parameters are valid for your API version."
    } else if (error.message.includes('429')) {
      const modelConfig =
        geminiModelsConfig[model] || geminiModelsConfig['gemini-2.0-flash']
      if (model === 'gemini-2.5-pro-preview-05-06') {
        errorMessage =
          'Gemini API: Quota Exceeded. You have exceeded your Gemini Pro 2.5 API quota. Try switching to Gemini 2.5 Flash or Gemini 2.0 Flash, or try again in a few minutes.'
      } else {
        errorMessage =
          'Gemini API: Quota Exceeded. You have exceeded your Gemini API quota. Try switching to Gemini 2.5 Flash or Gemini 2.0 Flash, or try again in a few minutes.'
      }
    } else if (error.message.includes('500')) {
      errorMessage =
        "Gemini API: Internal Server Error. An unexpected error occurred on Google's side (e.g., input context too long). Reduce input context, switch models, or wait and retry."
    } else if (error.message.includes('503')) {
      errorMessage =
        'Gemini API: Service Unavailable. The service may be temporarily overloaded or down. Try switching models (e.g., to 2.5 Flash or 2.0 Flash) or wait and retry.'
    } else if (error.message.includes('504')) {
      errorMessage =
        "Gemini API: Deadline Exceeded. The service is unable to finish processing within the deadline (e.g., prompt too large). Set a larger 'timeout' in your client request."
    } else if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      errorMessage =
        'Network error. Please check your internet connection and try again.'
    } else if (error.message.includes('API key')) {
      throw error // Re-throw API key specific errors
    } else {
      errorMessage =
        'An unexpected error occurred while calling the Gemini API: ' +
        error.message
    }

    return errorMessage
  }
}
