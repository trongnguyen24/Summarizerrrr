// @ts-nocheck
import { storage } from '@wxt-dev/storage'

/**
 * A wrapper for WXT Storage to provide a similar interface to chromeService.
 * This service enables reactive, cross-context state management.
 */

// --- Storage Definitions ---

// We define storage items with keys and default values.
// The key 'sync:settings' uses synchronized storage across devices.
export const settingsStorage = storage.defineItem('sync:settings', {
  defaultValue: {},
})

export const themeStorage = storage.defineItem('sync:theme', {
  defaultValue: {},
})

// --- Generic Storage Functions ---

/**
 * Retrieves values from storage. Mimics chrome.storage.sync.get.
 * @param {string | string[] | null} keys - A single key, an array of keys, or null to get all items.
 * @returns {Promise<{[key: string]: any}>}
 */
export async function getStorage(keys) {
  const allSettings = (await settingsStorage.getValue()) || {}
  const allTheme = (await themeStorage.getValue()) || {}
  const combined = { ...allSettings, ...allTheme }

  if (keys === null) {
    return combined
  }

  const keysToGet = Array.isArray(keys) ? keys : [keys]
  const result = {}

  for (const key of keysToGet) {
    if (key in combined) {
      result[key] = combined[key]
    }
  }
  return result
}

/**
 * Sets values in storage. Mimics chrome.storage.sync.set.
 * @param {{[key: string]: any}} items - An object with key-value pairs to store.
 * @returns {Promise<void>}
 */
export async function setStorage(items) {
  const currentSettings = (await settingsStorage.getValue()) || {}
  const currentTheme = (await themeStorage.getValue()) || {}

  const newSettings = { ...currentSettings }
  const newTheme = { ...currentTheme }
  let settingsChanged = false
  let themeChanged = false

  for (const key in items) {
    // A simple way to know which store to update is to check against the default keys.
    // This is not perfect but better than the previous logic.
    // A truly robust solution would involve a manifest of keys.
    if (
      'selectedProvider' in currentSettings ||
      Object.keys(currentSettings).length === 0
    ) {
      // Heuristic: if it looks like the main settings object, update it.
      newSettings[key] = items[key]
      settingsChanged = true
    } else {
      newTheme[key] = items[key]
      themeChanged = true
    }
  }

  if (settingsChanged) {
    await settingsStorage.setValue(newSettings)
  }
  if (themeChanged) {
    await themeStorage.setValue(newTheme)
  }
}

/**
 * Watches for changes in storage. Mimics chrome.storage.onChanged.
 * @param {(changes: {[key: string]: {oldValue: any, newValue: any}}, areaName: "sync" | "local") => void} callback
 * @returns {() => void} A function to unregister the listener.
 */
export function onStorageChange(callback) {
  const unwatchSettings = settingsStorage.watch((newValue, oldValue) => {
    const changes = createChangesObject(oldValue, newValue)
    if (Object.keys(changes).length > 0) {
      callback(changes, 'sync')
    }
  })

  const unwatchTheme = themeStorage.watch((newValue, oldValue) => {
    const changes = createChangesObject(oldValue, newValue)
    if (Object.keys(changes).length > 0) {
      callback(changes, 'sync')
    }
  })

  // Return a function that unsubscribes both watchers
  return () => {
    unwatchSettings()
    unwatchTheme()
  }
}

/**
 * Helper to create a changes object similar to chrome.storage.onChanged.
 * @param {object} oldValue
 * @param {object} newValue
 * @returns {{[key: string]: {oldValue: any, newValue: any}}}
 */
function createChangesObject(oldValue, newValue) {
  const changes = {}
  const allKeys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)])
  for (const key of allKeys) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) {
      changes[key] = {
        oldValue: oldValue[key],
        newValue: newValue[key],
      }
    }
  }
  return changes
}
