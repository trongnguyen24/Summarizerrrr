// @ts-nocheck
import {
  getStorage,
  setStorage,
  onStorageChange,
} from '../services/chromeService.js'

// --- Default Theme Settings ---
const DEFAULT_THEME_SETTINGS = {
  theme: 'dark', // Default theme
}

// --- State ---
export let themeSettings = $state({ ...DEFAULT_THEME_SETTINGS })
let _isThemeInitializedPromise = null // Use a Promise to track initialization

// Hàm áp dụng theme vào document.documentElement
export function applyThemeToDocument(themeValue) {
  if (themeValue === 'system') {
    localStorage.removeItem('theme')
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  } else {
    localStorage.setItem('theme', themeValue)
    if (themeValue === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }
}

// --- Actions ---

/**
 * Loads theme settings from chrome.storage.sync when the store is initialized.
 * Ensures settings are loaded only once.
 */
export async function loadThemeSettings() {
  if (_isThemeInitializedPromise) {
    return _isThemeInitializedPromise // Return existing promise if already loading/loaded
  }

  _isThemeInitializedPromise = (async () => {
    try {
      const storedThemeSettings = await getStorage(
        Object.keys(DEFAULT_THEME_SETTINGS)
      )
      const mergedThemeSettings = { ...DEFAULT_THEME_SETTINGS }
      for (const key in DEFAULT_THEME_SETTINGS) {
        if (
          storedThemeSettings[key] !== undefined &&
          storedThemeSettings[key] !== null
        ) {
          mergedThemeSettings[key] = storedThemeSettings[key]
        }
      }
      Object.assign(themeSettings, mergedThemeSettings)
    } catch (error) {
      console.error('[themeStore] Error loading theme settings:', error)
      Object.assign(themeSettings, DEFAULT_THEME_SETTINGS) // Fallback to defaults on error
    }
  })()

  return _isThemeInitializedPromise
}

/**
 * Updates one or more theme settings and saves them to chrome.storage.sync.
 * Ensures the store is initialized before updating.
 * @param {Partial<typeof DEFAULT_THEME_SETTINGS>} newThemeSettings Object containing settings to update.
 */
export async function updateThemeSettings(newThemeSettings) {
  if (!_isThemeInitializedPromise) {
    console.warn(
      '[themeStore] Store not initialized, cannot update theme settings. Call loadThemeSettings() first.'
    )
    return
  }
  await _isThemeInitializedPromise // Wait for initialization to complete

  const validUpdates = {}
  for (const key in newThemeSettings) {
    if (key in DEFAULT_THEME_SETTINGS) {
      validUpdates[key] = newThemeSettings[key]
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    console.warn('[themeStore] No valid theme settings to update.')
    return
  }

  Object.assign(themeSettings, validUpdates)

  try {
    await setStorage(validUpdates)
  } catch (error) {
    console.error('[themeStore] Error saving theme settings:', error)
  }
}

// --- Initialization and Listeners ---

/**
 * Subscribes to changes in chrome.storage.sync and updates the store's state.
 * Ensures the store is initialized before processing changes.
 */
export function subscribeToThemeChanges() {
  onStorageChange(async (changes, areaName) => {
    if (areaName === 'sync') {
      if (!_isThemeInitializedPromise) {
        console.warn(
          '[themeStore] Store not initialized, skipping storage change processing.'
        )
        return
      }
      await _isThemeInitializedPromise // Wait for initialization to complete

      let changed = false
      const updatedThemeSettings = {}
      for (const key in changes) {
        if (
          key in DEFAULT_THEME_SETTINGS &&
          changes[key].newValue !== themeSettings[key]
        ) {
          updatedThemeSettings[key] =
            changes[key].newValue ?? DEFAULT_THEME_SETTINGS[key]
          changed = true
        }
      }
      if (changed) {
        Object.assign(themeSettings, updatedThemeSettings)
      }
    }
  })
}

// Hàm khởi tạo theme khi ứng dụng load
export function initializeTheme() {
  loadThemeSettings().then(() => {
    applyThemeToDocument(themeSettings.theme)
    subscribeToThemeChanges()
  })
}

// Hàm để các component gọi khi muốn thay đổi theme
export function setTheme(themeValue) {
  updateThemeSettings({ theme: themeValue })
  applyThemeToDocument(themeValue)
}

// THÊM HÀM NÀY ĐỂ EXPORT LOGIC LẮNG NGHE THAY ĐỔI HỆ THỐNG
export function subscribeToSystemThemeChanges() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    if (themeSettings.theme === 'system') {
      setTheme('system') // Sử dụng setTheme để cập nhật qua storage
    }
  }
  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}
