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
  'geminiAdditionalApiKeys',
  'selectedGeminiModel',
  'geminiEnableAutoFallback',
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
  'cerebrasApiKey',
  'selectedCerebrasModel',
  'nvidiaApiKey',
  'selectedNvidiaModel',
  'addedProviders',
  'openaiCompatibleProfiles',

  // UI Configuration
  'floatButton',
  'floatButtonLeft',
  'showFloatingButton',
  'floatingPanelLeft',
  'closePanelOnOutsideClick',
  'selectedFont',
  'uiLang',
  'mobileSheetHeight',
  'mobileSheetBackdropOpacity',
  'fontSizeIndex',
  'widthIndex',
  'sidePanelDefaultWidth',
  'oneClickSummarize',
  'reduceMotion',
  'iconClickAction',
  'fabDomainControl',
  'quickSummaryEnabled',
  'quickSummaryAutoplay',
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

  // Custom Prompts - Analyze
  'analyzePromptSelection',
  'analyzeCustomPromptContent',
  'analyzeCustomSystemInstructionContent',

  // Custom Prompts - Explain
  'explainPromptSelection',
  'explainCustomPromptContent',
  'explainCustomSystemInstructionContent',

  // Custom Prompts - Debate
  'debatePromptSelection',
  'debateCustomPromptContent',
  'debateCustomSystemInstructionContent',

  // Custom Prompts - YouTube Comment
  'commentPromptSelection',
  'commentCustomPromptContent',
  'commentCustomSystemInstructionContent',

  // Chat skills and persona
  'chatGlobalPersona',
  'chatUserSkills',
  'chatSkillMigrationVersion',
  'fabVisibilityMigrationVersion',

  // Advanced Mode
  'isAdvancedMode',

  // Tools Configuration
  'tools',
  'summarize',
  'chat',
  
  // Metadata
  'lastModified',
]

/**
 * Migrates legacy geminiAdvanced* settings to unified gemini* settings.
 * MUST run on raw settings BEFORE sanitizeSettings() strips unknown keys.
 *
 * @param {Object} raw - Raw settings object (may contain legacy keys)
 * @returns {Object} - Settings with legacy keys migrated
 */
export function migrateLegacyGeminiAdvanced(raw) {
  if (!raw || typeof raw !== 'object') return raw

  // Quick-exit: no legacy keys present
  if (
    !raw.geminiAdvancedApiKey &&
    !raw.geminiAdvancedAdditionalApiKeys?.length &&
    !raw.selectedGeminiAdvancedModel &&
    !raw.geminiAdvancedThinkingLevel &&
    raw.geminiAdvancedEnableAutoFallback === undefined &&
    raw.geminiAdvancedBackupModels === undefined &&
    raw.summarize?.provider !== 'geminiAdvanced' &&
    raw.chat?.provider !== 'geminiAdvanced' &&
    raw.tools?.deepDive?.customProvider !== 'geminiAdvanced' &&
    !raw.geminiThinkingLevel
  ) {
    return raw
  }

  console.log('[settingsSchema] Migrating legacy geminiAdvanced settings...')
  const s = { ...raw }

  // --- 1. API Key merge+dedupe ---
  const basicKey = s.geminiApiKey?.trim() || ''
  const advKey = s.geminiAdvancedApiKey?.trim() || ''
  const primary = basicKey || advKey

  const basicAdditional = (s.geminiAdditionalApiKeys || []).filter(k => k?.trim())
  const advAdditional = (s.geminiAdvancedAdditionalApiKeys || []).filter(k => k?.trim())
  const extra = []
  if (advKey && advKey !== primary) extra.push(advKey)
  extra.push(...advAdditional)
  const allAdditional = [...basicAdditional, ...extra]
  const uniqueAdditional = [...new Set(allAdditional)].filter(k => k !== primary)

  s.geminiApiKey = primary
  s.geminiAdditionalApiKeys = uniqueAdditional

  // --- 2. Model: prefer active mode's value ---
  if (s.selectedGeminiAdvancedModel && !s.selectedGeminiModel) {
    s.selectedGeminiModel = s.selectedGeminiAdvancedModel
  } else if (s.isAdvancedMode && s.selectedGeminiAdvancedModel) {
    s.selectedGeminiModel = s.selectedGeminiAdvancedModel
  }

  // --- 3. Thinking level migration ---
  const legacyThinking = s.geminiThinkingLevel || s.geminiAdvancedThinkingLevel
  if (legacyThinking) {
    const mapped = legacyThinking === 'minimal' ? 'off' : 'medium'
    s.summarize = {
      ...(s.summarize || {}),
      reasoningLevel: mapped,
    }
  }

  // --- 4. Auto-fallback toggle ---
  if (s.geminiAdvancedEnableAutoFallback !== undefined && s.geminiEnableAutoFallback === undefined) {
    s.geminiEnableAutoFallback = s.geminiAdvancedEnableAutoFallback
  }

  // --- 5. Rewrite persisted provider IDs ---
  if (s.summarize?.provider === 'geminiAdvanced') {
    s.summarize = { ...s.summarize, provider: 'gemini' }
  }
  if (s.chat?.provider === 'geminiAdvanced') {
    s.chat = { ...s.chat, provider: 'gemini' }
  }
  if (s.tools?.deepDive?.customProvider === 'geminiAdvanced') {
    s.tools = { ...s.tools, deepDive: { ...s.tools.deepDive, customProvider: 'gemini' } }
  }
  // Rewrite quickModels provider IDs
  if (Array.isArray(s.chat?.quickModels)) {
    s.chat = {
      ...s.chat,
      quickModels: s.chat.quickModels.map(qm =>
        qm?.provider === 'geminiAdvanced' ? { ...qm, provider: 'gemini' } : qm
      ),
    }
  }

  // --- 6. Clean up legacy keys ---
  delete s.geminiAdvancedApiKey
  delete s.geminiAdvancedAdditionalApiKeys
  delete s.selectedGeminiAdvancedModel
  delete s.geminiAdvancedThinkingLevel
  delete s.geminiAdvancedEnableAutoFallback
  delete s.geminiAdvancedBackupModels
  delete s.geminiThinkingLevel

  return s
}

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
  providers: [
    ...VALID_SETTING_KEYS.filter(
      (key) =>
        key.includes('ApiKey') ||
        key.includes('Model') ||
        key.includes('Endpoint') ||
        key.includes('BaseUrl') ||
        key === 'selectedProvider'
    ),
    'openaiCompatibleProfiles'
  ],
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
  advanced: ['isAdvancedMode'],
  tools: ['tools'],
}
