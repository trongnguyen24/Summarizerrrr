import {
  settings,
  loadSettings,
  subscribeToSettingsChanges,
} from '../stores/settingsStore.svelte.js'
import {
  themeSettings,
  initializeTheme,
  subscribeToSystemThemeChanges,
  applyThemeToDocument,
} from '../stores/themeStore.svelte.js'
import { useOverlayScrollbars } from 'overlayscrollbars-svelte'

function applyFontToDocument(font) {
  if (document.body) {
    document.body.classList.remove(
      'font-default',
      'font-noto-serif',
      'font-opendyslexic',
      'font-mali'
    )
    document.body.classList.add(`font-${font}`)
  }
}

export async function initializeApp() {
  const options = {
    scrollbars: {
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize] = useOverlayScrollbars({ options, defer: true })

  initialize(document.body)

  // Load settings and theme initially
  await loadSettings()
  await initializeTheme()

  // Apply initial theme and font
  applyThemeToDocument(themeSettings.theme)
  applyFontToDocument(settings.selectedFont)

  // Subscribe to changes for theme and settings
  const unsubscribeTheme = subscribeToSystemThemeChanges((newTheme) => {
    applyThemeToDocument(newTheme)
  })

  const unsubscribeSettings = subscribeToSettingsChanges((changedSettings) => {
    if (changedSettings.selectedFont !== undefined) {
      applyFontToDocument(changedSettings.selectedFont)
    }
    // Add other settings updates here if needed
  })

  return () => {
    unsubscribeTheme()
    unsubscribeSettings()
  }
}
