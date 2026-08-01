// @ts-nocheck
import { get } from 'svelte/store'
import { locale } from 'svelte-i18n'
import { settingsStorage } from '@/services/wxtStorageService.js'
import {
  setSettingsProvider,
  setSettingsObject,
  setSettingsWriter,
} from '@/lib/config/settingsPort.js'
import { sanitizeSettings, migrateLegacyGeminiAdvanced } from '@/lib/config/settingsSchema.js'
import { normalizeProviderId, getLegacyModel, getProvider, getDefaultModel, listConfiguredProviders, isProviderConfigured } from '@/lib/providers/providerRegistry.js'
import {
  normalizeProfiles,
  isOpenAICompatibleProfileId,
  findProfileById,
  validateProfile,
  generateProfileId,
  getNextDefaultName
} from '@/lib/providers/openAICompatibleProfiles.js'

// --- Default Settings (Merged) ---
const DEFAULT_SETTINGS = {
  // General
  selectedProvider: 'gemini',
  floatButton: 200,
  floatButtonLeft: false,
  showFloatingButton: true,
  floatingPanelLeft: false, // Default to right side
  closePanelOnOutsideClick: true, // Close floating panel when clicking outside
  geminiApiKey: '',
  geminiAdditionalApiKeys: [], // New storage for extra keys
  selectedGeminiModel: 'gemini-3-flash-preview',
  geminiEnableAutoFallback: true, // Enable auto-fallback for both modes
  openaiCompatibleApiKey: '',
  openaiCompatibleBaseUrl: '',
  selectedOpenAICompatibleModel: '',
  openrouterApiKey: '',
  selectedOpenrouterModel: 'openrouter/free',
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com/',
  selectedDeepseekModel: 'deepseek-v4-flash',
  chatgptApiKey: '',
  chatgptBaseUrl: 'https://api.openai.com/v1',
  selectedChatgptModel: 'gpt-5.6-luna',
  ollamaEndpoint: 'http://127.0.0.1:11434/',
  selectedOllamaModel: 'deepseek-r1:8b',
  lmStudioEndpoint: 'http://localhost:1234/v1',
  selectedLmStudioModel: 'lmstudio-community/gemma-2b-it-GGUF',
  groqApiKey: '',
  selectedGroqModel: 'llama-3.3-70b-versatile',
  cerebrasApiKey: '',
  selectedCerebrasModel: 'gpt-oss-120b',
  nvidiaApiKey: '',
  selectedNvidiaModel: 'deepseek-ai/deepseek-v4-flash',
  selectedFont: 'default',
  uiLang: 'en',
  mobileSheetHeight: 80, // Chiều cao MobileSheet (40-100 svh)
  mobileSheetBackdropOpacity: false, // Enable backdrop opacity for MobileSheet
  fontSizeIndex: 2, // Default to prose-lg
  widthIndex: 1, // Default to max-w-3xl
  sidePanelDefaultWidth: 25, // Default width for side panel in em units
  oneClickSummarize: false, // Enable 1-click summarization on FAB
  reduceMotion: false, // Disable all animations across the extension
  iconClickAction: 'sidepanel', // 'sidepanel', 'popup', or 'floating'
  fabDomainControl: {
    mode: 'all', // 'all' | 'whitelist' | 'blacklist'
    whitelist: ['youtube.com', 'coursera.org', 'udemy.com'],
    blacklist: [],
  },

  // Quick Summary (YouTube thumbnail hover)
  quickSummaryEnabled: true, // Enable/disable quick summary feature
  quickSummaryAutoplay: 'pause', // 'auto' | 'pause' - YouTube autoplay behavior

  // Firefox Permissions - Persist permission states across tab switches
  firefoxPermissions: {
    httpsPermission: false,
    lastChecked: null,
  },
  // Onboarding
  hasCompletedOnboarding: false,
  onboardingStep: 0,

  // Summary
  summaryLength: 'long',
  summaryFormat: 'heading',
  summaryLang: 'English',
  summaryTone: 'simple',
  isSummaryAdvancedMode: false,
  commentLimit: 60,

  // Prompts
  youtubePromptSelection: false,
  youtubeCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  youtubeCustomSystemInstructionContent: 'You are an AI assistant.',
  chapterPromptSelection: false,
  chapterCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  chapterCustomSystemInstructionContent: 'You are an AI assistant.',
  webPromptSelection: false,
  webCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  webCustomSystemInstructionContent: 'You are an AI assistant.',
  courseSummaryPromptSelection: false,
  courseSummaryCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  courseSummaryCustomSystemInstructionContent: 'You are an AI assistant.',
  courseConceptsPromptSelection: false,
  courseConceptsCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  courseConceptsCustomSystemInstructionContent: 'You are an AI assistant.',
  selectedTextPromptSelection: false,
  selectedTextCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  selectedTextCustomSystemInstructionContent: 'You are an AI assistant.',

  // Custom Action Prompts
  analyzePromptSelection: false,
  analyzeCustomPromptContent: '',
  analyzeCustomSystemInstructionContent: '',
  explainPromptSelection: false,
  explainCustomPromptContent: '',
  explainCustomSystemInstructionContent: '',
  debatePromptSelection: false,
  debateCustomPromptContent: '',
  debateCustomSystemInstructionContent: '',
  // Custom Action Prompts - YouTube Comment
  commentPromptSelection: false,
  commentCustomPromptContent: '',
  commentCustomSystemInstructionContent: '',

  // Chat (Phase 6A). This is deliberately separate from summary tone and
  // prompt templates: it contains stable, conversation-level instructions.
  chatGlobalPersona: {
    content: '',
    language: null,
    tone: null,
    version: 1,
  },
  chatUserSkills: [],
  chatSkillMigrationVersion: 0,

  // Advanced Mode (from former stores)
  isAdvancedMode: false,

  // Tools Configuration
  tools: {
    deepDive: {
      enabled: true,
      useGeminiBasic: true,
      customProvider: 'gemini',
      customModel: 'gemma-4-26b-a4b-it',
      autoGenerate: true,
      defaultChatProvider: 'gemini',
      reasoningLevel: 'off',
    },
    cloudSync: {
      enabled: true, // Default enabled for backward compatibility
    },
  },
  summarize: {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    reasoningLevel: 'off',
  },
  chat: {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    defaultReasoningLevel: 'provider-default',
    quickModels: [],
  },

  // Added Providers ("Add provider" flow)
  addedProviders: ['gemini'],

  openaiCompatibleProfiles: [],

  // Metadata
  lastModified: 0,
}

// --- State ---
export let settings = $state({ ...DEFAULT_SETTINGS })
let _isInitializedPromise = null
let _isSyncingFromCloud = false // Flag to prevent sync loop when applying cloud settings

// Register with settings port to break lib -> store dependency.
// `setSettingsObject` runs synchronously at module load so that synchronous
// readers in lib/ (e.g. the transitions in lib/utils/slideScaleFade.js) see
// DEFAULT_SETTINGS immediately instead of `undefined` until the first
// `ensureSettingsLoaded()` await. `settings` is only ever mutated in place, so
// this reference stays live.
setSettingsObject(settings)
setSettingsProvider(async () => {
  await loadSettings()
  return settings
})
setSettingsWriter((patch) => updateSettings(patch))

// --- Helper Functions ---

/**
 * Migrates deprecated Gemini model names to their current equivalents
 * @param {Object} settings - Settings object to migrate
 * @returns {boolean} - True if any migration was performed
 */
function migrateDeprecatedGeminiModels(settings) {
  const OLD_MODEL = 'gemini-2.5-flash-lite-preview-06-17'
  const NEW_MODEL = 'gemini-2.5-flash-lite'
  let migrated = false

  // Migrate selectedGeminiModel
  if (settings.selectedGeminiModel === OLD_MODEL) {
    settings.selectedGeminiModel = NEW_MODEL
    migrated = true
  }

  // Migrate selectedGeminiAdvancedModel
  if (settings.selectedGeminiAdvancedModel === OLD_MODEL) {
    settings.selectedGeminiAdvancedModel = NEW_MODEL
    migrated = true
  }

  // Migrate tools.deepDive.customModel
  if (settings.tools?.deepDive?.customModel === OLD_MODEL) {
    settings.tools.deepDive.customModel = NEW_MODEL
    migrated = true
  }

  return migrated
}

/**
 * Migrates deprecated Gemini Pro models to their current equivalents
 * @param {Object} settings - Settings object to migrate
 * @returns {boolean} - True if any migration was performed
 */
function migrateDeprecatedGeminiProModels(settings) {
  const OLD_MODEL = 'gemini-3-pro-preview'
  const NEW_MODEL = 'gemini-3.1-pro-preview'
  let migrated = false

  // Migrate selectedGeminiAdvancedModel
  if (settings.selectedGeminiAdvancedModel === OLD_MODEL) {
    console.log(`[settingsStore] Migration: ${OLD_MODEL} -> ${NEW_MODEL}`)
    settings.selectedGeminiAdvancedModel = NEW_MODEL
    migrated = true
  }

  // Migrate selectedGeminiModel
  if (settings.selectedGeminiModel === OLD_MODEL) {
    console.log(`[settingsStore] Migration: ${OLD_MODEL} -> ${NEW_MODEL}`)
    settings.selectedGeminiModel = NEW_MODEL
    migrated = true
  }

  return migrated
}

/**
 * Replaces DeepSeek's retired compatibility aliases everywhere they can be
 * persisted in settings. Both aliases previously routed to V4 Flash; thinking
 * mode is controlled independently by the feature reasoning setting.
 *
 * @param {Object} settings - Settings object to migrate
 * @returns {boolean} - True if any migration was performed
 */
function migrateDeprecatedDeepSeekModels(settings) {
  const deprecatedModels = new Set(['deepseek-chat', 'deepseek-reasoner'])
  const newModel = 'deepseek-v4-flash'
  let migrated = false

  if (deprecatedModels.has(settings.selectedDeepseekModel)) {
    settings.selectedDeepseekModel = newModel
    migrated = true
  }

  for (const feature of [settings.summarize, settings.chat]) {
    if (feature?.provider === 'deepseek' && deprecatedModels.has(feature.model)) {
      feature.model = newModel
      migrated = true
    }
  }

  if (
    settings.tools?.deepDive?.customProvider === 'deepseek' &&
    deprecatedModels.has(settings.tools.deepDive.customModel)
  ) {
    settings.tools.deepDive.customModel = newModel
    migrated = true
  }

  if (Array.isArray(settings.chat?.quickModels)) {
    settings.chat.quickModels = settings.chat.quickModels.map((quickModel) => {
      if (
        quickModel?.provider === 'deepseek' &&
        deprecatedModels.has(quickModel.model)
      ) {
        migrated = true
        return { ...quickModel, model: newModel }
      }
      return quickModel
    })
  }

  if (migrated) {
    console.log(`[settingsStore] Migration: DeepSeek legacy aliases -> ${newModel}`)
  }
  return migrated
}

/**
 * Migrates deprecated 'alien' tone to 'witty'
 * @param {Object} settings - Settings object to migrate
 * @returns {boolean} - True if any migration was performed
 */
function migrateDeprecatedTone(settings) {
  if (settings.summaryTone === 'alien') {
    console.log("[settingsStore] Migration: 'alien' tone -> 'witty'")
    settings.summaryTone = 'witty'
    return true
  }
  return false
}

/**
 * Migrates Deep Dive Questions default model to gemma-4-26b-a4b-it
 * Handles migration from both gemini-2.5-flash-lite and deprecated gemma-3-27b-it
 * @param {Object} settings - Settings object to migrate
 * @returns {boolean} - True if migration was performed
 */
function migrateDeepDiveModel(settings) {
  const OLD_MODELS = ['gemini-2.5-flash-lite', 'gemma-3-27b-it']
  const NEW_MODEL = 'gemma-4-26b-a4b-it'
  
  if (OLD_MODELS.includes(settings.tools?.deepDive?.customModel)) {
    console.log(`[settingsStore] Migration: Upgrading Deep Dive model from ${settings.tools.deepDive.customModel} to ${NEW_MODEL}`)
    settings.tools.deepDive.customModel = NEW_MODEL
    return true
  }
  
  return false
}

/**
 * Converts fabDomainWhitelist from object format to array format
 * @param {Object|Array} whitelist - The whitelist data
 * @returns {Array} - Array of domain strings
 */
function normalizeFabWhitelist(whitelist) {
  if (Array.isArray(whitelist)) {
    return whitelist
  }

  if (typeof whitelist === 'object' && whitelist !== null) {
    // Convert object format {"0": "youtube.com", "1": "coursera.org"} to array
    return Object.values(whitelist).filter(
      (domain) => typeof domain === 'string'
    )
  }

  // Return default domains if invalid format
  return ['youtube.com', 'coursera.org', 'udemy.com']
}

/**
 * Migrates feature model settings if they are absent.
 * If the incoming payload is full and missing `summarize`, it treats it as legacy data
 * and derives the blocks from legacy keys.
 *
 * @param {Object} cleanStoredSettings - Clean settings object
 * @param {boolean} isSummarizeAbsent - Whether the summarize block was absent before default-merging
 * @param {boolean} isChatAbsent - Whether the chat block was absent before default-merging
 * @returns {Object} - Migrated settings object
 */
function migrateFeatureModelSettings(cleanStoredSettings, isSummarizeAbsent, isChatAbsent) {
  const settings = cleanStoredSettings

  // If summarize block is absent, derive it from legacy keys
  if (isSummarizeAbsent) {
    let provider = 'gemini'
    let model = settings.selectedGeminiModel || 'gemini-3-flash-preview'

    if (settings.isAdvancedMode === true) {
      if (settings.selectedProvider === 'gemini') {
        provider = 'gemini'
        model = settings.selectedGeminiModel || 'gemini-3-flash-preview'
      } else {
        provider = normalizeProviderId(settings.selectedProvider)
        model = getLegacyModel(provider, settings) || getDefaultModel(provider, settings) || 'gemini-3-flash-preview'
      }
    }

    settings.summarize = {
      ...(settings.summarize || {}),
      provider,
      model,
    }
    console.log('[settingsStore] Migration: Derived summarize block:', settings.summarize)
  }

  // If chat block is absent, derive it from the same logic (chat follows the global provider today)
  if (isChatAbsent) {
    let provider = 'gemini'
    let model = settings.selectedGeminiModel || 'gemini-3-flash-preview'

    if (settings.isAdvancedMode === true) {
      if (settings.selectedProvider === 'gemini') {
        provider = 'gemini'
        model = settings.selectedGeminiModel || 'gemini-3-flash-preview'
      } else {
        provider = normalizeProviderId(settings.selectedProvider)
        model = getLegacyModel(provider, settings) || getDefaultModel(provider, settings) || 'gemini-3-flash-preview'
      }
    }

    settings.chat = {
      provider,
      model,
      defaultReasoningLevel: 'provider-default',
      quickModels: [],
    }
    console.log('[settingsStore] Migration: Derived chat block:', settings.chat)
  }

  return settings
}

/**
 * Normalizes and migrates raw settings objects entering the extension.
 * Routes every full-object ingress path.
 *
 * @param {Object} rawSettings - Raw settings object
 * @returns {Object} - Normalized and migrated settings object
 */
export function normalizeStoredSettings(rawSettings) {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return { ...DEFAULT_SETTINGS }
  }

  // 0. Migrate legacy geminiAdvanced keys BEFORE sanitize strips them
  const migratedSettings = migrateLegacyGeminiAdvanced(rawSettings)

  // 1. Sanitize the settings object
  let cleanSettings = sanitizeSettings(migratedSettings)

  // 2. Determine if the summarize or chat blocks are absent *before* deep-merging defaults.
  // Test `provider`, not the block itself: migrateLegacyGeminiAdvanced synthesises a
  // `summarize` block to carry the migrated reasoning level, and a block holding only
  // that level must still be treated as absent so the legacy provider/model derivation
  // in step 4 still runs.
  const isSummarizeAbsent = cleanSettings.summarize?.provider === undefined
  const isChatAbsent = cleanSettings.chat?.provider === undefined

  // 3. Deep-merge of the summarize and chat blocks with defaults
  if (!isSummarizeAbsent) {
    cleanSettings.summarize = {
      ...DEFAULT_SETTINGS.summarize,
      ...cleanSettings.summarize,
    }
  }
  if (!isChatAbsent) {
    cleanSettings.chat = {
      ...DEFAULT_SETTINGS.chat,
      ...cleanSettings.chat,
    }
  }

  // 4. Migrate feature model settings
  cleanSettings = migrateFeatureModelSettings(cleanSettings, isSummarizeAbsent, isChatAbsent)

  // 5. Seed addedProviders if absent (migration for existing users)
  if (cleanSettings.addedProviders === undefined) {
    const configuredIds = listConfiguredProviders(cleanSettings).map(p => p.id)
    const seeded = ['gemini', ...configuredIds.filter(id => id !== 'gemini')]
    cleanSettings.addedProviders = seeded
    console.log('[settingsStore] Migration: Seeded addedProviders:', seeded)
  }

  // 6. Migrate and normalize openaiCompatibleProfiles
  let profiles = cleanSettings.openaiCompatibleProfiles;
  if (profiles === undefined) {
    const legacyKey = cleanSettings.openaiCompatibleApiKey || '';
    const legacyUrl = cleanSettings.openaiCompatibleBaseUrl || '';
    const legacyModel = cleanSettings.selectedOpenAICompatibleModel || '';
    const hasAddedLegacy = Array.isArray(cleanSettings.addedProviders) && cleanSettings.addedProviders.includes('openaiCompatible');

    if (legacyKey.trim() || legacyUrl.trim() || legacyModel.trim() || hasAddedLegacy) {
      profiles = [{
        id: 'openai-compatible-legacy',
        name: 'OpenAI Compatible',
        baseUrl: legacyUrl.trim(),
        apiKey: legacyKey.trim(),
        defaultModel: legacyModel.trim()
      }];
      console.log('[settingsStore] Migration: Created legacy OpenAI Compatible profile from flat fields');
    } else {
      profiles = [];
    }
  }
  cleanSettings.openaiCompatibleProfiles = normalizeProfiles(profiles);

  // 7. Reference Migration: Replace 'openaiCompatible' with 'openai-compatible-legacy' if it exists in profiles
  const hasLegacyProfile = (cleanSettings.openaiCompatibleProfiles || []).some(p => p.id === 'openai-compatible-legacy')
  if (hasLegacyProfile) {
    // 7.1. Repair summarize
    if (cleanSettings.summarize?.provider === 'openaiCompatible') {
      cleanSettings.summarize.provider = 'openai-compatible-legacy'
      if (!cleanSettings.summarize.model && cleanSettings.selectedOpenAICompatibleModel) {
        cleanSettings.summarize.model = cleanSettings.selectedOpenAICompatibleModel
      }
    }

    // 7.2. Repair chat
    if (cleanSettings.chat?.provider === 'openaiCompatible') {
      cleanSettings.chat.provider = 'openai-compatible-legacy'
      if (!cleanSettings.chat.model && cleanSettings.selectedOpenAICompatibleModel) {
        cleanSettings.chat.model = cleanSettings.selectedOpenAICompatibleModel
      }
    }
    // 7.3. Repair deepDive
    if (cleanSettings.tools?.deepDive?.customProvider === 'openaiCompatible') {
      cleanSettings.tools.deepDive.customProvider = 'openai-compatible-legacy'
      if (!cleanSettings.tools.deepDive.customModel && cleanSettings.selectedOpenAICompatibleModel) {
        cleanSettings.tools.deepDive.customModel = cleanSettings.selectedOpenAICompatibleModel
      }
    }

    // 7.4. Repair quickModels
    if (Array.isArray(cleanSettings.chat?.quickModels)) {
      cleanSettings.chat.quickModels = cleanSettings.chat.quickModels.map(qm => {
        if (qm.provider === 'openaiCompatible') {
          return { ...qm, provider: 'openai-compatible-legacy' }
        }
        return qm
      })
    }

    // 7.5. Remove static 'openaiCompatible' from addedProviders
    if (Array.isArray(cleanSettings.addedProviders)) {
      cleanSettings.addedProviders = cleanSettings.addedProviders.filter(id => id !== 'openaiCompatible')
    }
  }

  // 8. DeepSeek V4 renamed the public API models and is retiring the old
  // deepseek-chat/deepseek-reasoner compatibility aliases.
  migrateDeprecatedDeepSeekModels(cleanSettings)

  return cleanSettings
}

/**
 * Applies mirrors from summarize settings block changes to legacy keys.
 *
 * @param {Object} patch - The settings patch to apply
 * @returns {Object} - The extended patch containing mirrored values
 */
export function applyFeatureModelMirrors(patch) {
  if (!patch || !patch.summarize) {
    return patch
  }

  const { provider: providerId, model } = patch.summarize

  if (isOpenAICompatibleProfileId(providerId)) {
    const profile = findProfileById(patch.openaiCompatibleProfiles || settings.openaiCompatibleProfiles, providerId)
    if (profile) {
      patch.openaiCompatibleApiKey = profile.apiKey
      patch.openaiCompatibleBaseUrl = profile.baseUrl
      patch.selectedOpenAICompatibleModel = model
      patch.selectedProvider = 'openaiCompatible'
      patch.isAdvancedMode = true
      patch.isSummaryAdvancedMode = true
    }
  } else {
    const provider = getProvider(providerId)
    if (provider) {
      // Determine adapterId and legacyModelField
      const adapterId = provider.adapterId
      const legacyModelField = provider.legacyModelField

      // Apply mirroring rules
      if (providerId === 'gemini') {
        patch.selectedProvider = 'gemini'
        // leave isAdvancedMode untouched
      } else {
        patch.selectedProvider = adapterId
        patch.isAdvancedMode = true
        patch.isSummaryAdvancedMode = true
      }

      if (legacyModelField) {
        patch[legacyModelField] = model
      }
    }
  }

  return patch
}

// --- Actions ---

/**
 * Loads settings from storage. If no settings are found, it initializes
 * the storage with the default values.
 */
export async function loadSettings() {
  if (_isInitializedPromise) {
    return _isInitializedPromise
  }

  _isInitializedPromise = (async () => {
    try {
      const storedSettings = await settingsStorage.getValue()
      if (storedSettings && Object.keys(storedSettings).length > 0) {
        // ✅ MIGRATION: Clean nested structure and invalid keys
        // Remove metadata, theme, and nested settings keys
        const invalidKeys = ['metadata', 'theme', 'settings']
        invalidKeys.forEach((key) => {
          if (storedSettings[key] !== undefined) {
            console.log(
              `[settingsStore] Migration: Removing invalid key "${key}" from storage`
            )
            delete storedSettings[key]
          }
        })

        // ✅ MIGRATION: Normalize stored settings (including sanitize, merge, and feature block migration)
        const cleanStoredSettings = normalizeStoredSettings(storedSettings)

        // ✅ MIGRATION: Migrate deprecated Gemini model names
        migrateDeprecatedGeminiModels(cleanStoredSettings)

        // ✅ MIGRATION: Migrate deprecated Gemini model names
        migrateDeprecatedGeminiModels(cleanStoredSettings)
        
        // ✅ MIGRATION: Migrate deprecated Gemini Pro models
        migrateDeprecatedGeminiProModels(cleanStoredSettings)
        
        // ✅ MIGRATION: Migrate 'alien' tone to 'witty'
        migrateDeprecatedTone(cleanStoredSettings)

        // Handle migration from old fabDomainPermissions to new fabDomainControl format
        if (
          cleanStoredSettings.fabDomainPermissions &&
          !cleanStoredSettings.fabDomainControl
        ) {
          const mode = cleanStoredSettings.fabDomainPermissions.enabled
            ? 'whitelist'
            : 'all'
          const whitelist = normalizeFabWhitelist(
            cleanStoredSettings.fabDomainPermissions.whitelist
          )
          cleanStoredSettings.fabDomainControl = {
            mode,
            whitelist,
            blacklist: [],
          }
          delete cleanStoredSettings.fabDomainPermissions // Remove old key
        }

        // Handle migration from fabDomainPermissionsEnabled + fabDomainWhitelist to fabDomainControl
        if (
          (cleanStoredSettings.fabDomainPermissionsEnabled !== undefined ||
            cleanStoredSettings.fabDomainWhitelist !== undefined) &&
          !cleanStoredSettings.fabDomainControl
        ) {
          const mode = cleanStoredSettings.fabDomainPermissionsEnabled
            ? 'whitelist'
            : 'all'
          const whitelist =
            normalizeFabWhitelist(cleanStoredSettings.fabDomainWhitelist) || []
          cleanStoredSettings.fabDomainControl = {
            mode,
            whitelist,
            blacklist: [],
          }
          delete cleanStoredSettings.fabDomainPermissionsEnabled // Remove old key
          delete cleanStoredSettings.fabDomainWhitelist // Remove old key
        }

        // Ensure fabDomainControl has proper structure
        if (cleanStoredSettings.fabDomainControl) {
          const { mode, whitelist, blacklist } =
            cleanStoredSettings.fabDomainControl
          cleanStoredSettings.fabDomainControl = {
            mode: mode || 'all',
            whitelist: normalizeFabWhitelist(whitelist) || [],
            blacklist: normalizeFabWhitelist(blacklist) || [],
          }
        }

        // ============================================
        // TOOLS MIGRATION (NEW)
        // ============================================

        // If tools object doesn't exist, initialize it
        if (!cleanStoredSettings.tools) {
          console.log('[settingsStore] Migration: Adding tools configuration')
          cleanStoredSettings.tools = DEFAULT_SETTINGS.tools
        } else {
          // If tools exists but is missing some tools, merge with defaults
          cleanStoredSettings.tools = {
            ...DEFAULT_SETTINGS.tools,
            ...cleanStoredSettings.tools,
          }

          // Ensure each tool has all required fields
          Object.keys(DEFAULT_SETTINGS.tools).forEach((toolName) => {
            if (!cleanStoredSettings.tools[toolName]) {
              console.log(
                `[settingsStore] Migration: Adding ${toolName} tool config`
              )
              cleanStoredSettings.tools[toolName] =
                DEFAULT_SETTINGS.tools[toolName]
            } else {
              // Merge tool settings with defaults to ensure all fields exist
              cleanStoredSettings.tools[toolName] = {
                ...DEFAULT_SETTINGS.tools[toolName],
                ...cleanStoredSettings.tools[toolName],
              }
            }
          })
        }

        // Tab behavior is now fixed by surface: Summary resets on navigation,
        // while Chat keeps its per-tab conversation. Drop the legacy toggle.
        delete cleanStoredSettings.tools.perTabCache

        // ✅ MIGRATION: Upgrade Deep Dive model to gemma-4-26b-a4b-it
        migrateDeepDiveModel(cleanStoredSettings)

        // Keep legacy prompt settings intact while exposing customized pairs
        // as compact chat skills. The migration also removes deprecated skill
        // fields and is idempotent across every settings initialization.
        const { migrateLegacyPromptsToSkills } = await import(
          '@/lib/chat/skills/skillMigration.js'
        )
        const skillMigration = migrateLegacyPromptsToSkills(cleanStoredSettings)
        Object.assign(cleanStoredSettings, skillMigration.settings)

        // MIGRATION: Split geminiApiKeys into geminiApiKey + geminiAdditionalApiKeys
        if (cleanStoredSettings.geminiApiKeys && cleanStoredSettings.geminiApiKeys.length > 0) {
          console.log('[settingsStore] Migration: Splitting geminiApiKeys into main + additional')
          
          // If main key is empty or not set, take the first one from the array
          if (!cleanStoredSettings.geminiApiKey) {
             cleanStoredSettings.geminiApiKey = cleanStoredSettings.geminiApiKeys[0] || ''
          }
          
          // The rest go into additional keys
          // Filter out the one we just used as main key if needed, or just take rest
          // Better logic: Take ALL distinct keys, remove the main key from the list
          const allKeys = [...cleanStoredSettings.geminiApiKeys]
          const mainKey = cleanStoredSettings.geminiApiKey
          
          const additionalKeys = allKeys.filter(k => k !== mainKey && k.trim() !== '')
          cleanStoredSettings.geminiAdditionalApiKeys = additionalKeys
          
          // Clear the old array
          cleanStoredSettings.geminiApiKeys = []
        }

        if (
          cleanStoredSettings.geminiApiKey &&
          (!cleanStoredSettings.geminiApiKeys ||
            cleanStoredSettings.geminiApiKeys.length === 0)
        ) {
           // Legacy check - no longer needed if we use the logic above, but keeping for safety
           // If we have a single key but no array, it's fine.
        }

        // Merge settings with defaults
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...cleanStoredSettings,
        }
        
        Object.assign(settings, mergedSettings)

        // ✅ MIGRATION: Save cleaned settings back to storage
        await settingsStorage.setValue(
          JSON.parse(JSON.stringify(mergedSettings))
        )
      } else {
        // No settings in storage, so initialize it with defaults
        await settingsStorage.setValue(DEFAULT_SETTINGS)
        Object.assign(settings, DEFAULT_SETTINGS)
      }
    } catch (error) {
      console.error('[settingsStore] Error loading settings:', error)
      Object.assign(settings, DEFAULT_SETTINGS) // Fallback to defaults
    }

    // Resolve to the live store object. Without this the promise resolved to
    // `undefined`, which silently disabled every `await loadSettings()` caller
    // that checked the result (see background/settingsBootstrap.js).
    return settings
  })()

  return _isInitializedPromise
}

/**
 * Forces a reload of settings from storage, bypassing the cache
 */
export async function forceReloadSettings() {
  _isInitializedPromise = null
  return await loadSettings()
}

/**
 * Updates one or more settings and saves the entire settings object to storage.
 * @param {Partial<typeof DEFAULT_SETTINGS>} newSettings
 */
export async function updateSettings(newSettings, options = {}) {
  if (!_isInitializedPromise) {
    await loadSettings() // Ensure store is loaded before updating
  }
  await _isInitializedPromise

  // Apply feature model mirrors if patch contains summarize
  if (newSettings && newSettings.summarize) {
    newSettings = applyFeatureModelMirrors(newSettings)
  }

  // `isFullIngress` runs the payload through normalizeStoredSettings, whose
  // migration steps treat every *absent* key as "never migrated" and re-seed it
  // from defaults. That is only correct for a COMPLETE settings object (cloud
  // sync ingress); handing it a partial patch silently resets addedProviders,
  // openaiCompatibleProfiles and the summarize/chat blocks.
  const isFullIngress = options.isFullIngress === true
  // Suppressing the sync round-trip is a separate concern from full ingress —
  // internal caching writes need the former without the latter.
  const skipSync = options.skipSync === true || _isSyncingFromCloud

  // ✅ FIX: Sanitize input hoặc normalizeStoredSettings nếu là full ingress
  const cleanNewSettings = isFullIngress
    ? normalizeStoredSettings(newSettings)
    : sanitizeSettings(newSettings)

  // Read current values from storage to compare (settings object may already be mutated by bind:value)
  const storedSettings = await settingsStorage.getValue()

  // Check if any setting actually changed (excluding lastModified)
  let hasActualChanges = false
  for (const [key, newValue] of Object.entries(cleanNewSettings)) {
    if (key === 'lastModified') continue
    const storedValue = storedSettings?.[key]
    if (JSON.stringify(storedValue) !== JSON.stringify(newValue)) {
      hasActualChanges = true
      break
    }
  }

  // If no actual changes, skip saving and syncing
  if (!hasActualChanges) {
    return
  }

  // Update lastModified timestamp if not explicitly provided (e.g. by sync)
  if (!cleanNewSettings.lastModified) {
    cleanNewSettings.lastModified = Date.now()
  }

  // Create a new object with the updates applied
  // ✅ FIX: Sanitize current settings để đảm bảo không có invalid keys
  const cleanCurrentSettings = sanitizeSettings(settings)
  const updatedSettings = { ...cleanCurrentSettings, ...cleanNewSettings }

  // Update the local state
  Object.assign(settings, updatedSettings)

  // If uiLang is updated, also update the i18n locale
  if (cleanNewSettings.uiLang) {
    locale.set(cleanNewSettings.uiLang)
  }

  try {
    // Save the entire updated settings object back to storage
    // Convert Svelte Proxy to a plain JS object before saving to prevent DataCloneError
    await settingsStorage.setValue(JSON.parse(JSON.stringify(updatedSettings)))
    
    // Trigger cloud sync after settings change (unless syncing from cloud)
    if (!skipSync) {
      console.log('[settingsStore] Triggering cloud sync after settings change...')
      try {
        const { triggerSync } = await import(
          '@/services/cloudSync/cloudSyncService.svelte.js'
        )
        console.log('[settingsStore] triggerSync imported, calling...')
        triggerSync()
      } catch (syncError) {
        console.warn('[settingsStore] Failed to trigger sync:', syncError)
      }
    } else {
      console.log('[settingsStore] Skipping sync - syncing from cloud')
    }
  } catch (error) {
    console.error('[settingsStore] Error saving settings:', error)
  }
}

/**
 * Updates settings from cloud sync without triggering another sync.
 * This prevents the sync loop problem.
 * @param {Partial<typeof DEFAULT_SETTINGS>} newSettings
 */
export async function updateSettingsFromCloud(newSettings) {
  _isSyncingFromCloud = true
  try {
    await updateSettings(newSettings, { isFullIngress: true })
  } finally {
    _isSyncingFromCloud = false
  }
}

/**
 * Subscribes to changes in storage and updates the local state.
 */
export function subscribeToSettingsChanges() {
  return settingsStorage.watch((newValue, oldValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(settings)) {
      // Handle migration from old formats to fabDomainControl
      if (
        (newValue.fabDomainPermissions ||
          newValue.fabDomainPermissionsEnabled !== undefined ||
          newValue.fabDomainWhitelist !== undefined) &&
        !newValue.fabDomainControl
      ) {
        let mode = 'all'
        let whitelist = []

        if (newValue.fabDomainPermissions) {
          mode = newValue.fabDomainPermissions.enabled ? 'whitelist' : 'all'
          whitelist =
            normalizeFabWhitelist(newValue.fabDomainPermissions.whitelist) || []
          delete newValue.fabDomainPermissions
        } else if (newValue.fabDomainPermissionsEnabled !== undefined) {
          mode = newValue.fabDomainPermissionsEnabled ? 'whitelist' : 'all'
          whitelist = normalizeFabWhitelist(newValue.fabDomainWhitelist) || []
          delete newValue.fabDomainPermissionsEnabled
          delete newValue.fabDomainWhitelist
        }

        newValue.fabDomainControl = {
          mode,
          whitelist,
          blacklist: [],
        }
      }

      // Ensure fabDomainControl has proper structure
      if (newValue.fabDomainControl) {
        const { mode, whitelist, blacklist } = newValue.fabDomainControl
        newValue.fabDomainControl = {
          mode: mode || 'all',
          whitelist: normalizeFabWhitelist(whitelist) || [],
          blacklist: normalizeFabWhitelist(blacklist) || [],
        }
      }

      const normalized = normalizeStoredSettings(newValue)

      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...normalized,
      }
      Object.assign(settings, mergedSettings)
      if (newValue.uiLang && newValue.uiLang !== get(locale)) {
        locale.set(newValue.uiLang)
      }
    }
  })
}

// --- Firefox Permission Management Functions ---

/**
 * Permission check cache để tránh redundant API calls
 */
let permissionCheckCache = new Map()
const CACHE_DURATION = 5000 // 5 seconds

/**
 * Updates Firefox permission state and saves to storage
 * @param {string} permissionKey - Key for the permission (e.g., 'httpsPermission')
 * @param {boolean} value - Permission state value
 */
export async function updateFirefoxPermission(permissionKey, value) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  const newPermissions = {
    ...settings.firefoxPermissions,
    [permissionKey]: value,
    lastChecked: Date.now(),
  }

  // Update cache
  permissionCheckCache.set(permissionKey, {
    value,
    timestamp: Date.now(),
  })

  // Skip the sync round-trip (this is internal caching, not a user-initiated
  // change) but stay on the normal *patch* path. Routing this one-key payload
  // through updateSettingsFromCloud marked it as full ingress, which re-seeded
  // addedProviders to ['gemini'] and cleared openaiCompatibleProfiles every
  // time a permission was checked — Firefox-only, since this is the only
  // caller of that path outside real cloud sync.
  await updateSettings({ firefoxPermissions: newPermissions }, { skipSync: true })
}

/**
 * Gets Firefox permission state from settings
 * @param {string} permissionKey - Key for the permission
 * @returns {boolean} - Permission state
 */
export function getFirefoxPermission(permissionKey) {
  return settings.firefoxPermissions?.[permissionKey] || false
}

/**
 * Checks if permission cache is still valid
 * @param {string} permissionKey - Key for the permission
 * @returns {Object|null} - Cached permission object or null if invalid/expired
 */
export function getCachedPermission(permissionKey) {
  const cached = permissionCheckCache.get(permissionKey)
  if (!cached) return null

  const now = Date.now()
  if (now - cached.timestamp > CACHE_DURATION) {
    permissionCheckCache.delete(permissionKey)
    return null
  }

  return cached
}

/**
 * Clears permission cache for a specific key or all keys
 * @param {string} [permissionKey] - Optional specific key to clear
 */
export function clearPermissionCache(permissionKey = null) {
  if (permissionKey) {
    permissionCheckCache.delete(permissionKey)
  } else {
    permissionCheckCache.clear()
  }
}

// --- Tool Settings Helper Functions ---

/**
 * Updates a specific tool's settings
 * @param {string} toolName - Name of the tool
 * @param {Object} updates - Settings to update
 */
export async function updateToolSettings(toolName, updates) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  if (!settings.tools[toolName]) {
    console.error(`[settingsStore] Tool "${toolName}" not found`)
    return
  }

  const updatedTools = {
    ...settings.tools,
    [toolName]: {
      ...settings.tools[toolName],
      ...updates,
    },
  }

  await updateSettings({ tools: updatedTools })
}

/**
 * Gets a specific tool's settings
 * @param {string} toolName - Name of the tool
 * @returns {Object|null} Tool settings or null if not found
 */
export function getToolSettings(toolName) {
  return settings.tools?.[toolName] || null
}

/**
 * Checks if a tool is enabled
 * @param {string} toolName - Name of the tool
 * @returns {boolean} True if tool is enabled
 */
export function isToolEnabled(toolName) {
  return settings.tools?.[toolName]?.enabled || false
}

/**
 * Updates a specific feature's settings block (e.g. summarize or chat).
 * Spreads the current block, applies the patch, and writes the whole block.
 *
 * @param {string} feature - Name of the feature ('summarize' or 'chat')
 * @param {Object} updates - Settings patch to apply to the feature block
 */
export async function updateFeatureSettings(feature, updates) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  if (!settings[feature]) {
    console.error(`[settingsStore] Feature "${feature}" settings block not found`)
    return
  }

  const updatedFeature = {
    ...settings[feature],
    ...updates,
  }

  await updateSettings({ [feature]: updatedFeature })
}

// --- Added Provider Management ---

/**
 * Adds a provider to the addedProviders list (dedupe-append).
 * @param {string} id - Provider ID to add
 */
export async function addProvider(id) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  const current = settings.addedProviders || ['gemini']
  if (current.includes(id)) return // Already added

  await updateSettings({ addedProviders: [...current, id] })
}

/**
 * Removes a provider from the addedProviders list.
 * Gemini cannot be removed. Does NOT clear the provider's API key (non-destructive).
 * @param {string} id - Provider ID to remove
 */
export async function removeProvider(id) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  if (id === 'gemini') return // Never remove Gemini

  const current = settings.addedProviders || ['gemini']
  await updateSettings({ addedProviders: current.filter(p => p !== id) })
}

export function getFallbackProviderSelection() {
  const configured = (settings.addedProviders || [])
    .filter(pId => pId !== 'openaiCompatible')
    .filter(pId => isProviderConfigured(pId, settings))
  if (configured.length > 0) {
    const fallbackId = configured[0]
    const fallbackModel = getDefaultModel(fallbackId, settings) || 'gemini-3-flash-preview'
    return { provider: fallbackId, model: fallbackModel }
  }
  return { provider: 'gemini', model: 'gemini-3-flash-preview' }
}

/**
 * Adds a new OpenAI-compatible profile.
 * @param {Object} [initialValues] - Optional initial profile values
 * @returns {Promise<string>} - The created profile ID
 */
export async function addOpenAICompatibleProfile(initialValues = {}) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  const id = generateProfileId()
  const name = initialValues.name && initialValues.name.trim().length > 0
    ? initialValues.name.trim()
    : getNextDefaultName(settings.openaiCompatibleProfiles || [])

  const newProfile = {
    id,
    name,
    baseUrl: typeof initialValues.baseUrl === 'string' ? initialValues.baseUrl.trim() : '',
    apiKey: typeof initialValues.apiKey === 'string' ? initialValues.apiKey.trim() : '',
    defaultModel: typeof initialValues.defaultModel === 'string' ? initialValues.defaultModel.trim() : '',
  }

  const updatedProfiles = [...(settings.openaiCompatibleProfiles || []), newProfile]
  await updateSettings({ openaiCompatibleProfiles: updatedProfiles })
  return id
}

/**
 * Updates an OpenAI-compatible profile.
 * @param {string} id - Profile ID to update
 * @param {Object} patch - Profile patch containing allowed fields
 */
export async function updateOpenAICompatibleProfile(id, patch) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  const currentProfiles = settings.openaiCompatibleProfiles || []
  const updatedProfiles = currentProfiles.map(p => {
    if (p.id === id) {
      const updated = { ...p }
      if (patch.name !== undefined) updated.name = patch.name.trim()
      if (patch.baseUrl !== undefined) updated.baseUrl = patch.baseUrl.trim()
      if (patch.apiKey !== undefined) updated.apiKey = patch.apiKey.trim()
      if (patch.defaultModel !== undefined) updated.defaultModel = patch.defaultModel.trim()
      return updated
    }
    return p
  })

  const updates = { openaiCompatibleProfiles: updatedProfiles }

  // If this profile is selected by Summary, refresh mirrors atomically
  if (settings.summarize?.provider === id) {
    const profile = updatedProfiles.find(p => p.id === id)
    if (profile) {
      updates.openaiCompatibleApiKey = profile.apiKey
      updates.openaiCompatibleBaseUrl = profile.baseUrl
      updates.selectedOpenAICompatibleModel = settings.summarize.model
    }
  }

  await updateSettings(updates)
}

/**
 * Removes an OpenAI-compatible profile and repairs references.
 * @param {string} id - Profile ID to remove
 */
export async function removeOpenAICompatibleProfile(id) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  const currentProfiles = settings.openaiCompatibleProfiles || []
  const updatedProfiles = currentProfiles.filter(p => p.id !== id)

  const updates = { openaiCompatibleProfiles: updatedProfiles }

  if (id === 'openai-compatible-legacy') {
    updates.openaiCompatibleApiKey = ''
    updates.openaiCompatibleBaseUrl = ''
    updates.selectedOpenAICompatibleModel = ''
  }

  let fallback = null
  const getFallback = () => {
    if (!fallback) fallback = getFallbackProviderSelection()
    return fallback
  }

  // Repair summarize
  if (settings.summarize?.provider === id) {
    updates.summarize = getFallback()
  }

  // Repair chat
  if (settings.chat?.provider === id) {
    const f = getFallback()
    updates.chat = {
      ...settings.chat,
      provider: f.provider,
      model: f.model,
    }
  }

  // Repair tools.deepDive
  if (settings.tools?.deepDive?.customProvider === id) {
    const f = getFallback()
    updates.tools = {
      ...settings.tools,
      deepDive: {
        ...settings.tools.deepDive,
        customProvider: f.provider,
        customModel: f.model,
      },
    }
  }

  // Repair quickModels
  if (Array.isArray(settings.chat?.quickModels)) {
    const updatedQuickModels = settings.chat.quickModels.filter(qm => qm.provider !== id)
    if (JSON.stringify(updatedQuickModels) !== JSON.stringify(settings.chat.quickModels)) {
      if (!updates.chat) {
        updates.chat = { ...settings.chat }
      }
      updates.chat.quickModels = updatedQuickModels
    }
  }

  await updateSettings(updates)
}
