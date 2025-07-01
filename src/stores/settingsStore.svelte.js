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
  selectedOllamaModel: 'llama2', // Default Ollama model
  summaryLength: 'long', // short, medium, long
  summaryFormat: 'heading', // heading, paragraph
  summaryLang: 'Vietnamese', // Default language Vietnamese
  summaryTone: 'simple', // Default tone setting
  selectedModel: 'gemini-2.0-flash', // Default model
  isAdvancedMode: false, // Default to basic mode
  selectedFont: 'default', // Default font setting
  isSummaryAdvancedMode: false, // Chế độ tóm tắt nâng cao mới

  // Lựa chọn prompt cho từng tính năng (chỉ còn 'default', 'custom1', 'custom2')
  youtubePromptSelection: false, // Thay đổi thành boolean để điều khiển SwitchButton
  youtubeCustomPromptContent:
    'Summarize the following content, format by ## and ###: __CONTENT__',
  youtubeCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  chapterPromptSelection: false,
  chapterCustomPromptContent:
    'Summarize the following content, format by ## and ###: __CONTENT__',
  chapterCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  webPromptSelection: false,
  webCustomPromptContent:
    'Summarize the following content, format by ## and ###: __CONTENT__',
  webCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  udemySummaryPromptSelection: false,
  udemySummaryCustomPromptContent:
    'Summarize the following content: __CONTENT__',
  udemySummaryCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  udemyConceptsPromptSelection: false,
  udemyConceptsCustomPromptContent:
    'Summarize the following content, format by ## and ###: __CONTENT__',
  udemyConceptsCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  selectedTextPromptSelection: false,
  selectedTextCustomPromptContent:
    'Summarize the following content, format by ## and ###: __CONTENT__',
  selectedTextCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
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

      const mergedSettings = { ...DEFAULT_SETTINGS }
      for (const key in DEFAULT_SETTINGS) {
        if (storedSettings[key] !== undefined && storedSettings[key] !== null) {
          mergedSettings[key] = storedSettings[key]
        }
      }

      // Ensure selectedOllamaModel is not an empty string if loaded from storage
      if (mergedSettings.selectedOllamaModel === '') {
        mergedSettings.selectedOllamaModel =
          DEFAULT_SETTINGS.selectedOllamaModel
      }

      Object.assign(settings, mergedSettings)
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
    console.dir(
      {
        message: '[settingsStore] Settings updated and saved:',
        settings: Object.fromEntries(
          Object.entries($state.snapshot(settings)).map(([key, value]) => {
            if (
              key.includes('PromptContent') ||
              key.includes('SystemInstructionContent')
            ) {
              return [key, value.substring(0, 50) + '...']
            }
            return [key, value]
          })
        ),
      },
      { depth: null }
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
