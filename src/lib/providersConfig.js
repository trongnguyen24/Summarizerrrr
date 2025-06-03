// @ts-nocheck
import { GeminiProvider } from './providers/geminiProvider.js'
// Import other providers here as they are implemented

export const providersConfig = {
  gemini: {
    name: 'Google Gemini',
    providerClass: GeminiProvider,
    // Add other provider-specific configurations here if needed
  },
  // Add other providers here
  // deepseek: {
  //   name: 'DeepSeek',
  //   providerClass: DeepSeekProvider,
  // },
  // chatgpt: {
  //   name: 'ChatGPT',
  //   providerClass: ChatGPTProvider,
  // },
  // openrouter: {
  //   name: 'OpenRouter',
  //   providerClass: OpenRouterProvider,
  // },
}

export function getProvider(providerId, apiKey) {
  const config = providersConfig[providerId]
  if (!config) {
    throw new Error(`Provider "${providerId}" not found.`)
  }
  return new config.providerClass(apiKey)
}
