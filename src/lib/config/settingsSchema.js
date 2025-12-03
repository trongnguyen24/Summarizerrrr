// @ts-nocheck
/**
 * Settings Schema Configuration
 * Centralized definition of valid setting keys to prevent code duplication
 * Used by: settingsStore, exportService, importValidation
 */

/**
 * Complete list of valid setting keys
 * This is the source of truth for all settings-related operations
 */
export const VALID_SETTING_KEYS = [
  // Provider Configuration
  'selectedProvider',
  'geminiApiKey',
  'selectedGeminiModel',
  'geminiAdvancedApiKey',
  'selectedGeminiAdvancedModel',
  'openaiCompatibleApiKey',
  'openaiCompatibleBaseUrl',
  'selectedOpenAICompatibleModel',
  'openrouterApiKey',
  'selectedOpenrouterModel',
  'deepseekApiKey',
  'deepseekBaseUrl',
  'selectedDeepseekModel',
  'chatgptApiKey',
  'chatgptBaseUrl',
  'selectedChatgptModel',
  'ollamaEndpoint',
  'selectedOllamaModel',
  'lmStudioEndpoint',
  'selectedLmStudioModel',
  'groqApiKey',
  'selectedGroqModel',

  // UI Configuration
  'floatButton',
  'floatButtonLeft',
  'showFloatingButton',
  'floatingPanelLeft',
  'closePanelOnOutsideClick',
  'selectedFont',
  'enableStreaming',
  'uiLang',
  'mobileSheetHeight',
  'mobileSheetBackdropOpacity',
  'fontSizeIndex',
  'widthIndex',
  'sidePanelDefaultWidth',
  'oneClickSummarize',
  'iconClickAction',
  'fabDomainControl',
  'firefoxPermissions',

  // Onboarding
  'hasCompletedOnboarding',
  'onboardingStep',

  // Summary Configuration
  'summaryLength',
  'summaryFormat',
  'summaryLang',
  'summaryTone',
  'isSummaryAdvancedMode',
  'commentLimit',

  // Custom Prompts - YouTube
  'youtubePromptSelection',
  'youtubeCustomPromptContent',
  'youtubeCustomSystemInstructionContent',

  // Custom Prompts - Chapters
  'chapterPromptSelection',
  'chapterCustomPromptContent',
  'chapterCustomSystemInstructionContent',

  // Custom Prompts - Web
  'webPromptSelection',
  'webCustomPromptContent',
  'webCustomSystemInstructionContent',

  // Custom Prompts - Course Summary
  'courseSummaryPromptSelection',
  'courseSummaryCustomPromptContent',
  'courseSummaryCustomSystemInstructionContent',

  // Custom Prompts - Course Concepts
  'courseConceptsPromptSelection',
  'courseConceptsCustomPromptContent',
  'courseConceptsCustomSystemInstructionContent',

  // Custom Prompts - Selected Text
  'selectedTextPromptSelection',
  'selectedTextCustomPromptContent',
  'selectedTextCustomSystemInstructionContent',

  // Advanced Mode
  'isAdvancedMode',
  'temperature',
  'topP',

  // Tools Configuration
  'tools',
]

/**
 * Sanitizes settings object to only include valid keys
 * Handles nested settings structures and removes metadata
 *
 * @param {Object} rawSettings - Raw settings object (may contain nested or invalid keys)
 * @returns {Object} - Clean settings object with only valid keys
 */
export function sanitizeSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== 'object') {
    console.warn('[settingsSchema] Invalid settings object provided')
    return {}
  }

  // Blacklist of keys that should never be in settings
  const BLACKLIST_KEYS = ['metadata', 'theme', 'settings']

  // Handle nested settings.settings structure - flatten it
  let settings = rawSettings
  while (settings.settings && typeof settings.settings === 'object') {
    console.log(
      '[settingsSchema] Detected nested settings, extracting inner layer'
    )
    settings = settings.settings
  }

  // Filter to only valid keys and remove blacklisted keys
  const cleanSettings = {}
  VALID_SETTING_KEYS.forEach((key) => {
    if (settings[key] !== undefined && !BLACKLIST_KEYS.includes(key)) {
      cleanSettings[key] = settings[key]
    }
  })

  // Log sanitization results in development
  if (process.env.NODE_ENV === 'development') {
    const removedKeys = Object.keys(settings).filter(
      (key) => !VALID_SETTING_KEYS.includes(key) || BLACKLIST_KEYS.includes(key)
    )
    if (removedKeys.length > 0) {
      console.log('[settingsSchema] Sanitized settings:', {
        originalKeys: Object.keys(rawSettings),
        cleanKeys: Object.keys(cleanSettings),
        removedKeys,
      })
    }
  }

  return cleanSettings
}

/**
 * Validates if a key is a valid setting key
 * @param {string} key - Key to validate
 * @returns {boolean} - True if valid setting key
 */
export function isValidSettingKey(key) {
  return VALID_SETTING_KEYS.includes(key)
}

/**
 * Get setting keys by category
 * Useful for conditional exports or imports
 */
export const SETTING_CATEGORIES = {
  providers: VALID_SETTING_KEYS.filter(
    (key) =>
      key.includes('ApiKey') ||
      key.includes('Model') ||
      key.includes('Endpoint') ||
      key.includes('BaseUrl') ||
      key === 'selectedProvider'
  ),
  ui: VALID_SETTING_KEYS.filter(
    (key) =>
      key.includes('float') ||
      key.includes('font') ||
      key.includes('width') ||
      key.includes('Lang') ||
      key.includes('mobile') ||
      key.includes('icon') ||
      key.includes('fab')
  ),
  prompts: VALID_SETTING_KEYS.filter(
    (key) => key.includes('Prompt') || key.includes('Instruction')
  ),
  summary: VALID_SETTING_KEYS.filter(
    (key) => key.startsWith('summary') || key === 'isSummaryAdvancedMode'
  ),
  advanced: ['isAdvancedMode', 'temperature', 'topP', 'enableStreaming'],
  tools: ['tools'],
}
