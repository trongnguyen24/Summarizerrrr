// @ts-nocheck
import {
  getStorage,
  setStorage,
  onStorageChange,
} from '../services/chromeService.js'

// --- Default Settings for Advanced Mode ---
const DEFAULT_ADVANCED_MODE_SETTINGS = {
  temperature: 0.7, // Default temperature for advanced mode
  topP: 0.95, // Default topP for advanced mode
}

// --- State ---
export let advancedModeSettings = $state({ ...DEFAULT_ADVANCED_MODE_SETTINGS })
let _isInitialized = $state(false)

// Export isInitialized dưới dạng hàm
export function getIsInitialized() {
  return _isInitialized
}

// --- Actions ---

/**
 * Tải cài đặt chế độ nâng cao từ chrome.storage.sync khi store khởi tạo.
 */
export async function loadAdvancedModeSettings() {
  if (_isInitialized) return

  try {
    const storedSettings = await getStorage(
      Object.keys(DEFAULT_ADVANCED_MODE_SETTINGS)
    )
    const mergedSettings = { ...DEFAULT_ADVANCED_MODE_SETTINGS }
    for (const key in DEFAULT_ADVANCED_MODE_SETTINGS) {
      if (storedSettings[key] !== undefined && storedSettings[key] !== null) {
        mergedSettings[key] = storedSettings[key]
      }
    }
    Object.assign(advancedModeSettings, mergedSettings)
    _isInitialized = true
    console.log(
      '[advancedModeSettingsStore] Cài đặt chế độ nâng cao đã được tải:',
      $state.snapshot(advancedModeSettings)
    )
  } catch (error) {
    console.error(
      '[advancedModeSettingsStore] Lỗi khi tải cài đặt chế độ nâng cao:',
      error
    )
    Object.assign(advancedModeSettings, DEFAULT_ADVANCED_MODE_SETTINGS)
    _isInitialized = true
  }
}

/**
 * Cập nhật một hoặc nhiều cài đặt chế độ nâng cao và lưu vào chrome.storage.sync.
 * @param {Partial<typeof DEFAULT_ADVANCED_MODE_SETTINGS>} newSettings Object chứa các cài đặt cần cập nhật.
 */
export async function updateAdvancedModeSettings(newSettings) {
  if (!_isInitialized) {
    console.warn(
      '[advancedModeSettingsStore] Store chưa khởi tạo, không thể cập nhật.'
    )
    return
  }
  const validUpdates = {}
  for (const key in newSettings) {
    if (key in DEFAULT_ADVANCED_MODE_SETTINGS) {
      validUpdates[key] = newSettings[key]
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    console.warn(
      '[advancedModeSettingsStore] Không có cài đặt hợp lệ nào để cập nhật.'
    )
    return
  }

  Object.assign(advancedModeSettings, validUpdates)

  try {
    await setStorage(validUpdates)
    console.log(
      '[advancedModeSettingsStore] Cài đặt chế độ nâng cao đã được cập nhật và lưu:',
      $state.snapshot(advancedModeSettings)
    )
  } catch (error) {
    console.error(
      '[advancedModeSettingsStore] Lỗi khi lưu cài đặt chế độ nâng cao:',
      error
    )
  }
}

// --- Initialization and Listeners ---

export function subscribeToAdvancedModeSettingsChanges() {
  onStorageChange((changes, areaName) => {
    if (areaName === 'sync' && _isInitialized) {
      let changed = false
      const updatedSettings = {}
      for (const key in changes) {
        if (
          key in DEFAULT_ADVANCED_MODE_SETTINGS &&
          changes[key].newValue !== advancedModeSettings[key]
        ) {
          updatedSettings[key] =
            changes[key].newValue ?? DEFAULT_ADVANCED_MODE_SETTINGS[key]
          changed = true
        }
      }
      if (changed) {
        console.log(
          '[advancedModeSettingsStore] Phát hiện thay đổi từ storage, cập nhật state:',
          updatedSettings
        )
        Object.assign(advancedModeSettings, updatedSettings)
      }
    }
  })
}
