// @ts-nocheck
import { BaseProvider } from './baseProvider'

export class OllamaProvider extends BaseProvider {
  constructor(ollamaEndpoint, model) {
    super('ollama', model)
    this.ollamaEndpoint = ollamaEndpoint
  }

  async generateContent(model, prompt) {
    // Thêm 'model' vào tham số
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model, // Sử dụng 'model' được truyền vào
          prompt: prompt,
          stream: false,
        }),
      })

      if (!response.ok) {
        let errorDetails = `Ollama API error: ${response.status} ${response.statusText}`
        const contentType = response.headers.get('content-type')

        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json()
            errorDetails += ` - ${
              errorData.message || JSON.stringify(errorData)
            }`
          } catch (jsonError) {
            errorDetails += ` - Failed to parse error JSON: ${jsonError.message}`
          }
        } else {
          const errorText = await response.text()
          errorDetails += ` - Response: ${errorText.substring(0, 200)}` // Limit to first 200 chars
        }
        throw new Error(errorDetails)
      }

      const responseText = await response.text()
      let data

      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        throw new Error(
          `Failed to parse JSON response from Ollama API: ${jsonError.message}. Response text: ${responseText}`
        )
      }

      // Remove <think> tags and their content
      const cleanedResponse = data.response
        .replace(/<think>[\s\S]*?<\/think>\n*/g, '')
        .trim()
      return cleanedResponse
    } catch (error) {
      console.error('Error generating content with Ollama:', error)
      throw error
    }
  }

  handleError(error, model) {
    // Implement specific error handling for Ollama API errors
    if (error.message.includes('Failed to fetch')) {
      return `Could not connect to Ollama server at ${this.ollamaEndpoint}. Please ensure Ollama is running and the endpoint is correct.`
    } else if (error.message.includes('403')) {
      return `Ollama API returned a 403 Forbidden error. Please check your Ollama server configuration and permissions.`
    } else if (error.message.includes('404')) {
      return `Ollama API returned a 404 Not Found error. Please check your Ollama Endpoint and Model name.`
    } else if (error.message.includes('Unexpected end of JSON input')) {
      return `Ollama API returned an invalid response. This might indicate a server issue or an incorrect model name.`
    } else if (error.message.includes('model not found')) {
      return `Ollama model "${model}" not found. Please ensure the model is downloaded and available on your Ollama server.`
    }
    return `An unexpected Ollama API error occurred: ${error.message}.`
  }

  parseResponse(rawResult) {
    // For Ollama, rawResult is already the cleaned response string
    return rawResult
  }
}
