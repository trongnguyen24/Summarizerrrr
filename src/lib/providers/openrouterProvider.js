// @ts-nocheck
import { BaseProvider } from './baseProvider.js'

export class OpenrouterProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey)
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
  }

  async generateContent(model, contents, systemInstruction, generationConfig) {
    const messages = []

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction })
    }

    // OpenRouter expects an array of message objects, where each object has a 'role' and 'content'.
    // The 'contents' parameter from our API is already in a format that can be easily mapped.
    // Assuming 'contents' is an array like [{ parts: [{ text: "..." }] }]
    contents.forEach((contentPart) => {
      if (contentPart.parts && contentPart.parts.length > 0) {
        messages.push({ role: 'user', content: contentPart.parts[0].text })
      }
    })

    const body = {
      model: model,
      messages: messages,
      temperature: generationConfig.temperature,
      top_p: generationConfig.topP,
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        `OpenRouter API error: ${response.status} - ${
          errorData.message || response.statusText
        }`
      )
    }

    const result = await response.json()
    console.log('OpenRouter API Result:', result)
    return result
  }

  parseResponse(rawResponse) {
    if (
      rawResponse &&
      rawResponse.choices &&
      rawResponse.choices.length > 0 &&
      rawResponse.choices[0].message &&
      rawResponse.choices[0].message.content
    ) {
      return rawResponse.choices[0].message.content
    } else {
      throw new Error('Did not receive a valid summary result from the API.')
    }
  }

  handleError(error, model) {
    let errorMessage = 'An error occurred while calling the OpenRouter API.'

    if (error.message.includes('400')) {
      errorMessage =
        'OpenRouter API: Bad Request. Invalid or missing parameters, or a CORS issue. Please check your request.'
    } else if (error.message.includes('401')) {
      errorMessage =
        'OpenRouter API: Invalid credentials. Your API key might be disabled or invalid. Please check your API key in the settings.'
    } else if (error.message.includes('402')) {
      errorMessage =
        'OpenRouter API: Insufficient credits. Your account or API key has insufficient credits. Please add more credits and retry the request.'
    } else if (error.message.includes('403')) {
      errorMessage =
        'OpenRouter API: Forbidden. Your chosen model requires moderation and your input was flagged.'
    } else if (error.message.includes('408')) {
      errorMessage =
        'OpenRouter API: Request Timeout. Your request timed out. Please try again.'
    } else if (error.message.includes('429')) {
      errorMessage =
        'OpenRouter API: Rate Limited. You are being rate limited. Please try again in a few minutes or check your OpenRouter account.'
    } else if (error.message.includes('502')) {
      errorMessage =
        'OpenRouter API: Bad Gateway. Your chosen model is down or we received an invalid response from it. Please try again in 30 seconds.'
    } else if (error.message.includes('503')) {
      errorMessage =
        'OpenRouter API: Service Unavailable. There is no available model provider that meets your routing requirements. Please try again later.'
    } else if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      errorMessage =
        'Network error. Please check your internet connection and try again.'
    } else {
      errorMessage =
        'An unexpected error occurred while calling the OpenRouter API: ' +
        error.message
    }

    return errorMessage
  }
}
