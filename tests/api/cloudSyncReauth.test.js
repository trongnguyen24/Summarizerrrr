/**
 * The refresh-token lifecycle: what happens when Google stops accepting the
 * stored grant. For BYOK users this fires on a 7-day cadence whenever their
 * OAuth app is left in "Testing", so the difference between "dead grant" and
 * "transient failure" is load-bearing — and so is not signing the user out.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const adapter = {
  refreshAccessTokenDirect: vi.fn(),
  authenticateWithCustomCredentials: vi.fn(),
  getUserProfile: vi.fn(),
  revokeToken: vi.fn(),
  clearSyncFolderCache: vi.fn(),
  getFile: vi.fn(),
  saveFile: vi.fn(),
  getFileJsonl: vi.fn(),
  saveFileJsonl: vi.fn(),
}

vi.mock('@/services/cloudSync/googleDriveAdapter.js', () => adapter)

vi.mock('wxt/browser', () => ({
  browser: { runtime: { sendMessage: vi.fn().mockResolvedValue({}) } },
}))

vi.mock('@wxt-dev/storage', () => ({
  storage: {
    defineItem: (_key, opts) => {
      let value = structuredClone(opts.defaultValue)
      return {
        getValue: async () => structuredClone(value),
        setValue: async (next) => {
          value = structuredClone(next)
        },
      }
    },
  },
}))

vi.mock('@/stores/settingsStore.svelte.js', () => ({
  settings: {},
  loadSettings: vi.fn(),
  updateSettings: vi.fn(),
  updateSettingsFromCloud: vi.fn(),
  isToolEnabled: () => true,
}))

vi.mock('@/lib/db/indexedDBService.js', () => ({
  getAllSummaries: vi.fn().mockResolvedValue([]),
  getAllHistory: vi.fn().mockResolvedValue([]),
  getAllTags: vi.fn().mockResolvedValue([]),
  addMultipleSummaries: vi.fn(),
  addMultipleHistory: vi.fn(),
  softDeleteSummary: vi.fn(),
  softDeleteTag: vi.fn(),
  softDeleteHistory: vi.fn(),
  replaceSummariesStore: vi.fn(),
  replaceHistoryStore: vi.fn(),
  replaceTagsStore: vi.fn(),
}))

const {
  syncStorage,
  initSync,
  login,
  logout,
  cloudSyncStore,
} = await import('@/services/cloudSync/cloudSyncService.svelte.js')

/** A session whose access token expired an hour ago. */
async function seedExpiredSession(overrides = {}) {
  const current = await syncStorage.getValue()
  await syncStorage.setValue({
    ...current,
    isLoggedIn: true,
    needsReauth: false,
    deviceId: 'device-1',
    accessToken: 'stale-access-token',
    refreshToken: 'stored-refresh-token',
    tokenExpiry: Date.now() - 60 * 60 * 1000,
    autoSyncEnabled: true,
    lastSyncTime: '2026-07-01T00:00:00.000Z',
    needsSettingsConflictCheck: false,
    userEmail: 'user@example.com',
    userName: 'Test User',
    userPicture: 'https://example.com/avatar.png',
    customCredentials: { clientId: 'client-id', clientSecret: 'client-secret' },
    ...overrides,
  })
}

function oauthError(code) {
  const error = new Error(`refresh failed: ${code}`)
  error.code = code
  return error
}

beforeEach(async () => {
  vi.clearAllMocks()
  // Reset the module's persisted state between cases.
  await logout(false)
})

describe('a refresh token Google no longer accepts', () => {
  it('flags the session for reconnect instead of signing the user out', async () => {
    await seedExpiredSession()
    adapter.refreshAccessTokenDirect.mockRejectedValue(oauthError('invalid_grant'))

    await initSync()

    const stored = await syncStorage.getValue()
    expect(stored.needsReauth).toBe(true)
    expect(stored.isLoggedIn).toBe(true)
    expect(stored.userEmail).toBe('user@example.com')
    expect(cloudSyncStore.needsReauth).toBe(true)
  })

  it('clears the dead tokens it can no longer use', async () => {
    await seedExpiredSession()
    adapter.refreshAccessTokenDirect.mockRejectedValue(oauthError('invalid_grant'))

    await initSync()

    const stored = await syncStorage.getValue()
    expect(stored.accessToken).toBeNull()
    expect(stored.refreshToken).toBeNull()
    expect(stored.tokenExpiry).toBeNull()
  })

  it('does not re-arm the settings conflict dialog', async () => {
    // Same account either side of the reconnect — there is nothing to reconcile,
    // and a weekly conflict prompt for an event the user did not cause is noise.
    await seedExpiredSession()
    adapter.refreshAccessTokenDirect.mockRejectedValue(oauthError('invalid_grant'))

    await initSync()

    expect((await syncStorage.getValue()).needsSettingsConflictCheck).toBe(false)
  })

  it('leaves auto-sync off until the user reconnects', async () => {
    await seedExpiredSession()
    adapter.refreshAccessTokenDirect.mockRejectedValue(oauthError('invalid_grant'))

    await initSync()

    const { browser } = await import('wxt/browser')
    const types = browser.runtime.sendMessage.mock.calls.map(([m]) => m.type)
    expect(types).toContain('CLEAR_AUTO_SYNC_ALARM')
    expect(types).not.toContain('SETUP_AUTO_SYNC_ALARM')
  })
})

describe('a transient refresh failure', () => {
  it('keeps the session alive', async () => {
    // Offline at browser start, or a 5xx from Google: retrying works, so tearing
    // the session down here would log people out over a blip.
    await seedExpiredSession()
    adapter.refreshAccessTokenDirect.mockRejectedValue(new Error('Failed to fetch'))

    await initSync()

    const stored = await syncStorage.getValue()
    expect(stored.needsReauth).toBe(false)
    expect(stored.isLoggedIn).toBe(true)
    expect(stored.refreshToken).toBe('stored-refresh-token')
  })
})

describe('reconnecting', () => {
  it('clears the flag and puts the auto-sync alarm back', async () => {
    await seedExpiredSession()
    adapter.refreshAccessTokenDirect.mockRejectedValue(oauthError('invalid_grant'))
    await initSync()
    expect((await syncStorage.getValue()).needsReauth).toBe(true)

    adapter.authenticateWithCustomCredentials.mockResolvedValue({
      accessToken: 'fresh-access-token',
      refreshToken: 'fresh-refresh-token',
      expiresAt: Date.now() + 3600 * 1000,
    })
    adapter.getUserProfile.mockResolvedValue({
      email: 'user@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.png',
    })
    vi.clearAllMocks()

    await login()

    const stored = await syncStorage.getValue()
    expect(stored.needsReauth).toBe(false)
    expect(stored.accessToken).toBe('fresh-access-token')
    expect(cloudSyncStore.needsReauth).toBe(false)

    const { browser } = await import('wxt/browser')
    const types = browser.runtime.sendMessage.mock.calls.map(([m]) => m.type)
    expect(types).toContain('SETUP_AUTO_SYNC_ALARM')
  })
})

describe('an explicit sign-out', () => {
  it('still re-arms the settings conflict check for the next account', async () => {
    await seedExpiredSession()

    await logout(false)

    const stored = await syncStorage.getValue()
    expect(stored.isLoggedIn).toBe(false)
    expect(stored.needsReauth).toBe(false)
    expect(stored.needsSettingsConflictCheck).toBe(true)
  })
})
