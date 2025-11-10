// @ts-nocheck
import { settings } from '@/stores/settingsStore.svelte.js'
import { getAISDKModel } from '@/lib/api/aiSdkAdapter.js'

/**
 * Resolves the effective provider configuration for a tool
 * @param {string} toolName - Name of the tool (e.g., 'deepDive')
 * @returns {Object} Resolved provider config
 * @throws {Error} If no valid provider is configured
 */
export function resolveToolProvider(toolName) {
  // Validate tool exists
  const toolConfig = settings.tools?.[toolName]

  if (!toolConfig) {
    throw new Error(`Tool "${toolName}" not found in settings`)
  }

  // Check if tool is enabled
  if (!toolConfig.enabled) {
    throw new Error(
      `Tool "${toolName}" is disabled. Please enable it in Settings > Tools.`
    )
  }

  // ✅ CASE 1: Use Gemini Basic (with smart fallback)
  if (toolConfig.useGeminiBasic) {
    const geminiApiKey = settings.geminiApiKey?.trim()

    // If Gemini Basic API key exists, use it
    if (geminiApiKey) {
      console.log('[toolProviderService] Using Gemini Basic')
      return {
        provider: 'gemini',
        model: settings.selectedGeminiModel || 'gemini-2.5-flash',
        temperature: 0.7,
        topP: 0.9,
      }
    }

    // ✅ SMART FALLBACK: Use current summary provider
    console.warn(
      '[toolProviderService] Gemini Basic API key not found, falling back to summary provider'
    )
    return getFallbackProvider('Gemini Basic')
  }

  // ✅ CASE 2: Use custom provider (with smart fallback)
  const { customProvider, customModel } = toolConfig

  // Validate provider
  if (!customProvider || typeof customProvider !== 'string') {
    throw new Error('Custom provider is not configured')
  }

  // Get and validate API key
  const providerKey = getProviderApiKey(customProvider)

  // ✅ If custom provider has API key, use it
  if (providerKey && (typeof providerKey !== 'string' || providerKey.trim())) {
    // Validate model name
    if (
      !customModel ||
      typeof customModel !== 'string' ||
      !customModel.trim()
    ) {
      throw new Error(
        `Model name for "${customProvider}" is invalid or missing`
      )
    }

    console.log(
      `[toolProviderService] Using custom provider: ${customProvider}`
    )
    return {
      provider: customProvider,
      model: customModel.trim(),
      temperature: 0.7,
      topP: 0.9,
    }
  }

  // ✅ SMART FALLBACK: Use current summary provider
  console.warn(
    `[toolProviderService] Custom provider "${customProvider}" has no API key, falling back to summary provider`
  )
  return getFallbackProvider(customProvider)
}

/**
 * Gets API key for a specific provider
 * @param {string} providerId - Provider ID
 * @returns {string|null} API key or null if not found
 */
function getProviderApiKey(providerId) {
  const keyMap = {
    gemini: settings.geminiAdvancedApiKey || settings.geminiApiKey,
    openrouter: settings.openrouterApiKey,
    chatgpt: settings.chatgptApiKey,
    openai: settings.chatgptApiKey,
    groq: settings.groqApiKey,
    deepseek: settings.deepseekApiKey,
    ollama: 'local', // Ollama doesn't require API key
    lmstudio: 'local',
    openaiCompatible: settings.openaiCompatibleApiKey,
  }

  const key = keyMap[providerId]

  // Return null for missing keys (except local providers)
  if (!key) {
    return null
  }

  // For string keys, check if empty (local providers always valid)
  if (typeof key === 'string' && key !== 'local' && !key.trim()) {
    return null
  }

  return key
}

/**
 * ✅ NEW: Gets fallback to summary provider
 * @param {string} attemptedProvider - Provider that was attempted but failed
 * @returns {Object} Provider config
 * @throws {Error} If no valid provider available
 */
function getFallbackProvider(attemptedProvider) {
  const summaryProvider = settings.selectedProvider || 'gemini'
  const summaryProviderKey = getProviderApiKey(summaryProvider)

  if (!summaryProviderKey) {
    throw new Error(
      `No valid AI provider configured. Please add an API key for "${summaryProvider}" or "${attemptedProvider}" in Settings > Summary.`
    )
  }

  const modelKey = getProviderModelKey(summaryProvider)
  const model = settings[modelKey] || getDefaultModel(summaryProvider)

  // ✅ NEW: Detect if user is using Gemini Advanced mode for summary
  let isAdvancedMode = false
  if (summaryProvider === 'gemini') {
    // Check if user is in Advanced mode (has geminiAdvancedApiKey and isAdvancedMode enabled)
    isAdvancedMode = settings.isAdvancedMode && !!settings.geminiAdvancedApiKey

    if (isAdvancedMode) {
      console.log(
        '[toolProviderService] ✅ Using fallback: Gemini Advanced mode detected'
      )
    }
  }

  console.log(
    `[toolProviderService] ✅ Using fallback provider: ${summaryProvider} (${model})${
      isAdvancedMode ? ' [Advanced]' : ''
    }`
  )

  return {
    provider: summaryProvider,
    model: model,
    temperature: settings.temperature || 0.7,
    topP: settings.topP || 0.9,
    isAdvancedMode, // ✅ Pass advanced mode flag
  }
}

/**
 * ✅ NEW: Gets model settings key for a provider
 * @param {string} providerId - Provider ID
 * @returns {string} Settings key for model selection
 */
function getProviderModelKey(providerId) {
  const modelKeyMap = {
    gemini: 'selectedGeminiModel',
    chatgpt: 'selectedChatgptModel',
    openai: 'selectedChatgptModel',
    groq: 'selectedGroqModel',
    deepseek: 'selectedDeepseekModel',
    openrouter: 'selectedOpenrouterModel',
    ollama: 'selectedOllamaModel',
    lmstudio: 'selectedLmStudioModel',
    openaiCompatible: 'selectedOpenAICompatibleModel',
  }
  return modelKeyMap[providerId] || 'selectedGeminiModel'
}

/**
 * ✅ NEW: Gets default model for a provider
 * @param {string} providerId - Provider ID
 * @returns {string} Default model name
 */
function getDefaultModel(providerId) {
  const defaultModels = {
    gemini: 'gemini-2.5-flash',
    chatgpt: 'gpt-5-mini',
    groq: 'moonshotai/kimi-k2-instruct',
    deepseek: 'deepseek-chat',
    openrouter: 'deepseek/deepseek-r1-0528:free',
    ollama: 'deepseek-r1:8b',
    lmstudio: 'lmstudio-community/gemma-2b-it-GGUF',
  }
  return defaultModels[providerId] || 'gemini-2.5-flash'
}

/**
 * Creates an AI SDK model instance for a tool
 * @param {string} toolName - Name of the tool
 * @returns {Object} AI SDK model instance
 */
export function getToolAIModel(toolName) {
  const providerConfig = resolveToolProvider(toolName)

  // Build clean settings object chỉ với những gì cần thiết
  const modelSettings = buildModelSettings(providerConfig, settings)

  return getAISDKModel(providerConfig.provider, modelSettings)
}

/**
 * Helper function để build model-specific settings
 * ✅ UPDATED: Preserve isAdvancedMode from providerConfig for Gemini fallback
 * @param {Object} providerConfig - Provider configuration
 * @param {Object} globalSettings - Global settings
 * @returns {Object} Model settings
 */
export function buildModelSettings(providerConfig, globalSettings) {
  const { provider, model, temperature, topP, isAdvancedMode } = providerConfig

  // ✅ Convert Svelte proxy to plain object để tránh performance issues
  const plainSettings = JSON.parse(JSON.stringify(globalSettings))

  // Provider-specific model key mapping
  const modelKeyMap = {
    gemini: 'selectedGeminiModel',
    openrouter: 'selectedOpenrouterModel',
    chatgpt: 'selectedChatgptModel',
    openai: 'selectedChatgptModel',
    groq: 'selectedGroqModel',
    deepseek: 'selectedDeepseekModel',
    ollama: 'selectedOllamaModel',
    lmstudio: 'selectedLmStudioModel',
    openaiCompatible: 'selectedOpenAICompatibleModel',
  }

  const modelKey = modelKeyMap[provider] || 'selectedGeminiModel'

  // ✅ Dùng lại toàn bộ global settings, chỉ override những gì cần thiết
  return {
    ...plainSettings,
    selectedProvider: provider,
    [modelKey]: model,
    temperature,
    topP,
    // ✅ UPDATED: Preserve isAdvancedMode from fallback detection
    // If isAdvancedMode is provided in providerConfig (from fallback), use it
    // Otherwise default to false for non-Gemini providers
    isAdvancedMode: isAdvancedMode !== undefined ? isAdvancedMode : false,
  }
}

/**
 * Checks if a tool has a valid provider configured
 * @param {string} toolName - Name of the tool
 * @returns {boolean} True if valid provider exists
 */
export function hasValidToolProvider(toolName) {
  try {
    resolveToolProvider(toolName)
    return true
  } catch {
    return false
  }
}
