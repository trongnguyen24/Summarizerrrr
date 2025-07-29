// @ts-nocheck
import { GoogleGenAI } from '@google/genai'
import { BaseProvider } from './baseProvider.js'
import { ErrorHandler } from '@/lib/error/errorHandler.js'

export class GeminiProvider extends BaseProvider {
  constructor(apiKey) {
    super(apiKey)
    this.genAI = new GoogleGenAI({ apiKey })
  }

  async generateContent(model, contents, systemInstruction, generationConfig) {
    try {
      console.log('Gemini generateContent:', {
        model,
        contents,
        systemInstruction,
        generationConfig,
      })
      const result = await this.genAI.models.generateContent({
        model: model,
        contents: contents,
        systemInstruction: systemInstruction,
        generationConfig: generationConfig,
      })
      console.log('Gemini API Result:', result)
      return result
    } catch (error) {
      throw ErrorHandler.handle(error, {
        provider: 'Gemini',
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
      console.log('Gemini generateContentStream:', {
        model,
        contents,
        systemInstruction,
        generationConfig,
      })
      const result = await this.genAI.models.generateContentStream({
        model: model,
        contents: contents,
        systemInstruction: systemInstruction,
        generationConfig: generationConfig,
      })

      for await (const chunk of result) {
        const text = chunk.text
        if (text) {
          yield text
        }
      }
    } catch (error) {
      throw ErrorHandler.handle(error, {
        provider: 'Gemini',
        model: model,
        operation: 'generateContentStream',
      })
    }
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
}
