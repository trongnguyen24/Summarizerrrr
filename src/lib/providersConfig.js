// @ts-nocheck
import { GeminiProvider } from './providers/geminiProvider.js'
import { OpenrouterProvider } from './providers/openrouterProvider.js'
import { OllamaProvider } from './providers/ollamaProvider.js'
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
  openrouter: {
    name: 'OpenRouter',
    providerClass: OpenrouterProvider,
  },
  ollama: {
    name: 'Ollama',
    providerClass: OllamaProvider,
  },
}

import { settings } from '../stores/settingsStore.svelte'

export function getProvider(providerId, apiKey) {
  const config = providersConfig[providerId]
  if (!config) {
    throw new Error(`Provider "${providerId}" not found.`)
  }

  if (providerId === 'ollama') {
    const ollamaEndpoint = settings.ollamaEndpoint
    // Ensure selectedOllamaModel has a default value if not set
    const selectedOllamaModel = settings.selectedOllamaModel || 'llama2'
    return new config.providerClass(ollamaEndpoint, selectedOllamaModel)
  }

  return new config.providerClass(apiKey)
}
