// @ts-nocheck
import { browser } from 'wxt/browser'

/**
 * Creates a proxy model for Ollama that routes through background script
 * This is used when running in content script context where CORS rules don't apply
 * Content script only uses blocking mode - no streaming support
 */
export function createOllamaProxyModel(settings) {
  const modelName = settings.selectedOllamaModel || 'llama2'

  return {
    // Implement the AI SDK model interface
    modelId: `ollama:${modelName}`,

    // Proxy generateText method
    async generateText(config) {
      const requestId = generateRequestId()

      try {
        console.log(
          `[OllamaProxy] Sending API request ${requestId} to background`
        )

        const response = await browser.runtime.sendMessage({
          type: 'OLLAMA_API_REQUEST',
          requestId,
          providerId: 'ollama',
          settings,
          systemInstruction: config.system || '',
          userPrompt: config.prompt,
          config: {
            temperature: config.temperature,
            topP: config.topP,
            maxTokens: config.maxTokens,
          },
        })

        if (!response.success) {
          throw new Error(response.error?.message || 'Proxy request failed')
        }

        console.log(
          `[OllamaProxy] API request ${requestId} completed successfully`
        )

        return {
          text: response.result,
          usage: { totalTokens: 0 }, // Ollama doesn't provide token usage
          finishReason: 'stop',
        }
      } catch (error) {
        console.error(`[OllamaProxy] API request ${requestId} failed:`, error)
        throw error
      }
    },

    // Content script only uses blocking mode - no streaming support
    async streamText(config) {
      console.log(
        '[OllamaProxy] Content script detected - falling back to blocking mode instead of streaming'
      )

      // Fallback to blocking mode for content script
      const result = await this.generateText(config)

      // Create a fake stream that yields the complete result
      const fakeStream = (async function* () {
        yield result.text
      })()

      return {
        textStream: fakeStream,
        usage: Promise.resolve({ totalTokens: 0 }),
        finishReason: Promise.resolve('stop'),
      }
    },
  }
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `ollama_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
