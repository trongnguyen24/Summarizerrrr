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

/**
 * Retrieves a provider instance based on the provider ID and current settings.
 * @param {string} providerId The ID of the provider to retrieve.
 * @param {object} currentSettings The current settings object from settingsStore.
 * @returns {object} An instance of the requested provider.
 * @throws {Error} If the provider ID is not found.
 */
export function getProvider(providerId, currentSettings) {
  const config = providersConfig[providerId]
  if (!config) {
    throw new Error(`Provider "${providerId}" not found.`)
  }

  switch (providerId) {
    case 'ollama':
      const ollamaEndpoint = currentSettings.ollamaEndpoint
      // Ensure selectedOllamaModel has a default value if not set
      const selectedOllamaModel =
        currentSettings.selectedOllamaModel || 'llama2'
      return new config.providerClass(ollamaEndpoint, selectedOllamaModel)
    case 'gemini':
      // Determine which Gemini API key and model to use based on advanced mode
      const geminiApiKey = currentSettings.isAdvancedMode
        ? currentSettings.geminiAdvancedApiKey
        : currentSettings.geminiApiKey
      const selectedGeminiModel = currentSettings.isAdvancedMode
        ? currentSettings.selectedGeminiAdvancedModel
        : currentSettings.selectedGeminiModel
      return new config.providerClass(geminiApiKey, selectedGeminiModel)
    case 'openrouter':
      return new config.providerClass(
        currentSettings.openrouterApiKey,
        currentSettings.selectedOpenrouterModel
      )
    // Add cases for other providers as they are implemented
    default:
      // For providers that only need an API key (e.g., DeepSeek, ChatGPT if implemented)
      // This assumes a generic 'apiKey' property in settings for other providers
      const apiKey = currentSettings[`${providerId}ApiKey`]
      return new config.providerClass(apiKey)
  }
}
