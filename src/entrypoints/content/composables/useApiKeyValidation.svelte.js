// @ts-nocheck
import { settings } from '@/stores/settingsStore.svelte.js'

// Provider to API key field mapping
export const providerApiKeyMap = {
  gemini: 'geminiApiKey',
  'gemini-advanced': 'geminiAdvancedApiKey',
  'openai-compatible': 'openaiCompatibleApiKey',
  openrouter: 'openrouterApiKey',
  deepseek: 'deepseekApiKey',
  chatgpt: 'chatgptApiKey',
  groq: 'groqApiKey',
  // ollama và lmstudio không cần API key (local endpoints)
}

// Provider display names for user-friendly messages
export const providerDisplayNames = {
  gemini: 'Gemini',
  'gemini-advanced': 'Gemini Advanced',
  'openai-compatible': 'OpenAI Compatible',
  openrouter: 'OpenRouter',
  deepseek: 'DeepSeek',
  chatgpt: 'ChatGPT',
  groq: 'Groq',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
}

/**
 * Composable for API key validation logic
 * @returns {Object} API key validation utilities
 */
export function useApiKeyValidation() {
  // Check if current provider needs API key setup
  const needsApiKeySetup = $derived(() => {
    const rawProvider = settings.selectedProvider
    const isAdvanced = settings.isAdvancedMode

    // Determine the actual provider based on isAdvancedMode (like in api.js)
    let actualProvider = rawProvider
    if (!isAdvanced) {
      actualProvider = 'gemini' // Force Gemini in basic mode
    }

    // Special handling for Gemini provider based on advanced mode
    let keyField
    if (actualProvider === 'gemini') {
      keyField = isAdvanced ? 'geminiAdvancedApiKey' : 'geminiApiKey'
    } else {
      keyField = providerApiKeyMap[actualProvider]
    }

    // Providers không cần API key (ollama, lmstudio)
    if (!keyField) {
      return false
    }

    // Check xem API key có rỗng không
    const apiKey = settings[keyField]

    const needsSetup = !apiKey || apiKey.trim() === ''

    return needsSetup
  })

  // Get display name for current provider
  const currentProviderDisplayName = $derived(() => {
    return (
      providerDisplayNames[settings.selectedProvider] ||
      settings.selectedProvider
    )
  })

  /**
   * Get the API key field name for a given provider
   * @param {string} provider - The provider name
   * @param {boolean} isAdvanced - Whether advanced mode is enabled
   * @returns {string|null} The API key field name or null if not needed
   */
  const getApiKeyField = (provider, isAdvanced = false) => {
    if (provider === 'gemini') {
      return isAdvanced ? 'geminiAdvancedApiKey' : 'geminiApiKey'
    }
    return providerApiKeyMap[provider] || null
  }

  /**
   * Check if a specific provider needs API key
   * @param {string} provider - The provider name
   * @returns {boolean} Whether the provider needs an API key
   */
  const providerNeedsApiKey = (provider) => {
    // ollama và lmstudio không cần API key
    return provider !== 'ollama' && provider !== 'lmstudio'
  }

  return {
    needsApiKeySetup: () => needsApiKeySetup,
    currentProviderDisplayName: () => currentProviderDisplayName,
    getApiKeyField,
    providerNeedsApiKey,
    providerApiKeyMap,
    providerDisplayNames,
  }
}
