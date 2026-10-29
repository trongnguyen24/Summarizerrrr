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

export const openrouterCatalogStorage = storage.defineItem('local:openrouterCatalog', {
  fallback: { fetchedAt: 0, entries: {} }, // entries: { "<vendor>:<slug>": contextWindowTokens }
})

// Context windows discovered from a provider's /models response, cached so the
// exact limits survive reloads instead of being re-fetched every session.
// entries: { "<providerId>:<modelId>": { contextWindowTokens, defaultOutputTokens? } }
export const modelCapabilitiesStorage = storage.defineItem('local:modelCapabilities', {
  fallback: { updatedAt: 0, entries: {} },
})

// Gemini model ids last seen on /models; the auto-fallback chain is built from
// this (lib/providers/geminiFallbackChain.js), so new models need no code change.
export const geminiModelListStorage = storage.defineItem('local:geminiModelList', {
  fallback: { updatedAt: 0, ids: [] },
})
