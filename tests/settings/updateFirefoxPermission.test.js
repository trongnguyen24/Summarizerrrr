import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockStorage = vi.hoisted(() => ({
  value: {},
  async getValue() {
    return this.value
  },
  async setValue(val) {
    this.value = val
  },
  watch: vi.fn(),
}))

vi.mock('@/services/wxtStorageService.js', () => ({
  settingsStorage: mockStorage,
}))

const triggerSync = vi.hoisted(() => vi.fn())
vi.mock('@/services/cloudSync/cloudSyncService.svelte.js', () => ({
  triggerSync,
  saveCustomCredentials: vi.fn(),
}))

import {
  settings,
  forceReloadSettings,
  addProvider,
  updateSettings,
  updateFirefoxPermission,
  addOpenAICompatibleProfile,
} from '@/stores/settingsStore.svelte.js'

/**
 * Regression guard for the Firefox-only "added providers vanish" bug.
 *
 * `updateFirefoxPermission` used to route its one-key patch through
 * `updateSettingsFromCloud`, which sets `isFullIngress: true` and therefore ran
 * the patch through `normalizeStoredSettings`. Every migration step in there
 * treats an absent key as "never migrated" — so a patch of
 * `{ firefoxPermissions }` alone got `addedProviders` re-seeded to `['gemini']`
 * and `openaiCompatibleProfiles` reset to `[]`, wiping the user's provider list
 * on the next permission check. Chrome never hit it because
 * `updateFirefoxPermission` is Firefox-only.
 */
describe('updateFirefoxPermission does not reset unrelated settings', () => {
  beforeEach(async () => {
    mockStorage.value = {}
    triggerSync.mockClear()
    await forceReloadSettings()
  })

  it('keeps addedProviders after a permission write', async () => {
    await addProvider('groq')
    await updateSettings({ groqApiKey: 'gsk_test' })
    expect(settings.addedProviders).toEqual(['gemini', 'groq'])

    await updateFirefoxPermission('httpsPermission', true)

    expect(settings.addedProviders).toEqual(['gemini', 'groq'])
    expect(mockStorage.value.addedProviders).toEqual(['gemini', 'groq'])
    expect(settings.firefoxPermissions.httpsPermission).toBe(true)
  })

  it('keeps providers that have no API key yet', async () => {
    // The seeding path rebuilt the list from *configured* providers only, so an
    // added-but-not-yet-keyed provider was the most fragile case.
    await addProvider('deepseek')
    expect(settings.addedProviders).toEqual(['gemini', 'deepseek'])

    await updateFirefoxPermission('httpsPermission', true)

    expect(settings.addedProviders).toEqual(['gemini', 'deepseek'])
  })

  it('keeps openaiCompatibleProfiles after a permission write', async () => {
    const profileId = await addOpenAICompatibleProfile({
      name: 'My server',
      baseUrl: 'https://example.com/v1',
      apiKey: 'sk-local',
      defaultModel: 'my-model',
    })
    expect(settings.openaiCompatibleProfiles).toHaveLength(1)

    await updateFirefoxPermission('httpsPermission', true)

    expect(settings.openaiCompatibleProfiles).toHaveLength(1)
    expect(settings.openaiCompatibleProfiles[0].id).toBe(profileId)
  })

  it('keeps the summarize/chat feature blocks after a permission write', async () => {
    await addProvider('groq')
    await updateSettings({
      groqApiKey: 'gsk_test',
      summarize: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    })

    await updateFirefoxPermission('httpsPermission', true)

    expect(settings.summarize.provider).toBe('groq')
    expect(settings.summarize.model).toBe('llama-3.3-70b-versatile')
  })

  it('still does not trigger a cloud sync (it is internal caching)', async () => {
    triggerSync.mockClear()
    await updateFirefoxPermission('httpsPermission', true)
    expect(triggerSync).not.toHaveBeenCalled()
  })
})
