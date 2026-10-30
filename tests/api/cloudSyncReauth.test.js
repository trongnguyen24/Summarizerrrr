/**
 * The refresh-token lifecycle: what happens when Google stops accepting the
 * stored grant. For BYOK users this fires on a 7-day cadence whenever their
 * OAuth app is left in "Testing", so the difference between "dead grant" and
 * "transient failure" is load-bearing — and so is not signing the user out.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const CHATS_FILE = 'summarizerrrr-chats.jsonl.gz'

const adapter = {
  findFileMeta: vi.fn(),
  refreshAccessTokenDirect: vi.fn(),
  refreshAccessToken: vi.fn(),
  authenticate: vi.fn(),
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

const permissions = vi.hoisted(() => ({
  checkSpecificPermission: vi.fn(),
  requestSpecificPermission: vi.fn(),
}))
vi.mock('@/services/firefoxPermissionService.js', () => permissions)

const detection = vi.hoisted(() => ({ isFirefox: vi.fn() }))
vi.mock('@/lib/utils/browserDetection.js', () => detection)

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

// Stateful stand-in for the chat store: every write bumps `revision`, the way
// the real repository's readwrite transactions do.
const chatRepo = vi.hoisted(() => ({
  revision: 0,
  conversations: [],
  applyResult: null,
}))

vi.mock('@/lib/db/conversationRepository.js', () => ({
  exportConversationSnapshot: vi.fn(async () => ({
    conversations: chatRepo.conversations.map((conversation) => ({ ...conversation })),
    conversationMessages: [],
    conversationSources: [],
    revision: chatRepo.revision,
  })),
  applyConversationSyncChanges: vi.fn(async ({ upserts = [], purgeIds = [] }) => {
    if (chatRepo.applyResult) return chatRepo.applyResult
    chatRepo.revision++
    return { applied: upserts.length, purged: purgeIds.length, skipped: 0 }
  }),
  getChatRevision: vi.fn(async () => chatRepo.revision),
}))

const {
  syncStorage,
  initSync,
  refreshSyncState,
  login,
  reconnect,
  logout,
  pullData,
  setSyncPreferences,
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

const freshTokens = () => ({
  accessToken: 'fresh-access-token',
  refreshToken: 'fresh-refresh-token',
  expiresAt: Date.now() + 3600 * 1000,
})

const profile = {
  email: 'user@example.com',
  name: 'Test User',
  picture: 'https://example.com/avatar.png',
}

beforeEach(async () => {
  vi.clearAllMocks()
  detection.isFirefox.mockReturnValue(false)
  permissions.checkSpecificPermission.mockResolvedValue(true)
  permissions.requestSpecificPermission.mockResolvedValue(true)
  chatRepo.revision = 0
  chatRepo.conversations = []
  chatRepo.applyResult = null
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

    // Legacy session: initSync migrated it to 'custom', so reconnect stays BYOK.
    await reconnect()
    expect(adapter.authenticateWithCustomCredentials).toHaveBeenCalled()
    expect(adapter.authenticate).not.toHaveBeenCalled()

    const stored = await syncStorage.getValue()
    expect(stored.needsReauth).toBe(false)
    expect(stored.accessToken).toBe('fresh-access-token')
    expect(cloudSyncStore.needsReauth).toBe(false)

    const { browser } = await import('wxt/browser')
    const types = browser.runtime.sendMessage.mock.calls.map(([m]) => m.type)
    expect(types).toContain('SETUP_AUTO_SYNC_ALARM')
  })
})

describe('shared and custom sign-in modes', () => {
  it('a shared login records authMode and later refreshes through the proxy', async () => {
    adapter.authenticate.mockResolvedValue({ ...freshTokens(), expiresAt: Date.now() - 1000 })
    adapter.getUserProfile.mockResolvedValue(profile)

    await login({ mode: 'shared' })
    expect((await syncStorage.getValue()).authMode).toBe('shared')
    expect(cloudSyncStore.authMode).toBe('shared')

    adapter.refreshAccessToken.mockResolvedValue({ accessToken: 'refreshed', expiresAt: Date.now() + 3600 * 1000 })
    await initSync()

    expect(adapter.refreshAccessToken).toHaveBeenCalledWith('fresh-refresh-token')
    expect(adapter.refreshAccessTokenDirect).not.toHaveBeenCalled()
    expect((await syncStorage.getValue()).accessToken).toBe('refreshed')
  })

  it('a dead shared grant flags reconnect without signing out', async () => {
    await seedExpiredSession({ authMode: 'shared' })
    adapter.refreshAccessToken.mockRejectedValue(oauthError('invalid_grant'))

    await initSync()

    const stored = await syncStorage.getValue()
    expect(stored.needsReauth).toBe(true)
    expect(stored.isLoggedIn).toBe(true)
    expect(cloudSyncStore.syncError).toBe('Your Google session expired. Sign in again.')
  })

  it('migrates a legacy session to custom and refreshes it directly', async () => {
    await seedExpiredSession({ authMode: undefined })
    adapter.refreshAccessTokenDirect.mockResolvedValue({ accessToken: 'refreshed', expiresAt: Date.now() + 3600 * 1000 })

    await initSync()

    expect((await syncStorage.getValue()).authMode).toBe('custom')
    expect(adapter.refreshAccessTokenDirect).toHaveBeenCalledWith('stored-refresh-token', 'client-id', 'client-secret')
    expect(adapter.refreshAccessToken).not.toHaveBeenCalled()
  })

  it('a shared session keeps using the proxy even after BYOK credentials are saved', async () => {
    // seedExpiredSession stores customCredentials; authMode, not their presence, decides.
    await seedExpiredSession({ authMode: 'shared' })
    adapter.refreshAccessToken.mockResolvedValue({ accessToken: 'refreshed', expiresAt: Date.now() + 3600 * 1000 })

    await initSync()

    expect(adapter.refreshAccessToken).toHaveBeenCalled()
    expect(adapter.refreshAccessTokenDirect).not.toHaveBeenCalled()
  })
})

describe('Firefox proxy permission', () => {
  beforeEach(() => {
    detection.isFirefox.mockReturnValue(true)
  })

  it('a missing permission fails the refresh without flagging reconnect', async () => {
    await seedExpiredSession({ authMode: 'shared' })
    permissions.checkSpecificPermission.mockResolvedValue(false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await initSync()

    const startupError = warn.mock.calls.find(([msg]) => String(msg).includes('Startup token refresh failed'))?.[1]
    warn.mockRestore()
    expect(startupError?.code).toBe('proxy_permission_missing')
    expect(adapter.refreshAccessToken).not.toHaveBeenCalled()
    const stored = await syncStorage.getValue()
    expect(stored.needsReauth).toBe(false)
    expect(stored.refreshToken).toBe('stored-refresh-token')
    expect(cloudSyncStore.needsReauth).toBe(false)
    expect(cloudSyncStore.needsProxyPermission).toBe(true)
  })

  it('refreshSyncState derives the banner from permissions, with no refresh in this context', async () => {
    await seedExpiredSession({ authMode: 'shared' })
    permissions.checkSpecificPermission.mockResolvedValue(false)

    await refreshSyncState()
    expect(adapter.refreshAccessToken).not.toHaveBeenCalled()
    expect(cloudSyncStore.needsProxyPermission).toBe(true)

    permissions.checkSpecificPermission.mockResolvedValue(true)
    await refreshSyncState()
    expect(cloudSyncStore.needsProxyPermission).toBe(false)
  })

  it('reconnect checks the permission before opening the OAuth flow', async () => {
    await seedExpiredSession({ authMode: 'shared', needsReauth: true })
    permissions.checkSpecificPermission.mockResolvedValue(false)

    await expect(reconnect()).rejects.toMatchObject({ code: 'proxy_permission_missing' })
    expect(adapter.authenticate).not.toHaveBeenCalled()
  })

  it('logout resets needsProxyPermission and authMode', async () => {
    await seedExpiredSession({ authMode: 'shared' })
    permissions.checkSpecificPermission.mockResolvedValue(false)
    await refreshSyncState()
    expect(cloudSyncStore.needsProxyPermission).toBe(true)

    await logout(false)

    expect(cloudSyncStore.needsProxyPermission).toBe(false)
    expect(cloudSyncStore.authMode).toBeNull()
    expect((await syncStorage.getValue()).authMode).toBeNull()
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

describe('chats sync skip', () => {
  const chatDownloads = () =>
    adapter.getFileJsonl.mock.calls.filter(([, name]) => name === CHATS_FILE)

  /** Drive file currently in Drive, with the modifiedTime Drive would report. */
  function cloudChatsFile(modifiedTime = 'T1') {
    adapter.findFileMeta.mockImplementation(async (_token, name) =>
      name === CHATS_FILE ? { id: 'chats-file-id', modifiedTime } : null
    )
    adapter.getFileJsonl.mockImplementation(async (_token, name) =>
      name === CHATS_FILE ? { meta: { version: 2, updatedAt: 0 }, conversations: {}, chatSources: {} } : null
    )
  }

  beforeEach(async () => {
    // clearAllMocks keeps implementations; reset the ones these cases set.
    adapter.findFileMeta.mockReset()
    adapter.getFileJsonl.mockReset()
    adapter.saveFileJsonl.mockReset()
    await seedExpiredSession({ tokenExpiry: Date.now() + 60 * 60 * 1000 })
  })

  it('persists a marker on a full sync, then a second real pullData skips the chats download', async () => {
    cloudChatsFile('T1')

    await pullData()
    expect(chatDownloads()).toHaveLength(1)
    expect((await syncStorage.getValue()).chatSyncMarker).toEqual({
      cloudModifiedTime: 'T1',
      localRevision: 0,
    })

    adapter.getFileJsonl.mockClear()
    await pullData()

    expect(chatDownloads()).toHaveLength(0)
  })

  it('a local chat write invalidates the marker and forces a full sync', async () => {
    cloudChatsFile('T1')
    await pullData()

    chatRepo.revision++ // a conversation was edited locally
    adapter.getFileJsonl.mockClear()
    await pullData()

    expect(chatDownloads()).toHaveLength(1)
  })

  it('a changed cloud file invalidates the marker and forces a full sync', async () => {
    cloudChatsFile('T1')
    await pullData()

    cloudChatsFile('T2') // another device uploaded
    adapter.getFileJsonl.mockClear()
    await pullData()

    expect(chatDownloads()).toHaveLength(1)
  })

  it('does not commit a marker when a local write lands during the upload', async () => {
    cloudChatsFile('T1')
    chatRepo.conversations = [
      { id: 'local-1', title: 'Local', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', deleted: false },
    ]
    adapter.saveFileJsonl.mockImplementation(async (_token, name) => {
      if (name === CHATS_FILE) chatRepo.revision++ // user writes while the file uploads
      return { id: 'chats-file-id', modifiedTime: 'T2' }
    })

    await pullData()

    expect(adapter.saveFileJsonl).toHaveBeenCalledWith(expect.anything(), CHATS_FILE, expect.anything(), { gzip: true })
    expect((await syncStorage.getValue()).chatSyncMarker).toBeNull()

    adapter.getFileJsonl.mockClear()
    await pullData()
    expect(chatDownloads()).toHaveLength(1) // no marker: the next sync is a full reconcile
  })

  it('does not commit a marker when a conversation was skipped', async () => {
    cloudChatsFile('T1')
    chatRepo.applyResult = { applied: 0, purged: 0, skipped: 1 }
    adapter.getFileJsonl.mockImplementation(async (_token, name) =>
      name === CHATS_FILE
        ? {
            meta: { version: 2, updatedAt: 0 },
            conversations: {
              'cloud-1': {
                id: 'cloud-1',
                updatedAt: '2026-10-01T00:00:00.000Z',
                deleted: false,
                conversation: { id: 'cloud-1', title: 'Cloud', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z', deleted: false },
                messages: [],
              },
            },
            chatSources: {},
          }
        : null
    )

    await pullData()

    const { applyConversationSyncChanges } = await import('@/lib/db/conversationRepository.js')
    expect(applyConversationSyncChanges).toHaveBeenCalled()
    expect((await syncStorage.getValue()).chatSyncMarker).toBeNull()
  })

  it('turning chats sync off drops the marker', async () => {
    cloudChatsFile('T1')
    await pullData()
    expect((await syncStorage.getValue()).chatSyncMarker).not.toBeNull()

    await setSyncPreferences({ chats: false })

    expect((await syncStorage.getValue()).chatSyncMarker).toBeNull()
  })

  it('sign-out drops the marker', async () => {
    cloudChatsFile('T1')
    await pullData()

    await logout(false)

    expect((await syncStorage.getValue()).chatSyncMarker).toBeNull()
  })
})
