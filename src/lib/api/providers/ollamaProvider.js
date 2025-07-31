// @ts-nocheck
// @ts-nocheck
import { BaseProvider } from './baseProvider'
import { ErrorHandler } from '@/lib/error/errorHandler.js'

export class OllamaProvider extends BaseProvider {
  constructor(ollamaEndpoint, model) {
    super('ollama', model) // 'ollama' is the providerId, model is the model name
    this.ollamaEndpoint = ollamaEndpoint
    // console.log('OllamaProvider: Initialized with', {
    //   ollamaEndpoint: this.ollamaEndpoint,
    //   model: this.model,
    // })
  }

  /**
   * Generates content using the Ollama API.
   * @param {string} prompt The prompt to send to the model.
   * @returns {Promise<string>} The generated content.
   */
  async generateContent(prompt) {
    // console.log('Ollama generateContent: Requesting with', {
    //   prompt,
    //   endpoint: `${this.ollamaEndpoint}/api/generate`,
    //   model: this.model,
    // })
    try {
      const requestBody = {
        model: this.model,
        prompt: prompt,
        stream: false,
        think: false,
      }
      // console.log('Ollama generateContent: Request body', requestBody)
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      // console.log('Ollama generateContent: Response status', response.status)
      if (!response.ok) {
        // Create a new error object to pass more context
        const error = new Error(`Ollama API error`)
        error.status = response.status
        try {
          const errorData = await response.json()
          error.message += ` - ${
            errorData.message || JSON.stringify(errorData)
          }`
          // console.error(
          //   'Ollama generateContent: Error response data',
          //   errorData
          // )
        } catch (e) {
          error.message += ` - ${response.statusText}`
          // console.error('Ollama generateContent: Error parsing response', e)
        }
        throw error
      }

      const data = await response.json()
      // console.log('Ollama generateContent: API response data', data)

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
    // console.log('Ollama generateContentStream: Requesting with', {
    //   prompt,
    //   endpoint: `${this.ollamaEndpoint}/api/generate`,
    //   model: this.model,
    // })
    try {
      const requestBody = {
        model: this.model,
        prompt: prompt,
        stream: true, // Ensure streaming is enabled
      }
      // console.log('Ollama generateContentStream: Request body', requestBody)
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      // console.log(
      //   'Ollama generateContentStream: Response status',
      //   response.status
      // )
      if (!response.ok) {
        const error = new Error(`Ollama API error`)
        error.status = response.status
        try {
          const errorData = await response.json()
          error.message += ` - ${
            errorData.message || JSON.stringify(errorData)
          }`
          // console.error(
          //   'Ollama generateContentStream: Error response data',
          //   errorData
          // )
        } catch (e) {
          error.message += ` - ${response.statusText}`
          // console.error(
          //   'Ollama generateContentStream: Error parsing response',
          //   e
          // )
        }
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
              // console.log(
              //   'Ollama generateContentStream: Parsed stream chunk',
              //   parsed
              // ) // Thêm log này
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
