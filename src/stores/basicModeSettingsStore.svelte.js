// @ts-nocheck
import {
  getStorage,
  setStorage,
  onStorageChange,
} from '../services/chromeService.js'

// --- Default Settings for Basic Mode ---
const DEFAULT_BASIC_MODE_SETTINGS = {
  temperature: 0.7, // Default temperature for basic mode
  topP: 0.95, // Default topP for basic mode
}

// --- State ---
export let basicModeSettings = $state({ ...DEFAULT_BASIC_MODE_SETTINGS })
let _isInitialized = $state(false)

// Export isInitialized dưới dạng hàm
export function getIsInitialized() {
  return _isInitialized
}

// --- Actions ---

/**
 * Tải cài đặt chế độ cơ bản từ chrome.storage.sync khi store khởi tạo.
 */
export async function loadBasicModeSettings() {
  if (_isInitialized) return

  try {
    const storedSettings = await getStorage(
      Object.keys(DEFAULT_BASIC_MODE_SETTINGS)
    )
    const mergedSettings = { ...DEFAULT_BASIC_MODE_SETTINGS }
    for (const key in DEFAULT_BASIC_MODE_SETTINGS) {
      if (storedSettings[key] !== undefined && storedSettings[key] !== null) {
        mergedSettings[key] = storedSettings[key]
      }
    }
    Object.assign(basicModeSettings, mergedSettings)
    _isInitialized = true
    console.log(
      '[basicModeSettingsStore] Cài đặt chế độ cơ bản đã được tải:',
      $state.snapshot(basicModeSettings)
    )
  } catch (error) {
    console.error(
      '[basicModeSettingsStore] Lỗi khi tải cài đặt chế độ cơ bản:',
      error
    )
    Object.assign(basicModeSettings, DEFAULT_BASIC_MODE_SETTINGS)
    _isInitialized = true
  }
}

/**
 * Cập nhật một hoặc nhiều cài đặt chế độ cơ bản và lưu vào chrome.storage.sync.
 * @param {Partial<typeof DEFAULT_BASIC_MODE_SETTINGS>} newSettings Object chứa các cài đặt cần cập nhật.
 */
export async function updateBasicModeSettings(newSettings) {
  if (!_isInitialized) {
    console.warn(
      '[basicModeSettingsStore] Store chưa khởi tạo, không thể cập nhật.'
    )
    return
  }
  const validUpdates = {}
  for (const key in newSettings) {
    if (key in DEFAULT_BASIC_MODE_SETTINGS) {
      validUpdates[key] = newSettings[key]
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    console.warn(
      '[basicModeSettingsStore] Không có cài đặt hợp lệ nào để cập nhật.'
    )
    return
  }

  Object.assign(basicModeSettings, validUpdates)

  try {
    await setStorage(validUpdates)
    console.log(
      '[basicModeSettingsStore] Cài đặt chế độ cơ bản đã được cập nhật và lưu:',
      $state.snapshot(basicModeSettings)
    )
  } catch (error) {
    console.error(
      '[basicModeSettingsStore] Lỗi khi lưu cài đặt chế độ cơ bản:',
      error
    )
  }
}

// --- Initialization and Listeners ---

export function subscribeToBasicModeSettingsChanges() {
  onStorageChange((changes, areaName) => {
    if (areaName === 'sync' && _isInitialized) {
      let changed = false
      const updatedSettings = {}
      for (const key in changes) {
        if (
          key in DEFAULT_BASIC_MODE_SETTINGS &&
          changes[key].newValue !== basicModeSettings[key]
        ) {
          updatedSettings[key] =
            changes[key].newValue ?? DEFAULT_BASIC_MODE_SETTINGS[key]
          changed = true
        }
      }
      if (changed) {
        console.log(
          '[basicModeSettingsStore] Phát hiện thay đổi từ storage, cập nhật state:',
          updatedSettings
        )
        Object.assign(basicModeSettings, updatedSettings)
      }
    }
  })
}
