import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Guards the background's settings bootstrap.
 *
 * Two defects lived here:
 *  1. `loadSettings()` resolved to `undefined` (its async IIFE had no return),
 *     so strategy 1 — the only path returning *migrated* settings — could never
 *     succeed and every call silently fell through to raw storage reads.
 *  2. A strategy 3 "initialize defaults" wrote a three-key object to the key
 *     `local:settings`. WXT reads the raw key `settings` (the `local:` prefix
 *     picks the storage area), so it restored nothing and only left junk that
 *     strategy 2 could later return instead of the real settings.
 */

// A stand-in for browser.storage.local backed by a plain object.
const localArea = vi.hoisted(() => ({
  data: {},
  // When true the readiness probe's read-back fails, so isStorageReady()
  // returns false and strategy 1 is skipped — the only way to reach the old
  // strategy 3.
  breakReadiness: false,
  async get(key) {
    if (this.breakReadiness && key === '__storage_readiness_test__') return {}
    return key in this.data ? { [key]: this.data[key] } : {}
  },
  async set(obj) {
    Object.assign(this.data, obj)
  },
  async remove(key) {
    delete this.data[key]
  },
}))

vi.mock('wxt/browser', () => ({
  browser: { storage: { local: localArea } },
}))

// settingsStorage is the WXT item; it must read/write the SAME raw `settings`
// key that loadSettingsDirectly() probes, so the two views stay consistent.
const mockStorage = vi.hoisted(() => ({
  async getValue() {
    return localArea.data.settings ?? {}
  },
  async setValue(val) {
    localArea.data.settings = val
  },
  watch: vi.fn(),
}))

vi.mock('@/services/wxtStorageService.js', () => ({
  settingsStorage: mockStorage,
}))

vi.mock('@/services/cloudSync/cloudSyncService.svelte.js', () => ({
  triggerSync: vi.fn(),
  saveCustomCredentials: vi.fn(),
}))

import {
  settings,
  forceReloadSettings,
  addProvider,
} from '@/stores/settingsStore.svelte.js'
import {
  loadSettingsWithReadiness,
  loadSettingsDirectly,
} from '@/entrypoints/background/settingsBootstrap.js'

describe('background settings bootstrap', () => {
  beforeEach(async () => {
    localArea.data = {}
    await forceReloadSettings()
  })

  it('loadSettings() resolves to the settings object, so strategy 1 can succeed', async () => {
    const { loadSettings } = await import('@/stores/settingsStore.svelte.js')
    const result = await loadSettings()
    expect(result).toBeDefined()
    expect(result.iconClickAction).toBeTruthy()
  })

  it('returns migrated settings including the user provider list', async () => {
    await addProvider('groq')

    const loaded = await loadSettingsWithReadiness()

    expect(loaded).toBeTruthy()
    expect(loaded.iconClickAction).toBeTruthy()
    // Strategy 1 hands back the live store, so provider edits are visible.
    expect(loaded.addedProviders).toEqual(['gemini', 'groq'])
  })

  it('never writes the bogus "local:settings" key, even when every strategy fails', async () => {
    // Force the exact situation the old strategy 3 existed for: storage probe
    // fails (skips strategy 1) and there is nothing to read (fails strategy 2).
    localArea.breakReadiness = true
    localArea.data = {}

    const loaded = await loadSettingsWithReadiness()

    expect(loaded).toBeNull()
    expect(Object.keys(localArea.data)).not.toContain('local:settings')
    localArea.breakReadiness = false
  })

  it('does not clobber real settings when storage starts empty', async () => {
    localArea.data = {}
    await forceReloadSettings()
    await loadSettingsWithReadiness()

    // Defaults are seeded by loadSettings(), under the real key, in full.
    expect(localArea.data.settings).toBeTruthy()
    expect(localArea.data.settings.addedProviders).toEqual(['gemini'])
    // Not the old three-key stub.
    expect(Object.keys(localArea.data.settings).length).toBeGreaterThan(10)
  })

  it('loadSettingsDirectly reads the raw key WXT actually writes', async () => {
    await addProvider('deepseek')
    const direct = await loadSettingsDirectly()
    expect(direct.addedProviders).toEqual(['gemini', 'deepseek'])
  })
})
