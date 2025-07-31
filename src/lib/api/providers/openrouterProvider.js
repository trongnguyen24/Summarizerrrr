// @ts-nocheck
import { BaseProvider } from './baseProvider.js'
import { ErrorHandler } from '@/lib/error/errorHandler.js'

export class OpenrouterProvider extends BaseProvider {
  constructor(apiKey) {
    super() // Không truyền apiKey vào super vì BaseProvider không xử lý nó
    this.apiKey = apiKey // Gán apiKey trực tiếp vào OpenrouterProvider
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions'
  }

  async generateContent(model, contents, systemInstruction, generationConfig) {
    try {
      console.log('OpenRouter generateContent:', {
        model,
        contents,
        systemInstruction,
        generationConfig,
      })
      const messages = []

      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction })
      }

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
        const error = new Error(`OpenRouter API error`)
        error.status = response.status
        try {
          const errorData = await response.json()
          error.message += ` - ${
            errorData.error?.message || JSON.stringify(errorData)
          }`
        } catch (e) {
          error.message += ` - ${response.statusText}`
        }
        throw error
      }

      const result = await response.json()
      console.log('OpenRouter API Result:', result)
      return result
    } catch (error) {
      throw ErrorHandler.handle(error, {
        provider: 'OpenRouter',
        model: model,
        operation: 'generateContent',
      })
    }
  }

  async *generateContentStream(
    model,
    contents,
    systemInstruction,
    generationConfig
  ) {
    try {
      const messages = []
      if (systemInstruction) {
        messages.push({ role: 'system', content: systemInstruction })
      }
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
        stream: true,
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
        const error = new Error(`OpenRouter API error`)
        error.status = response.status
        try {
          const errorData = await response.json()
          error.message += ` - ${
            errorData.error?.message || JSON.stringify(errorData)
          }`
        } catch (e) {
          error.message += ` - ${response.statusText}`
        }
        throw error
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          while (true) {
            const lineEnd = buffer.indexOf('\n')
            if (lineEnd === -1) break

            const line = buffer.slice(0, lineEnd).trim()
            buffer = buffer.slice(lineEnd + 1)

            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0].delta.content
                if (content) {
                  yield content
                }
              } catch (e) {
                const streamError = new Error(
                  'Failed to parse OpenRouter stream chunk'
                )
                streamError.cause = e
                throw streamError
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      throw ErrorHandler.handle(error, {
        provider: 'OpenRouter',
        model: model,
        operation: 'generateContentStream',
      })
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
}
