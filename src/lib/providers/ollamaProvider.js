// @ts-nocheck
import { BaseProvider } from './baseProvider'

export class OllamaProvider extends BaseProvider {
  constructor(ollamaEndpoint, model) {
    super('ollama', model)
    this.ollamaEndpoint = ollamaEndpoint
  }

  async generateContent(prompt) {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText} - ${
            errorData.message || JSON.stringify(errorData)
          }`
        )
      }

      const data = await response.json()
      return data.response
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
}
