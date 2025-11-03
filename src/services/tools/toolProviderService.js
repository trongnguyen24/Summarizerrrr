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

  // Case 1: Use Gemini Basic
  if (toolConfig.useGeminiBasic) {
    const apiKey = settings.geminiApiKey?.trim()
    if (!apiKey) {
      throw new Error(
        'Gemini API key is required. Please configure it in Settings > Summary > Gemini Basic.'
      )
    }

    // ✅ Dùng model từ Gemini Basic settings thay vì hardcode
    return {
      provider: 'gemini',
      model: settings.selectedGeminiModel || 'gemini-2.5-flash',
      temperature: 0.7,
      topP: 0.9,
    }
  }

  // Case 2: Use custom provider
  const { customProvider, customModel } = toolConfig

  // Validate provider
  if (!customProvider || typeof customProvider !== 'string') {
    throw new Error('Custom provider is not configured')
  }

  // Get and validate API key
  const providerKey = getProviderApiKey(customProvider)
  if (
    !providerKey ||
    (typeof providerKey === 'string' && !providerKey.trim())
  ) {
    throw new Error(
      `API key for "${customProvider}" is missing. Please add it in Settings > Summary.`
    )
  }

  // Validate model name
  if (!customModel || typeof customModel !== 'string' || !customModel.trim()) {
    throw new Error(`Model name for "${customProvider}" is invalid or missing`)
  }

  return {
    provider: customProvider,
    model: customModel.trim(),
    temperature: 0.7,
    topP: 0.9,
  }
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

  return keyMap[providerId] || null
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
 * ✅ SIMPLIFIED: Dùng lại toàn bộ global settings, chỉ override provider và model
 * @param {Object} providerConfig - Provider configuration
 * @param {Object} globalSettings - Global settings
 * @returns {Object} Model settings
 */
function buildModelSettings(providerConfig, globalSettings) {
  const { provider, model, temperature, topP } = providerConfig

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
    // ✅ CRITICAL: Set isAdvancedMode = false để aiSdkAdapter.js dùng đúng API key
    // Khi tool gọi, nó luôn dùng basic mode (geminiApiKey hoặc geminiAdvancedApiKey)
    isAdvancedMode: false,
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
