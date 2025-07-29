// @ts-nocheck
// @ts-nocheck
import { BaseProvider } from './baseProvider'
import { ErrorHandler } from '@/lib/error/errorHandler.js'

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
    console.log('Ollama generateContent:', { prompt })
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
        // Create a new error object to pass more context
        const error = new Error(`Ollama API error`)
        error.status = response.status
        try {
          const errorData = await response.json()
          error.message += ` - ${
            errorData.message || JSON.stringify(errorData)
          }`
        } catch (e) {
          error.message += ` - ${response.statusText}`
        }
        throw error
      }

      const data = await response.json()

      // Remove <think> tags and their content
      const cleanedResponse = data.response
        .replace(/<think>[\s\S]*?<\/think>\n*/g, '')
        .trim()
      return cleanedResponse
    } catch (error) {
      throw ErrorHandler.handle(error, {
        provider: 'Ollama',
        model: this.model,
        operation: 'generateContent',
      })
    }
  }

  async *generateContentStream(prompt) {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: true, // Ensure streaming is enabled
        }),
      })

      if (!response.ok) {
        const error = new Error(`Ollama API error`)
        error.status = response.status
        throw error
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        buffer += decoder.decode(value, { stream: true })

        // Process buffer line by line
        let eolIndex
        while ((eolIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, eolIndex).trim()
          buffer = buffer.slice(eolIndex + 1)

          if (line) {
            try {
              const parsed = JSON.parse(line)
              if (parsed.response) {
                yield parsed.response
              }
              if (parsed.done) {
                return
              }
            } catch (e) {
              // This is a stream parsing error, we can throw a specific error
              const streamError = new Error(
                'Failed to parse Ollama stream chunk'
              )
              streamError.cause = e
              throw streamError
            }
          }
        }
      }
    } catch (error) {
      throw ErrorHandler.handle(error, {
        provider: 'Ollama',
        model: this.model,
        operation: 'generateContentStream',
      })
    }
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
