// @svelte-compiler-ignore
import {
  getStorage,
  setStorage,
  onStorageChange,
} from '../services/chromeService.js'

// --- Default Settings ---
const DEFAULT_SETTINGS = {
  geminiApiKey: '',
  summaryLength: 'medium', // short, medium, long
  summaryFormat: 'heading', // heading, paragraph
  summaryLang: 'vi', // Default language Vietnamese
}

// --- State ---
let settings = $state({ ...DEFAULT_SETTINGS })
let isInitialized = $state(false)

// --- Actions ---

/**
 * Tải cài đặt từ chrome.storage.sync khi store khởi tạo.
 */
async function loadSettings() {
  if (isInitialized) return // Chỉ load một lần

  console.log('[settingsStore] Đang tải cài đặt...')
  try {
    const storedSettings = await getStorage(Object.keys(DEFAULT_SETTINGS))
    // Merge stored settings with defaults, ensuring no undefined values
    const mergedSettings = { ...DEFAULT_SETTINGS }
    for (const key in DEFAULT_SETTINGS) {
      if (storedSettings[key] !== undefined && storedSettings[key] !== null) {
        mergedSettings[key] = storedSettings[key]
      }
    }
    settings = mergedSettings // Cập nhật state
    isInitialized = true
    console.log('[settingsStore] Cài đặt đã được tải:', settings)
  } catch (error) {
    console.error('[settingsStore] Lỗi khi tải cài đặt:', error)
    // Sử dụng giá trị mặc định nếu có lỗi
    settings = { ...DEFAULT_SETTINGS }
    isInitialized = true // Vẫn đánh dấu đã khởi tạo để tránh load lại
  }
}

/**
 * Cập nhật một hoặc nhiều cài đặt và lưu vào chrome.storage.sync.
 * @param {Partial<typeof DEFAULT_SETTINGS>} newSettings Object chứa các cài đặt cần cập nhật.
 */
export async function updateSettings(newSettings) {
  if (!isInitialized) {
    console.warn('[settingsStore] Store chưa khởi tạo, không thể cập nhật.')
    return
  }
  // Lọc ra các key hợp lệ
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

  // Cập nhật state cục bộ trước (optimistic update)
  settings = { ...settings, ...validUpdates }
  console.log('[settingsStore] Cập nhật state cục bộ:', settings)

  try {
    await setStorage(validUpdates)
    console.log('[settingsStore] Đã lưu cài đặt vào storage:', validUpdates)
  } catch (error) {
    console.error('[settingsStore] Lỗi khi lưu cài đặt:', error)
    // Optional: Rollback state if needed, though storage listener should handle inconsistencies
  }
}

// --- Initialization and Listeners ---

// Tự động load cài đặt khi store được import lần đầu
loadSettings()

// Lắng nghe thay đổi từ storage để cập nhật state nếu có thay đổi từ nơi khác
onStorageChange((changes, areaName) => {
  if (areaName === 'sync' && isInitialized) {
    let changed = false
    const updatedSettings = { ...settings }
    for (const key in changes) {
      if (key in DEFAULT_SETTINGS && changes[key].newValue !== settings[key]) {
        updatedSettings[key] = changes[key].newValue ?? DEFAULT_SETTINGS[key] // Use default if newValue is null/undefined
        changed = true
      }
    }
    if (changed) {
      console.log(
        '[settingsStore] Phát hiện thay đổi từ storage, cập nhật state:',
        updatedSettings
      )
      settings = updatedSettings // Cập nhật state
    }
  }
})

// --- Exported State (Read-only access recommended) ---
// --- Exported State ---
// Export an object containing the state variables
export const settingsStore = {
  get settings() {
    return settings
  },
  get isInitialized() {
    return isInitialized
  },
  updateSettings, // Also export the action
}

console.log('settingsStore.svelte.js loaded')
