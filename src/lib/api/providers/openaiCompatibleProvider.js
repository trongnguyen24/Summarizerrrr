// @ts-nocheck
import { BaseProvider } from './baseProvider.js'
import OpenAI from 'openai'
import { ErrorHandler } from '@/lib/error/errorHandler.js'

export class OpenAICompatibleProvider extends BaseProvider {
  constructor(apiKey, baseUrl) {
    super()
    this.apiKey = apiKey
    let processedBaseUrl = baseUrl || 'https://api.openai.com/v1'

    // Chỉ loại bỏ /chat/completions nếu nó có ở cuối baseURL
    if (processedBaseUrl.endsWith('/chat/completions')) {
      processedBaseUrl = processedBaseUrl.substring(
        0,
        processedBaseUrl.length - '/chat/completions'.length
      )
    }

    // Đảm bảo baseUrl không kết thúc bằng dấu gạch chéo '/' (trừ trường hợp URL chỉ là '/')
    if (processedBaseUrl.endsWith('/') && processedBaseUrl !== '/') {
      processedBaseUrl = processedBaseUrl.slice(0, -1)
    }

    this.baseUrl = processedBaseUrl
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
      throw ErrorHandler.handle(error, {
        provider: 'OpenAICompatible',
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
      throw ErrorHandler.handle(error, {
        provider: 'OpenAICompatible',
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
