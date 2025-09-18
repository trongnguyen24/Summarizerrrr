// @ts-nocheck
import { locale } from 'svelte-i18n'
import { settingsStorage } from '@/services/wxtStorageService.js'
import { secretKeyService } from '@/services/secretKeyService.js'
import {
  encrypt,
  decrypt,
  validateAndSanitizeApiKey,
  isEncrypted,
} from '@/lib/utils/crypto.js'

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
 * List of setting keys that contain API keys and should be encrypted
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
 * Encrypts API key fields in a settings object
 * @param {Object} settings - The settings object
 * @param {string} secretKey - The secret key for encryption
 * @returns {Object} Settings object with encrypted API keys
 */
async function encryptApiKeys(settings, secretKey) {
  const encryptedSettings = { ...settings }

  for (const field of API_KEY_FIELDS) {
    if (
      settings[field] &&
      typeof settings[field] === 'string' &&
      settings[field].trim() !== ''
    ) {
      try {
        // Validate and sanitize the API key first
        const sanitizedKey = validateAndSanitizeApiKey(settings[field])
        // Only encrypt if it's not already encrypted
        if (!isEncrypted(sanitizedKey)) {
          const encryptedValue = await encrypt(sanitizedKey, secretKey)
          encryptedSettings[field] = encryptedValue
        } else {
          encryptedSettings[field] = sanitizedKey
        }
      } catch (error) {
        console.error(
          `[settingsStore] Failed to encrypt ${field}:`,
          error,
          'SecretKey:',
          secretKey ? 'exists' : 'missing'
        )
        // For now, keep plain but log - later throw if critical
        encryptedSettings[field] = settings[field]
      }
    } else {
    }
  }

  return encryptedSettings
}

/**
 * Decrypts API key fields in a settings object
 * @param {Object} settings - The settings object with encrypted API keys
 * @param {string} secretKey - The secret key for decryption
 * @returns {Object} Settings object with decrypted API keys
 */
async function decryptApiKeys(settings, secretKey) {
  const decryptedSettings = { ...settings }

  for (const field of API_KEY_FIELDS) {
    if (
      settings[field] &&
      typeof settings[field] === 'string' &&
      settings[field].trim() !== ''
    ) {
      try {
        // Only decrypt if it looks like encrypted data
        if (isEncrypted(settings[field])) {
          const decryptedValue = await decrypt(settings[field], secretKey)
          decryptedSettings[field] = decryptedValue
        } else {
          // Keep as is if it's already plain text (for migration compatibility)
          decryptedSettings[field] = settings[field]
        }
      } catch (error) {
        console.error(
          `[settingsStore] Failed to decrypt ${field}:`,
          error,
          'SecretKey:',
          secretKey ? 'exists' : 'missing'
        )
        // Keep the original value if decryption fails
        decryptedSettings[field] = settings[field]
      }
    } else {
    }
  }

  return decryptedSettings
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
      // Initialize secret key service first
      await secretKeyService.initialize()
      const secretKey = await secretKeyService.getSecretKey()

      const storedSettings = await settingsStorage.getValue()
      if (storedSettings && Object.keys(storedSettings).length > 0) {
        // Decrypt API keys from stored settings
        const decryptedStoredSettings = await decryptApiKeys(
          storedSettings,
          secretKey
        )
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

        // Merge settings with defaults
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...decryptedStoredSettings,
        }
        Object.assign(settings, mergedSettings)
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
    // Ensure loaded first
    await loadSettings()
    // Get secret key and encrypt API keys before saving
    const secretKey = await secretKeyService.getSecretKey()
    const encryptedSettings = await encryptApiKeys(updatedSettings, secretKey)

    // Save the encrypted settings object back to storage
    await settingsStorage.setValue(encryptedSettings)
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
        // Decrypt API keys from the new value
        const secretKey = await secretKeyService.getSecretKey()
        const decryptedNewValue = await decryptApiKeys(newValue, secretKey)

        // Handle migration from old formats to fabDomainControl
        if (
          (decryptedNewValue.fabDomainPermissions ||
            decryptedNewValue.fabDomainPermissionsEnabled !== undefined ||
            decryptedNewValue.fabDomainWhitelist !== undefined) &&
          !decryptedNewValue.fabDomainControl
        ) {
          let mode = 'all'
          let whitelist = []

          if (decryptedNewValue.fabDomainPermissions) {
            mode = decryptedNewValue.fabDomainPermissions.enabled
              ? 'whitelist'
              : 'all'
            whitelist =
              normalizeFabWhitelist(
                decryptedNewValue.fabDomainPermissions.whitelist
              ) || []
            delete decryptedNewValue.fabDomainPermissions
          } else if (
            decryptedNewValue.fabDomainPermissionsEnabled !== undefined
          ) {
            mode = decryptedNewValue.fabDomainPermissionsEnabled
              ? 'whitelist'
              : 'all'
            whitelist =
              normalizeFabWhitelist(decryptedNewValue.fabDomainWhitelist) || []
            delete decryptedNewValue.fabDomainPermissionsEnabled
            delete decryptedNewValue.fabDomainWhitelist
          }

          decryptedNewValue.fabDomainControl = {
            mode,
            whitelist,
            blacklist: [],
          }
        }

        // Ensure fabDomainControl has proper structure
        if (decryptedNewValue.fabDomainControl) {
          const { mode, whitelist, blacklist } =
            decryptedNewValue.fabDomainControl
          decryptedNewValue.fabDomainControl = {
            mode: mode || 'all',
            whitelist: normalizeFabWhitelist(whitelist) || [],
            blacklist: normalizeFabWhitelist(blacklist) || [],
          }
        }

        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...decryptedNewValue,
        }
        Object.assign(settings, mergedSettings)
        if (decryptedNewValue.uiLang !== settings.uiLang) {
          locale.set(decryptedNewValue.uiLang)
        }
      } catch (error) {
        console.error(
          '[settingsStore] Error processing settings change:',
          error
        )
        // Fallback to using newValue directly if decryption fails
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...newValue,
        }
        Object.assign(settings, mergedSettings)
      }
    }
  })
}
