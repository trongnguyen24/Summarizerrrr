// @ts-nocheck
// @ts-nocheck
import { BaseProvider } from './baseProvider'

export class OllamaProvider extends BaseProvider {
  constructor(ollamaEndpoint, model) {
    super('ollama', model) // 'ollama' is the providerId, model is the model name
    this.ollamaEndpoint = ollamaEndpoint
  }

  /**
   * Generates content using the Ollama API.
   * @param {string} prompt The prompt to send to the model.
   * @returns {Promise<string>} The generated content.
   */
  async generateContent(prompt) {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model, // Use this.model from the constructor
          prompt: prompt,
          stream: false,
          think: false,
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

  /**
   * Handles specific error messages from the Ollama API.
   * @param {Error} error The error object.
   * @param {string} model The model name that was used.
   * @returns {string} A user-friendly error message.
   */
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

  /**
   * Parses the raw response from the Ollama API.
   * For Ollama, the rawResult is already the cleaned response string.
   * @param {string} rawResult The raw response string.
   * @returns {string} The parsed and cleaned response.
   */
  parseResponse(rawResult) {
    return rawResult
  }
}
