// @ts-nocheck
import { get } from 'svelte/store'
import { fontSizeIndex, widthIndex } from '@/stores/displaySettingsStore.svelte'
import { themeSettings, setTheme } from '@/stores/themeStore.svelte.js'
import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
import {
  FONT_SIZE_CLASSES,
  WIDTH_CLASSES,
  FONT_KEYS,
} from '@/lib/constants/displayConstants.js'

export function useDisplaySettings() {
  function increaseFontSize() {
    fontSizeIndex.update((n) => (n < FONT_SIZE_CLASSES.length - 1 ? n + 1 : n))
  }

  function decreaseFontSize() {
    fontSizeIndex.update((n) => (n > 0 ? n - 1 : n))
  }

  function toggleWidth() {
    widthIndex.update((n) => (n + 1) % WIDTH_CLASSES.length)
  }

  function toggleFontFamily() {
    const currentFont = get(settings).selectedFont
    const currentIndex = FONT_KEYS.indexOf(currentFont)
    const nextIndex = (currentIndex + 1) % FONT_KEYS.length
    updateSettings({ selectedFont: FONT_KEYS[nextIndex] })
  }

  function toggleTheme() {
    const themes = ['light', 'dark', 'system']
    const currentTheme = get(themeSettings).theme
    const currentIndex = themes.indexOf(currentTheme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return {
    increaseFontSize,
    decreaseFontSize,
    toggleWidth,
    toggleFontFamily,
    toggleTheme,
    fontSizeIndex,
    widthIndex,
    themeSettings,
    settings,
  }
}
