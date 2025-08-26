// @ts-nocheck
import { generateContent } from '@/lib/api/aiSdkAdapter.js'

// Provider-specific API key fields mapping
export const PROVIDER_API_KEY_MAP = {
  gemini: 'geminiApiKey',
  chatgpt: 'chatgptApiKey',
  openrouter: 'openrouterApiKey',
  deepseek: 'deepseekApiKey',
  groq: 'groqApiKey',
  openaiCompatible: 'openaiCompatibleApiKey',
}

/**
 * Tests an API key for a specific provider
 * @param {string} provider - The provider to test
 * @param {string} apiKey - The API key to test
 * @param {Object} currentSettings - Current settings object
 * @returns {Promise<Object>} - Test result with success status and message
 */
export async function testApiKey(provider, apiKey, currentSettings = {}) {
  try {
    // Create temporary settings object for testing
    const tempSettings = {
      ...currentSettings,
      selectedProvider: provider,
      [PROVIDER_API_KEY_MAP[provider]]: apiKey,
    }

    // Test with a simple prompt
    const result = await generateContent(
      provider,
      tempSettings,
      'You are a helpful assistant',
      "Say 'Hello' in one word only"
    )

    return {
      success: true,
      message: 'API key is valid!',
      result: result,
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || 'API key test failed',
      error: error,
    }
  }
}

// Error messages for different test scenarios
export const ERROR_MESSAGES = {
  invalid_api_key: 'API key is invalid. Please check and try again.',
  network_error: 'Network error. Please check your connection.',
  rate_limit: 'API rate limit reached. Please try again later.',
  unknown: 'Something went wrong. Please try again.',
}
