// @ts-nocheck
import { themeStorage } from '../services/wxtStorageService.js'

// --- Default Theme Settings ---
const DEFAULT_THEME_SETTINGS = {
  theme: 'dark', // Default theme
}

// --- State ---
export let themeSettings = $state({ ...DEFAULT_THEME_SETTINGS })
let _isThemeInitializedPromise = null

// --- Actions ---

/**
 * Loads theme settings from storage.
 */
export async function loadThemeSettings() {
  if (_isThemeInitializedPromise) {
    return _isThemeInitializedPromise
  }
  _isThemeInitializedPromise = (async () => {
    try {
      const storedSettings = await themeStorage.getValue()
      if (storedSettings && Object.keys(storedSettings).length > 0) {
        const mergedSettings = { ...DEFAULT_THEME_SETTINGS, ...storedSettings }
        Object.assign(themeSettings, mergedSettings)
      } else {
        await themeStorage.setValue(DEFAULT_THEME_SETTINGS)
        Object.assign(themeSettings, DEFAULT_THEME_SETTINGS)
      }
    } catch (error) {
      console.error('[themeStore] Error loading theme settings:', error)
      Object.assign(themeSettings, DEFAULT_THEME_SETTINGS)
    }
  })()
  return _isThemeInitializedPromise
}

/**
 * Updates theme settings and saves to storage.
 * @param {Partial<typeof DEFAULT_THEME_SETTINGS>} newThemeSettings
 */
export async function updateThemeSettings(newThemeSettings) {
  if (!_isThemeInitializedPromise) {
    await loadThemeSettings()
  }
  await _isThemeInitializedPromise

  const updatedSettings = { ...themeSettings, ...newThemeSettings }
  Object.assign(themeSettings, updatedSettings)

  try {
    await themeStorage.setValue(updatedSettings)
  } catch (error) {
    console.error('[themeStore] Error saving theme settings:', error)
  }
}

/**
 * Subscribes to changes in theme storage.
 */
export function subscribeToThemeChanges() {
  return themeStorage.watch((newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(themeSettings)) {
      const mergedSettings = { ...DEFAULT_THEME_SETTINGS, ...newValue }
      Object.assign(themeSettings, mergedSettings)
      applyThemeToDocument(mergedSettings.theme)
    }
  })
}

// --- Helpers ---

/**
 * Applies the theme to the document.
 * @param {'light' | 'dark' | 'system'} themeValue
 */
export function applyThemeToDocument(themeValue) {
  if (typeof window === 'undefined') return

  const apply = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }

  if (themeValue === 'system') {
    localStorage.removeItem('theme')
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'
    apply(systemTheme)
  } else {
    localStorage.setItem('theme', themeValue)
    apply(themeValue)
  }
}

/**
 * Applies the theme to a shadow DOM container.
 * @param {'light' | 'dark' | 'system'} themeValue
 * @param {Element} shadowContainer - The shadow DOM container element
 */
export function applyShadowTheme(themeValue, shadowContainer) {
  if (typeof window === 'undefined' || !shadowContainer) return

  const apply = (theme) => {
    if (theme === 'dark') {
      shadowContainer.classList.add('dark')
    } else {
      shadowContainer.classList.remove('dark')
    }
  }

  if (themeValue === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'
    apply(systemTheme)
  } else {
    apply(themeValue)
  }
}

// --- Initialization ---

/**
 * Initializes the theme by loading settings and applying the theme.
 */
export function initializeTheme() {
  loadThemeSettings().then(() => {
    applyThemeToDocument(themeSettings.theme)
    subscribeToThemeChanges()
  })
}

/**
 * Initializes the theme for shadow DOM by loading settings and applying the theme.
 * @param {Element} shadowContainer - The shadow DOM container element
 */
export function initializeShadowTheme(shadowContainer) {
  loadThemeSettings().then(() => {
    applyShadowTheme(themeSettings.theme, shadowContainer)
    subscribeToShadowThemeChanges(shadowContainer)
  })
}

/**
 * Sets a new theme and updates storage.
 * @param {'light' | 'dark' | 'system'} themeValue
 */
export function setTheme(themeValue) {
  updateThemeSettings({ theme: themeValue })
  // The watcher will call applyThemeToDocument
  applyThemeToDocument(themeValue)
}

/**
 * Subscribes to changes in theme storage for shadow DOM.
 * @param {Element} shadowContainer - The shadow DOM container element
 */
export function subscribeToShadowThemeChanges(shadowContainer) {
  return themeStorage.watch((newValue) => {
    if (JSON.stringify(newValue) !== JSON.stringify(themeSettings)) {
      const mergedSettings = { ...DEFAULT_THEME_SETTINGS, ...newValue }
      Object.assign(themeSettings, mergedSettings)
      applyShadowTheme(mergedSettings.theme, shadowContainer)
    }
  })
}

/**
 * Listens for system theme changes.
 */
export function subscribeToSystemThemeChanges() {
  if (typeof window === 'undefined') return () => {}

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    if (themeSettings.theme === 'system') {
      applyThemeToDocument('system')
    }
  }
  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}

/**
 * Listens for system theme changes for shadow DOM.
 * @param {Element} shadowContainer - The shadow DOM container element
 */
export function subscribeToShadowSystemThemeChanges(shadowContainer) {
  if (typeof window === 'undefined') return () => {}

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    if (themeSettings.theme === 'system') {
      applyShadowTheme('system', shadowContainer)
    }
  }
  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}
