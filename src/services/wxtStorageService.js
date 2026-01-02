// @ts-nocheck
import { storage } from '@wxt-dev/storage'

/**
 * This service now only defines and exports the WXT storage items.
 * The stores themselves will be responsible for interacting with these items.
 * This avoids complex and error-prone logic for guessing which store to update.
 */

// --- Storage Definitions ---

export const settingsStorage = storage.defineItem('local:settings', {
  // The defaultValue will be set in the store itself to ensure all keys are present.
  defaultValue: {},
})

export const themeStorage = storage.defineItem('local:theme', {
  defaultValue: {},
})

export const appStateStorage = storage.defineItem('local:appState', {
  defaultValue: {},
})

export const cleanupStorage = storage.defineItem('local:lastCleanupDate', {
  defaultValue: null,
})
