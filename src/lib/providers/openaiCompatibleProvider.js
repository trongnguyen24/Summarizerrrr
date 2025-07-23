// @ts-nocheck
import { BaseProvider } from './baseProvider.js'
import OpenAI from 'openai'

export class OpenAICompatibleProvider extends BaseProvider {
  constructor(apiKey, baseUrl) {
    super()
    this.apiKey = apiKey
    this.baseUrl = baseUrl || 'https://api.openai.com/v1'
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
      dangerouslyAllowBrowser: true, // Required for client-side usage
    })
  }

  async generateContent(model, contents, systemInstruction, generationConfig) {
    const messages = []

    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction })
    }

    contents.forEach((contentPart) => {
      if (contentPart.parts && contentPart.parts.length > 0) {
        messages.push({ role: 'user', content: contentPart.parts[0].text })
      }
    })

    try {
      console.log('--- OpenAICompatibleProvider Request Payload ---')
      console.log('Model:', model)
      console.log('Messages:', messages)
      console.log('Temperature:', generationConfig.temperature)
      console.log('Top P:', generationConfig.topP)
      console.log('-------------------------------------------')

      const response = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: generationConfig.temperature,
        top_p: generationConfig.topP,
        stream: false,
      })
      return response
    } catch (error) {
      throw this.handleError(error, model)
    }
  }

  async *generateContentStream(
    model,
    contents,
    systemInstruction,
    generationConfig
  ) {
    const messages = []
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction })
    }
    contents.forEach((contentPart) => {
      if (contentPart.parts && contentPart.parts.length > 0) {
        messages.push({ role: 'user', content: contentPart.parts[0].text })
      }
    })

    try {
      console.log('--- OpenAICompatibleProvider Stream Request Payload ---')
      console.log('Model:', model)
      console.log('Messages:', messages)
      console.log('Temperature:', generationConfig.temperature)
      console.log('Top P:', generationConfig.topP)
      console.log('---------------------------------------------------')

      const stream = await this.openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: generationConfig.temperature,
        top_p: generationConfig.topP,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          yield content
        }
      }
    } catch (error) {
      throw this.handleError(error, model)
    }
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
    let errorMessage =
      error.message ||
      'An error occurred while calling the OpenAI Compatible API.'

    // Check if the error is an OpenAI APIError
    if (error instanceof OpenAI.APIError) {
      // console.error('OpenAI API Error:', error.status, error.message, error.code, error.type);
      switch (error.status) {
        case 400:
          errorMessage = `OpenAI Compatible API: Bad Request (${error.code}). Invalid or missing parameters, or a CORS issue. Please check your request.`
          break
        case 401:
          errorMessage = `OpenAI Compatible API: Invalid credentials (${error.code}). Your API key might be disabled or invalid. Please check your API key in the settings.`
          break
        case 402:
          errorMessage = `OpenAI Compatible API: Insufficient credits (${error.code}). Your account or API key has insufficient credits. Please add more credits and retry the request.`
          break
        case 403:
          errorMessage = `OpenAI Compatible API: Forbidden (${error.code}). Your chosen model requires moderation and your input was flagged.`
          break
        case 404:
          errorMessage = `OpenAI Compatible API: Not Found (${error.code}). The model '${model}' was not found or is not accessible with your API key.`
          break
        case 408:
          errorMessage = `OpenAI Compatible API: Request Timeout (${error.code}). Your request timed out. Please try again.`
          break
        case 429:
          errorMessage = `OpenAI Compatible API: Rate Limited (${error.code}). You are being rate limited. Please try again in a few minutes or check your account.`
          break
        case 500:
          errorMessage = `OpenAI Compatible API: Server Error (${error.code}). An unexpected error occurred on the API server. Please try again later.`
          break
        case 502:
          errorMessage = `OpenAI Compatible API: Bad Gateway (${error.code}). Your chosen model is down or we received an invalid response from it. Please try again in 30 seconds.`
          break
        case 503:
          errorMessage = `OpenAI Compatible API: Service Unavailable (${error.code}). There is no available model provider that meets your routing requirements. Please try again later.`
          break
        default:
          errorMessage = `OpenAI Compatible API: An unexpected API error occurred (Status: ${error.status}, Code: ${error.code}). ${error.message}`
          break
      }
    } else if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      errorMessage =
        'Network error. Please check your internet connection and try again.'
    } else {
      // Ensure error.message is not undefined
      errorMessage =
        error.message ||
        'An unexpected error occurred while calling the OpenAI Compatible API.'
    }

    return errorMessage
  }
}
