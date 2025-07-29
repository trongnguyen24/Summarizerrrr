// @ts-nocheck
import { GeminiProvider } from './providers/geminiProvider.js'
import { OpenrouterProvider } from './providers/openrouterProvider.js'
import { OllamaProvider } from './providers/ollamaProvider.js'
import { OpenAICompatibleProvider } from './providers/openaiCompatibleProvider.js'
// Import other providers here as they are implemented

export const providersConfig = {
  gemini: {
    name: 'Google Gemini',
    providerClass: GeminiProvider,
    // Add other provider-specific configurations here if needed
  },
  // Add other providers here
  deepseek: {
    name: 'DeepSeek',
    providerClass: OpenAICompatibleProvider,
  },
  chatgpt: {
    name: 'ChatGPT',
    providerClass: OpenAICompatibleProvider,
  },
  openrouter: {
    name: 'OpenRouter',
    providerClass: OpenrouterProvider,
  },
  ollama: {
    name: 'Ollama',
    providerClass: OllamaProvider,
  },
  openaiCompatible: {
    name: 'OpenAI Compatible',
    providerClass: OpenAICompatibleProvider,
  },
}

import { settings } from '@/stores/settingsStore.svelte.js'

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
    case 'openaiCompatible':
      return new config.providerClass(
        currentSettings.openaiCompatibleApiKey,
        currentSettings.openaiCompatibleBaseUrl,
        currentSettings.selectedOpenAICompatibleModel
      )
    case 'chatgpt':
      return new config.providerClass(
        currentSettings.chatgptApiKey,
        currentSettings.chatgptBaseUrl,
        currentSettings.selectedChatgptModel // Thêm tham số model nếu cần
      )
    case 'deepseek':
      return new config.providerClass(
        currentSettings.deepseekApiKey,
        currentSettings.deepseekBaseUrl,
        currentSettings.selectedDeepseekModel // Thêm tham số model nếu cần
      )
    default:
      // For providers that only need an API key (e.g., if a new provider is added without a specific case)
      const apiKey = currentSettings[`${providerId}ApiKey`]
      return new config.providerClass(apiKey)
  }
}
