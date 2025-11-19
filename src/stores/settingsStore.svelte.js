// @ts-nocheck
import { get } from 'svelte/store'
import { locale } from 'svelte-i18n'
import { settingsStorage } from '@/services/wxtStorageService.js'
import { sanitizeSettings } from '@/lib/config/settingsSchema.js'

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
  iconClickAction: 'sidepanel', // 'sidepanel', 'popup', or 'floating'
  fabDomainControl: {
    mode: 'all', // 'all' | 'whitelist' | 'blacklist'
    whitelist: ['youtube.com', 'coursera.org', 'udemy.com'],
    blacklist: [],
  },

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

  // Tools Configuration
  tools: {
    deepDive: {
      enabled: true,
      useGeminiBasic: true,
      customProvider: 'gemini',
      customModel: 'gemini-2.5-flash-lite',
      autoGenerate: true,
      defaultChatProvider: 'gemini',
    },
  },
}

// --- State ---
export let settings = $state({ ...DEFAULT_SETTINGS })
let _isInitializedPromise = null

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

        // ✅ MIGRATION: Sanitize to ensure only valid keys remain
        const cleanStoredSettings = sanitizeSettings(storedSettings)

        // ✅ MIGRATION: Migrate deprecated Gemini model names
        migrateDeprecatedGeminiModels(cleanStoredSettings)

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
export async function updateSettings(newSettings) {
  if (!_isInitializedPromise) {
    await loadSettings() // Ensure store is loaded before updating
  }
  await _isInitializedPromise

  // ✅ FIX: Sanitize input để loại bỏ invalid keys (metadata, theme, nested settings)
  const cleanNewSettings = sanitizeSettings(newSettings)

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
  } catch (error) {
    console.error('[settingsStore] Error saving settings:', error)
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

      const mergedSettings = {
        ...DEFAULT_SETTINGS,
        ...newValue,
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

  await updateSettings({ firefoxPermissions: newPermissions })
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
