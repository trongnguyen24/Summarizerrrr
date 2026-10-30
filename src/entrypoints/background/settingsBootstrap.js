// @ts-nocheck
/**
 * Settings bootstrap for the background service worker.
 *
 * NOTE: this is still the background's *private* reimplementation of settings
 * loading — it bypasses `settingsStore` on two of its three strategies. Sharing
 * it with the store is seam (f) in `docs/refactor/03-god-files.md` and is
 * deliberately NOT done here; this module only relocates the existing code so
 * `externalChat.js` can import it instead of receiving it as an injected dep.
 */
import { browser } from 'wxt/browser'
import { loadSettings } from '@/stores/settingsStore.svelte.js'

/**
 * Checks if browser storage is ready and accessible
 * @returns {Promise<boolean>} True if storage is ready
 */
export async function isStorageReady() {
  try {
    // Try to write and read a test value to verify storage is working
    const testKey = '__storage_readiness_test__'
    const testValue = Date.now().toString()
    await browser.storage.local.set({ [testKey]: testValue })
    const result = await browser.storage.local.get(testKey)
    await browser.storage.local.remove(testKey)
    return result[testKey] === testValue
  } catch (error) {
    console.warn('[Background] Storage readiness check failed:', error)
    return false
  }
}

/**
 * Load settings directly from browser.storage with multiple key patterns
 * @returns {Promise<Object|null>} Settings object or null if failed
 */
export async function loadSettingsDirectly() {
  try {
    // WXT's `storage.defineItem('local:settings')` stores under the RAW key
    // `settings` — the `local:` prefix selects the storage area, it is not part
    // of the key. The other spellings are legacy guesses kept as a read-only
    // fallback; nothing writes them.
    const possibleKeys = ['settings', 'wxt:settings', 'local_settings']

    for (const key of possibleKeys) {
      const result = await browser.storage.local.get(key)
      const storedSettings = result[key]

      if (
        storedSettings &&
        typeof storedSettings === 'object' &&
        Object.keys(storedSettings).length > 0
      ) {
        return storedSettings
      }
    }

    return null
  } catch (error) {
    console.error('[Background] Error loading settings directly:', error)
    return null
  }
}

/**
 * Enhanced settings loading with fallback strategies.
 *
 * There used to be a third strategy that "initialized defaults" by writing a
 * three-key object to `local:settings`. That key is not the one WXT reads
 * (`settings`), so it could never restore anything — it only left junk behind
 * that strategy 2 could later pick up in place of the real settings. Defaults
 * are already seeded by `loadSettings()` itself when storage is empty, so the
 * strategy was redundant as well as wrong, and is gone.
 *
 * @returns {Promise<Object|null>} Settings object or null if failed
 */
export async function loadSettingsWithReadiness() {
  try {
    // Strategy 1: Check if storage is ready and try WXT storage. This is the
    // only path that returns *migrated* settings, so it must stay first.
    if (await isStorageReady()) {
      try {
        const settings = await loadSettings()
        if (
          settings &&
          typeof settings === 'object' &&
          settings.iconClickAction
        ) {
          return settings
        }
      } catch (error) {
        console.warn('[Background] WXT storage failed, trying direct access')
      }
    }

    // Strategy 2: Direct browser.storage access as backup. Returns raw,
    // un-migrated data — acceptable for the few flat keys read here.
    const directSettings = await loadSettingsDirectly()
    if (directSettings && directSettings.iconClickAction) {
      return directSettings
    }

    console.warn('[Background] All settings loading strategies failed')
    return null
  } catch (error) {
    console.error('[Background] Error in loadSettingsWithReadiness:', error)
    return null
  }
}
