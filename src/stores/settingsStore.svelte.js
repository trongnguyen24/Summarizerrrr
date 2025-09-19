// @ts-nocheck
import { locale } from 'svelte-i18n'
import {
  settingsStorage,
  apiKeysStorage,
} from '@/services/wxtStorageService.js'

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
  selectedGeminiModel: 'gemini-2.5-flash',
  geminiAdvancedApiKey: '',
  selectedGeminiAdvancedModel: 'gemini-2.5-flash',
  openaiCompatibleApiKey: '',
  openaiCompatibleBaseUrl: '',
  selectedOpenAICompatibleModel: '',
  openrouterApiKey: '',
  selectedOpenrouterModel: 'deepseek/deepseek-r1-0528:free',
  deepseekApiKey: '',
  deepseekBaseUrl: 'https://api.deepseek.com/',
  selectedDeepseekModel: 'deepseek-chat',
  chatgptApiKey: '',
  chatgptBaseUrl: 'https://api.openai.com/v1',
  selectedChatgptModel: 'gpt-5-mini',
  ollamaEndpoint: 'http://127.0.0.1:11434/',
  selectedOllamaModel: 'deepseek-r1:8b',
  lmStudioEndpoint: 'http://localhost:1234/v1',
  selectedLmStudioModel: 'lmstudio-community/gemma-2b-it-GGUF',
  groqApiKey: '',
  selectedGroqModel: 'moonshotai/kimi-k2-instruct',
  selectedFont: 'default',
  enableStreaming: true,
  uiLang: 'en',
  mobileSheetHeight: 80, // Chiều cao MobileSheet (40-100 svh)
  mobileSheetBackdropOpacity: true, // Enable backdrop opacity for MobileSheet
  fontSizeIndex: 2, // Default to prose-lg
  widthIndex: 1, // Default to max-w-3xl
  sidePanelDefaultWidth: 25, // Default width for side panel in em units
  oneClickSummarize: false, // Enable 1-click summarization on FAB
  fabDomainControl: {
    mode: 'all', // 'all' | 'whitelist' | 'blacklist'
    whitelist: ['youtube.com', 'coursera.org', 'udemy.com'],
    blacklist: [],
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

  // Advanced Mode (from former stores)
  isAdvancedMode: false,
  temperature: 0.7,
  topP: 0.9,
}

// --- State ---
export let settings = $state({ ...DEFAULT_SETTINGS })
let _isInitializedPromise = null

// --- Helper Functions ---

/**
 * List of setting keys that contain API keys (stored in local storage separately)
 */
const API_KEY_FIELDS = [
  'geminiApiKey',
  'geminiAdvancedApiKey',
  'openaiCompatibleApiKey',
  'openrouterApiKey',
  'deepseekApiKey',
  'chatgptApiKey',
  'groqApiKey',
]

/**
 * Loads API keys from local storage
 * @returns {Object} API keys object
 */
async function loadApiKeys() {
  try {
    const apiKeys = await apiKeysStorage.getValue()
    return apiKeys || {}
  } catch (error) {
    console.error('[settingsStore] Error loading API keys:', error)
    return {}
  }
}

/**
 * Saves API keys to local storage
 * @param {Object} apiKeys - The API keys object
 */
async function saveApiKeys(apiKeys) {
  try {
    await apiKeysStorage.setValue(apiKeys)
  } catch (error) {
    console.error('[settingsStore] Error saving API keys:', error)
    throw error
  }
}

/**
 * Separates API keys from settings object
 * @param {Object} settings - The settings object
 * @returns {Object} {apiKeys, settingsWithoutApiKeys}
 */
function separateApiKeys(settings) {
  const apiKeys = {}
  const settingsWithoutApiKeys = { ...settings }

  for (const field of API_KEY_FIELDS) {
    if (settings[field] !== undefined) {
      apiKeys[field] = settings[field]
      delete settingsWithoutApiKeys[field]
    }
  }

  return { apiKeys, settingsWithoutApiKeys }
}

/**
 * Merges API keys back into settings object
 * @param {Object} settings - The settings object
 * @param {Object} apiKeys - The API keys object
 * @returns {Object} Merged settings with API keys
 */
function mergeApiKeys(settings, apiKeys) {
  return { ...settings, ...apiKeys }
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
      // Load settings and API keys separately
      const storedSettings = await settingsStorage.getValue()
      const apiKeys = await loadApiKeys()

      if (storedSettings && Object.keys(storedSettings).length > 0) {
        // Handle migration from old fabDomainPermissions to new fabDomainControl format
        if (
          storedSettings.fabDomainPermissions &&
          !storedSettings.fabDomainControl
        ) {
          const mode = storedSettings.fabDomainPermissions.enabled
            ? 'whitelist'
            : 'all'
          const whitelist = normalizeFabWhitelist(
            storedSettings.fabDomainPermissions.whitelist
          )
          storedSettings.fabDomainControl = {
            mode,
            whitelist,
            blacklist: [],
          }
          delete storedSettings.fabDomainPermissions // Remove old key
        }

        // Handle migration from fabDomainPermissionsEnabled + fabDomainWhitelist to fabDomainControl
        if (
          (storedSettings.fabDomainPermissionsEnabled !== undefined ||
            storedSettings.fabDomainWhitelist !== undefined) &&
          !storedSettings.fabDomainControl
        ) {
          const mode = storedSettings.fabDomainPermissionsEnabled
            ? 'whitelist'
            : 'all'
          const whitelist =
            normalizeFabWhitelist(storedSettings.fabDomainWhitelist) || []
          storedSettings.fabDomainControl = {
            mode,
            whitelist,
            blacklist: [],
          }
          delete storedSettings.fabDomainPermissionsEnabled // Remove old key
          delete storedSettings.fabDomainWhitelist // Remove old key
        }

        // Ensure fabDomainControl has proper structure
        if (storedSettings.fabDomainControl) {
          const { mode, whitelist, blacklist } = storedSettings.fabDomainControl
          storedSettings.fabDomainControl = {
            mode: mode || 'all',
            whitelist: normalizeFabWhitelist(whitelist) || [],
            blacklist: normalizeFabWhitelist(blacklist) || [],
          }
        }

        // Remove any API keys from storedSettings (they shouldn't be there in new system)
        const { settingsWithoutApiKeys } = separateApiKeys(storedSettings)

        // Merge settings with defaults and add API keys
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...settingsWithoutApiKeys,
          ...apiKeys, // Add API keys from local storage
        }
        Object.assign(settings, mergedSettings)
      } else {
        // No settings in storage, so initialize it with defaults (without API keys)
        const { settingsWithoutApiKeys } = separateApiKeys(DEFAULT_SETTINGS)
        await settingsStorage.setValue(settingsWithoutApiKeys)

        // Merge with API keys from local storage
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...apiKeys,
        }
        Object.assign(settings, mergedSettings)
      }
    } catch (error) {
      console.error('[settingsStore] Error loading settings:', error)
      Object.assign(settings, DEFAULT_SETTINGS) // Fallback to defaults
    }
  })()

  return _isInitializedPromise
}

/**
 * Updates one or more settings and saves the entire settings object to storage.
 * @param {Partial<typeof DEFAULT_SETTINGS>} newSettings
 */
export async function updateSettings(newSettings) {
  if (!_isInitializedPromise) {
    await loadSettings() // Ensure store is loaded before updating
  }
  await _isInitializedPromise

  // Create a new object with the updates applied
  const updatedSettings = { ...settings, ...newSettings }

  // Update the local state
  Object.assign(settings, updatedSettings)

  // If uiLang is updated, also update the i18n locale
  if (newSettings.uiLang) {
    locale.set(newSettings.uiLang)
  }

  try {
    // Separate API keys from other settings
    const { apiKeys, settingsWithoutApiKeys } = separateApiKeys(updatedSettings)

    // Save API keys to local storage
    await saveApiKeys(apiKeys)

    // Save other settings to sync storage
    await settingsStorage.setValue(settingsWithoutApiKeys)
  } catch (error) {
    console.error('[settingsStore] Error saving settings:', error)
    // Re-throw to alert, but don't break UI
    throw error
  }
}

/**
 * Subscribes to changes in storage and updates the local state.
 */
export function subscribeToSettingsChanges() {
  return settingsStorage.watch(async (newValue, oldValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(settings)) {
      try {
        // Load API keys from local storage
        const apiKeys = await loadApiKeys()

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
              normalizeFabWhitelist(newValue.fabDomainPermissions.whitelist) ||
              []
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

        // Remove any API keys from newValue (they shouldn't be there)
        const { settingsWithoutApiKeys } = separateApiKeys(newValue)

        // Merge settings with API keys from local storage
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...settingsWithoutApiKeys,
          ...apiKeys,
        }
        Object.assign(settings, mergedSettings)
        if (newValue.uiLang !== settings.uiLang) {
          locale.set(newValue.uiLang)
        }
      } catch (error) {
        console.error(
          '[settingsStore] Error processing settings change:',
          error
        )
        // Fallback to using newValue directly
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...newValue,
        }
        Object.assign(settings, mergedSettings)
      }
    }
  })
}
