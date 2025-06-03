// @svelte-compiler-ignore
import {
  getStorage,
  setStorage,
  onStorageChange,
} from '../services/chromeService.js'

// --- Default Settings ---
const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  summaryLength: 'long', // short, medium, long
  summaryFormat: 'heading', // heading, paragraph
  summaryLang: 'Vietnamese', // Default language Vietnamese
  selectedModel: 'gemini-2.0-flash', // Default model
  temperature: 0.6, // Default temperature for summary style
  topP: 0.91, // Default topP for summary style
}

// --- State ---
export let settings = $state({ ...DEFAULT_SETTINGS })
let _isInitialized = $state(false) // Biến nội bộ

// Export isInitialized dưới dạng hàm
export function getIsInitialized() {
  return _isInitialized
}

// --- Actions ---

/**
 * Tải cài đặt từ chrome.storage.sync khi store khởi tạo.
 */
export async function loadSettings() {
  // THÊM EXPORT Ở ĐÂY
  if (_isInitialized) return // Chỉ load một lần

  try {
    const storedSettings = await getStorage(Object.keys(DEFAULT_SETTINGS))
    const mergedSettings = { ...DEFAULT_SETTINGS }
    for (const key in DEFAULT_SETTINGS) {
      if (storedSettings[key] !== undefined && storedSettings[key] !== null) {
        mergedSettings[key] = storedSettings[key]
      }
    }
    Object.assign(settings, mergedSettings)
    _isInitialized = true // Cập nhật biến nội bộ
    console.log(
      '[settingsStore] Cài đặt đã được tải:',
      $state.snapshot(settings)
    )
  } catch (error) {
    console.error('[settingsStore] Lỗi khi tải cài đặt:', error)
    Object.assign(settings, DEFAULT_SETTINGS)
    _isInitialized = true // Vẫn đánh dấu đã khởi tạo để tránh load lại
  }
}

/**
 * Cập nhật một hoặc nhiều cài đặt và lưu vào chrome.storage.sync.
 * @param {Partial<typeof DEFAULT_SETTINGS>} newSettings Object chứa các cài đặt cần cập nhật.
 */
export async function updateSettings(newSettings) {
  if (!_isInitialized) {
    console.warn('[settingsStore] Store chưa khởi tạo, không thể cập nhật.')
    return
  }
  const validUpdates = {}
  for (const key in newSettings) {
    if (key in DEFAULT_SETTINGS) {
      validUpdates[key] = newSettings[key]
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    console.warn('[settingsStore] Không có cài đặt hợp lệ nào để cập nhật.')
    return
  }

  Object.assign(settings, validUpdates)

  try {
    await setStorage(validUpdates)
  } catch (error) {
    console.error('[settingsStore] Lỗi khi lưu cài đặt:', error)
  }
}

// --- Initialization and Listeners ---

export function subscribeToSettingsChanges() {
  onStorageChange((changes, areaName) => {
    if (areaName === 'sync' && _isInitialized) {
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
          '[settingsStore] Phát hiện thay đổi từ storage, cập nhật state:',
          updatedSettings
        )
        Object.assign(settings, updatedSettings)
      }
    }
  })
}
