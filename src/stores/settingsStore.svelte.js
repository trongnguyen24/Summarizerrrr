// @ts-nocheck
import { locale } from 'svelte-i18n'
import {
  getStorage,
  setStorage,
  onStorageChange,
  settingsStorage,
} from '@/services/wxtStorageService.js'

// --- Default Settings ---
const DEFAULT_SETTINGS = {
  selectedProvider: 'gemini', // Default provider
  geminiApiKey: '',
  selectedGeminiModel: 'gemini-2.5-flash', // Default Gemini model for basic mode
  geminiAdvancedApiKey: '', // Gemini API Key for advanced mode
  selectedGeminiAdvancedModel: 'gemini-2.5-flash', // Default Gemini model for advanced mode
  openaiCompatibleApiKey: '', // OpenAI Compatible API Key
  openaiCompatibleBaseUrl: '', // OpenAI Compatible Base URL
  selectedOpenAICompatibleModel: '', // OpenAI Compatible Model
  openrouterApiKey: '', // OpenRouter API Key
  selectedOpenrouterModel: 'deepseek/deepseek-r1-0528:free', // Default OpenRouter model
  deepseekApiKey: '', // DeepSeek API Key
  deepseekBaseUrl: 'https://api.deepseek.com/', // Deepseek Base URL
  selectedDeepseekModel: 'deepseek-chat', // Deepseek Model
  chatgptApiKey: '', // ChatGPT API Key
  chatgptBaseUrl: 'https://api.openai.com/v1', // ChatGPT Base URL
  selectedChatgptModel: 'gpt-3.5-turbo', // ChatGPT Model
  ollamaEndpoint: 'http://localhost:11434/api', // Ollama Endpoint
  selectedOllamaModel: 'llama2', // Default Ollama model
  lmStudioEndpoint: 'http://localhost:1234/v1', // LM Studio Endpoint
  selectedLmStudioModel: 'lmstudio-community/gemma-2b-it-GGUF', // Default LM Studio model
  groqApiKey: '', // Groq API Key
  selectedGroqModel: 'mixtral-8x7b-32768', // Default Groq model
  summaryLength: 'long', // short, medium, long
  summaryFormat: 'heading', // heading, paragraph
  summaryLang: 'Vietnamese', // Default language Vietnamese
  summaryTone: 'simple', // Default tone setting
  selectedModel: 'gemini-2.5-flash', // Default model
  isAdvancedMode: false, // Default to basic mode
  selectedFont: 'default', // Default font setting
  enableStreaming: true, // Enable streaming by default
  isSummaryAdvancedMode: false, // Chế độ tóm tắt nâng cao mới
  uiLang: 'en', // 'en', 'vi', etc.

  // Lựa chọn prompt cho từng tính năng (chỉ còn 'default', 'custom1', 'custom2')
  youtubePromptSelection: false, // Thay đổi thành boolean để điều khiển SwitchButton
  youtubeCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  youtubeCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  chapterPromptSelection: false,
  chapterCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  chapterCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  webPromptSelection: false,
  webCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  webCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  courseSummaryPromptSelection: false,
  courseSummaryCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  courseSummaryCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  courseConceptsPromptSelection: false,
  courseConceptsCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  courseConceptsCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
  selectedTextPromptSelection: false,
  selectedTextCustomPromptContent:
    'Summarize content, format by ## and ###: __CONTENT__',
  selectedTextCustomSystemInstructionContent: 'You are an AI assistant.', // New field for custom system instruction
}

// --- State ---
export let settings = $state({ ...DEFAULT_SETTINGS })
let _isInitializedPromise = null // Use a Promise to track initialization

// Initialize storage with default values if it's empty
;(async () => {
  const currentSettings = await settingsStorage.getValue()
  if (!currentSettings || Object.keys(currentSettings).length === 0) {
    await settingsStorage.setValue(DEFAULT_SETTINGS)
  }
})()

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
      // console.log(
      //   '[settingsStore] Stored settings from storage:',
      //   JSON.stringify(storedSettings)
      // )
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

      // Ensure selectedLmStudioModel is not an empty string if loaded from storage
      if (mergedSettings.selectedLmStudioModel === '') {
        mergedSettings.selectedLmStudioModel =
          DEFAULT_SETTINGS.selectedLmStudioModel
      }

      // Ensure selectedGroqModel is not an empty string if loaded from storage
      if (mergedSettings.selectedGroqModel === '') {
        mergedSettings.selectedGroqModel = DEFAULT_SETTINGS.selectedGroqModel
      }

      Object.assign(settings, mergedSettings)
      // console.log(
      //   '[settingsStore] Settings loaded (after merge):',
      //   JSON.stringify($state.snapshot(settings))
      // )
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

  // If uiLang is updated, also update the i18n locale
  if (validUpdates.uiLang) {
    locale.set(validUpdates.uiLang)
  }

  try {
    console.log(
      '[settingsStore] Updating and saving the following settings:',
      JSON.stringify(validUpdates)
    )
    await setStorage(validUpdates)
    // console.log(
    //   '[settingsStore] Settings updated and saved:',
    //   JSON.stringify($state.snapshot(settings))
    // )
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
        // console.log(
        //   '[settingsStore] Storage change detected, updating state:',
        //   updatedSettings
        // )
        Object.assign(settings, updatedSettings)
        if (updatedSettings.uiLang) {
          locale.set(updatedSettings.uiLang)
        }
      }
    }
  })
}
