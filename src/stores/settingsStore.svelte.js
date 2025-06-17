// @ts-nocheck
import {
  getStorage,
  setStorage,
  onStorageChange,
} from '../services/chromeService.js'

// --- Default Settings ---
const DEFAULT_SETTINGS = {
  selectedProvider: 'gemini', // Default provider
  geminiApiKey: '',
  selectedGeminiModel: 'gemini-2.0-flash', // Default Gemini model for basic mode
  geminiAdvancedApiKey: '', // Gemini API Key for advanced mode
  selectedGeminiAdvancedModel: 'gemini-2.0-flash', // Default Gemini model for advanced mode
  openrouterApiKey: '', // OpenRouter API Key
  selectedOpenrouterModel: 'deepseek/deepseek-r1-0528:free', // Default OpenRouter model
  deepseekApiKey: '', // DeepSeek API Key
  chatgptApiKey: '', // ChatGPT API Key
  ollamaEndpoint: 'http://localhost:11434', // Ollama Endpoint
  selectedOllamaModel: '', // Default Ollama model
  summaryLength: 'long', // short, medium, long
  summaryFormat: 'heading', // heading, paragraph
  summaryLang: 'Vietnamese', // Default language Vietnamese
  selectedModel: 'gemini-2.0-flash', // Default model
  isAdvancedMode: false, // Default to basic mode
  selectedFont: 'default', // Default font setting
}

// --- State ---
export let settings = $state({ ...DEFAULT_SETTINGS })
let _isInitializedPromise = null // Use a Promise to track initialization

// --- Actions ---

/**
 * Loads settings from chrome.storage.sync when the store is initialized.
 * Ensures settings are loaded only once.
 */
export async function loadSettings() {
  if (_isInitializedPromise) {
    return _isInitializedPromise // Return existing promise if already loading/loaded
  }

  _isInitializedPromise = (async () => {
    try {
      const storedSettings = await getStorage(Object.keys(DEFAULT_SETTINGS))
      console.log(
        '[settingsStore] Stored settings from storage:',
        JSON.stringify(storedSettings)
      )
      const mergedSettings = { ...DEFAULT_SETTINGS }
      for (const key in DEFAULT_SETTINGS) {
        if (storedSettings[key] !== undefined && storedSettings[key] !== null) {
          mergedSettings[key] = storedSettings[key]
        }
      }
      Object.assign(settings, mergedSettings)
      console.log(
        '[settingsStore] Settings loaded (after merge):',
        JSON.stringify($state.snapshot(settings))
      )
    } catch (error) {
      console.error('[settingsStore] Error loading settings:', error)
      Object.assign(settings, DEFAULT_SETTINGS) // Fallback to defaults on error
    }
  })()

  return _isInitializedPromise
}

/**
 * Updates one or more settings and saves them to chrome.storage.sync.
 * Ensures the store is initialized before updating.
 * @param {Partial<typeof DEFAULT_SETTINGS>} newSettings Object containing settings to update.
 */
export async function updateSettings(newSettings) {
  if (!_isInitializedPromise) {
    console.warn(
      '[settingsStore] Store not initialized, cannot update settings. Call loadSettings() first.'
    )
    return
  }
  await _isInitializedPromise // Wait for initialization to complete

  const validUpdates = {}
  for (const key in newSettings) {
    if (key in DEFAULT_SETTINGS) {
      validUpdates[key] = newSettings[key]
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    console.warn('[settingsStore] No valid settings to update.')
    return
  }

  Object.assign(settings, validUpdates)

  try {
    console.log(
      '[settingsStore] Updating and saving the following settings:',
      JSON.stringify(validUpdates)
    )
    await setStorage(validUpdates)
    console.log(
      '[settingsStore] Settings updated and saved:',
      JSON.stringify($state.snapshot(settings))
    )
  } catch (error) {
    console.error('[settingsStore] Error saving settings:', error)
  }
}

// --- Initialization and Listeners ---

/**
 * Subscribes to changes in chrome.storage.sync and updates the store's state.
 * Ensures the store is initialized before processing changes.
 */
export function subscribeToSettingsChanges() {
  onStorageChange(async (changes, areaName) => {
    if (areaName === 'sync') {
      if (!_isInitializedPromise) {
        console.warn(
          '[settingsStore] Store not initialized, skipping storage change processing.'
        )
        return
      }
      await _isInitializedPromise // Wait for initialization to complete

      let changed = false
      const updatedSettings = {}
      for (const key in changes) {
        if (
          key in DEFAULT_SETTINGS &&
          changes[key].newValue !== settings[key]
        ) {
          updatedSettings[key] = changes[key].newValue ?? DEFAULT_SETTINGS[key]
          changed = true
        }
      }
      if (changed) {
        console.log(
          '[settingsStore] Storage change detected, updating state:',
          updatedSettings
        )
        Object.assign(settings, updatedSettings)
      }
    }
  })
}
