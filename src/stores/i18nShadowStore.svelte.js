// @ts-nocheck
import { locale } from 'svelte-i18n'
import { settingsStorage } from '@/services/wxtStorageService.js'
import { settings } from '@/stores/settingsStore.svelte.js' // Import settings store

export function subscribeToLocaleChanges() {
  return settingsStorage.watch((newSettings) => {
    // Ensure newSettings has uiLang and it's different from current locale
    if (newSettings.uiLang && newSettings.uiLang !== settings.uiLang) {
      locale.set(newSettings.uiLang)
    }
  })
}
