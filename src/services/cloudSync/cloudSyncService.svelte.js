// @ts-nocheck
/**
 * Cloud Sync Service v2
 * Architecture: 4 files (settings.json, history.jsonl, library.jsonl, chats.jsonl.gz)
 * - Settings: Last Write Wins
 * - History: Append-only Map Merge
 * - Library (Archive + Tags): Smart Merge with Soft Delete
 * - Chats (Conversations + Sources): Last Write Wins per conversation, with tombstones
 */

import { storage } from '@wxt-dev/storage'
import { browser } from 'wxt/browser'
import {
  authenticate,
  authenticateWithCustomCredentials,
  refreshAccessToken,
  refreshAccessTokenDirect,
  revokeToken,
  getFile,
  findFileMeta,
  saveFile,
  getFileJsonl,
  saveFileJsonl,
  getUserProfile,
  clearSyncFolderCache,
} from './googleDriveAdapter.js'
import {
  getAllSummaries,
  getAllHistory,
  getAllTags,
  addMultipleSummaries,
  addMultipleHistory,
  softDeleteSummary,
  softDeleteTag,
  softDeleteHistory,
  replaceSummariesStore,
  replaceHistoryStore,
  replaceTagsStore,
} from '@/lib/db/indexedDBService.js'
import { settings, loadSettings, updateSettings, updateSettingsFromCloud, isToolEnabled } from '@/stores/settingsStore.svelte.js'
import { generateUUID } from '@/lib/utils/utils.js'
import { buildLocalChatItems, mergeChatData } from '@/lib/db/conversationSyncMerge.js'
import { checkSpecificPermission, requestSpecificPermission } from '@/services/firefoxPermissionService.js'
import { isFirefox } from '@/lib/utils/browserDetection.js'

// Host permission the shared sign-in needs on Firefox (optional, user-granted)
export const PROXY_ORIGIN_PATTERN = 'https://oauth.summarizerrrr.com/*'

// File names on Google Drive
const FILES = {
  SETTINGS: 'summarizerrrr-settings.json',
  HISTORY: 'summarizerrrr-history.jsonl',
  LIBRARY: 'summarizerrrr-library.jsonl', // Archive + Tags combined for atomic sync
  CHATS: 'summarizerrrr-chats.jsonl.gz', // Conversations + captured sources (gzipped JSONL)
}

const DEFAULT_SYNC_PREFERENCES = {
  settings: true,
  history: true,
  library: true,
  chats: true,
}

/** Stored preferences predate the `chats` key; a missing key means on. */
function withDefaultPreferences(preferences) {
  return { ...DEFAULT_SYNC_PREFERENCES, ...(preferences || {}) }
}

// Soft delete cleanup threshold (30 days in ms)
const SOFT_DELETE_CLEANUP_MS = 30 * 24 * 60 * 60 * 1000

// --- Storage Definition ---
export const syncStorage = storage.defineItem('local:syncState', {
  defaultValue: {
    isLoggedIn: false,
    // Google refused the stored refresh token (see markNeedsReauth). The account
    // stays "logged in" so the UI keeps the profile and can offer Reconnect,
    // but every sync path is gated off until the user re-authorises.
    needsReauth: false,
    autoSyncEnabled: null, // null = chưa hỏi, true/false = user đã chọn
    lastSyncTime: null,
    needsSettingsConflictCheck: true, // Flag to show settings conflict dialog on first sync after login
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    deviceId: null,
    userEmail: null,
    userName: null,
    userPicture: null,
    syncPreferences: {
      settings: true,
      history: true,
      library: true, // Archive + Tags combined
      chats: true,
    },
    // Which OAuth client issued the stored refresh token: 'shared' (default
    // client via oauth.summarizerrrr.com) | 'custom' (BYOK). Refresh must use the
    // same client, so this is never inferred from customCredentials, which the
    // user can edit after signing in.
    authMode: null,
    // BYOK (Bring Your Own Key) credentials, used when authMode === 'custom'
    customCredentials: null, // { clientId, clientSecret } or null
    // Chats sync skip marker: { cloudModifiedTime, localRevision } recorded after
    // a chats sync that left both sides identical. null = next sync is full.
    chatSyncMarker: null,
  },
})

// --- State ---
let syncState = $state({
  isLoggedIn: false,
  needsReauth: false,
  authMode: null,
  // Firefox revoked (or never granted) the proxy host permission for a shared
  // session. Derived from permissions.contains() — see computeNeedsProxyPermission.
  needsProxyPermission: false,
  autoSyncEnabled: null,
  lastSyncTime: null,
  isSyncing: false,
  syncError: null,
  userEmail: null,
  userName: null,
  userPicture: null,
  syncPreferences: { ...DEFAULT_SYNC_PREFERENCES },
})

// Debug logs store
let debugLogs = $state([])

// Pending settings conflict for first-time sync
let pendingSettingsConflict = $state(null)
// Structure: { localSettings, cloudSettings, localTimestamp, cloudTimestamp }

function logToUI(msg, type = 'info') {
  console.log(`[CloudSync] ${msg}`)
  debugLogs.unshift({ time: new Date().toLocaleTimeString(), msg, type })
  if (debugLogs.length > 20) debugLogs.pop()
}

let syncInterval = null
const AUTO_SYNC_INTERVAL = 10 * 60 * 1000 // 10 minutes
const DEBOUNCE_DELAY = 10 * 1000 // 10 seconds
let debounceTimer = null
let pendingSync = false // Track if there are pending changes while syncing

// Token cache to avoid reading from storage every time
let tokenCache = {
  accessToken: null,
  tokenExpiry: null,
  lastUpdated: 0
}

// --- Initialization ---

/**
 * Initialize sync service on extension load
 */
export async function initSync() {
  if (!isToolEnabled('cloudSync')) return
  
  try {
    const stored = await syncStorage.getValue()
    
    // Generate device ID if not exists
    if (!stored.deviceId) {
      stored.deviceId = generateUUID()
      await syncStorage.setValue(stored)
    }
    
    // Every session that predates authMode was signed in with BYOK
    if (stored.isLoggedIn && !stored.authMode) {
      stored.authMode = 'custom'
      await syncStorage.setValue(stored)
    }

    syncState.isLoggedIn = stored.isLoggedIn
    syncState.needsReauth = !!stored.needsReauth
    syncState.authMode = stored.authMode || null
    syncState.autoSyncEnabled = stored.autoSyncEnabled
    syncState.lastSyncTime = stored.lastSyncTime
    syncState.userEmail = stored.userEmail
    syncState.userName = stored.userName
    syncState.userPicture = stored.userPicture

    // Migrate old preferences format if needed
    if (stored.syncPreferences?.archive !== undefined && stored.syncPreferences?.library === undefined) {
      stored.syncPreferences.library = stored.syncPreferences.archive
      delete stored.syncPreferences.archive
      await syncStorage.setValue(stored)
    }
    
    syncState.syncPreferences = withDefaultPreferences(stored.syncPreferences)
    syncState.needsProxyPermission = await computeNeedsProxyPermission(stored)
    
    // If logged in, check token validity and start auto-sync
    if (stored.isLoggedIn && stored.accessToken && !stored.needsReauth) {
      if (isTokenExpired(stored.tokenExpiry)) {
        try {
          await doRefreshToken()
        } catch (error) {
          // A dead refresh token has already flipped needsReauth inside
          // doRefreshToken; anything else (offline at browser start, 5xx) is
          // transient, so the session is left intact for the next sync to retry.
          console.warn('[CloudSync] Startup token refresh failed:', error)
        }
      }

      // Re-read: doRefreshToken may have flagged the session dead just above.
      const afterRefresh = await syncStorage.getValue()
      if (afterRefresh.autoSyncEnabled && !afterRefresh.needsReauth) {
        startAutoSync()
      }
    }
  } catch (error) {
    console.error('Failed to initialize sync:', error)
  }
}

/**
 * Refresh sync state from storage (for UI updates only, no auto-sync setup)
 * Use this for periodic UI refresh to avoid spamming alarm setup
 */
export async function refreshSyncState() {
  if (!isToolEnabled('cloudSync')) return
  
  try {
    const stored = await syncStorage.getValue()
    
    syncState.isLoggedIn = stored.isLoggedIn
    syncState.needsReauth = !!stored.needsReauth
    syncState.authMode = stored.authMode || null
    syncState.autoSyncEnabled = stored.autoSyncEnabled
    syncState.lastSyncTime = stored.lastSyncTime
    syncState.userEmail = stored.userEmail
    syncState.userName = stored.userName
    syncState.userPicture = stored.userPicture
    syncState.syncPreferences = withDefaultPreferences(stored.syncPreferences)
    syncState.needsProxyPermission = await computeNeedsProxyPermission(stored)
  } catch (error) {
    console.error('Failed to refresh sync state:', error)
  }
}

/**
 * Check if access token is expired
 */
function isTokenExpired(expiryTime) {
  if (!expiryTime) return true
  return Date.now() >= expiryTime - 60000 // 1 minute buffer
}

// Shown in the UI (and the debug log) when the refresh token is dead. The
// 7-day figure is Google's cap on refresh tokens issued by an OAuth app whose
// publishing status is still "Testing" — which is where BYOK users land unless
// they press "Publish app", so it's the overwhelmingly likely cause here.
const REAUTH_HINT =
  'Google rejected the saved session (invalid_grant). If your OAuth app is still in "Testing", its refresh tokens expire after 7 days — publish the app in Google Cloud Console to stop this from repeating.'

// Shared-client sessions: the app is published, so there is nothing to fix on
// the user's side beyond signing in again.
const REAUTH_HINT_SHARED = 'Your Google session expired. Sign in again.'

function reauthHint(authMode) {
  return authMode === 'shared' ? REAUTH_HINT_SHARED : REAUTH_HINT
}

/**
 * Whether a shared Firefox session is missing the proxy host permission.
 * Recomputed from permissions.contains() — the answer is the same in every
 * extension context, so a failure in the background shows up in Settings too.
 */
async function computeNeedsProxyPermission(stored) {
  if (stored.isLoggedIn && stored.authMode === 'shared' && isFirefox()) {
    return !(await checkSpecificPermission(PROXY_ORIGIN_PATTERN))
  }
  return false
}

function proxyPermissionError() {
  return Object.assign(
    new Error('Firefox needs permission to reach oauth.summarizerrrr.com to sign in with Google.'),
    { code: 'proxy_permission_missing' }
  )
}

/**
 * Throws proxy_permission_missing when on Firefox without the proxy permission.
 * Only checks: requesting needs a user gesture, so the UI does that.
 */
async function assertProxyPermission() {
  if (isFirefox() && !(await checkSpecificPermission(PROXY_ORIGIN_PATTERN))) {
    throw proxyPermissionError()
  }
}

/**
 * Flag the session as needing re-authorisation instead of signing the user out.
 *
 * A hard logout wipes the profile and re-arms needsSettingsConflictCheck, so a
 * user whose token expired on a weekly cadence would be dropped to a blank
 * sign-in screen and then get a settings-conflict dialog on the way back in,
 * for an event they did nothing to cause. Keeping the account visible with a
 * Reconnect button costs one flag and removes both.
 *
 * The dead tokens are still cleared — they can't be used again.
 */
async function markNeedsReauth() {
  stopAutoSync()
  tokenCache = { accessToken: null, tokenExpiry: null, lastUpdated: 0 }
  clearSyncFolderCache()

  const stored = await syncStorage.getValue()
  await syncStorage.setValue({
    ...stored,
    needsReauth: true,
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    // Deliberately keep isLoggedIn, the profile fields, lastSyncTime and
    // needsSettingsConflictCheck untouched: this is not a logout.
  })

  syncState.needsReauth = true
  syncState.syncError = reauthHint(stored.authMode)
  logToUI(syncState.syncError, 'error')
}

/**
 * Refresh access token using stored refresh_token, through the same client
 * that issued it (stored.authMode): the proxy for 'shared', Google directly
 * with the user's credentials for 'custom'.
 */
async function doRefreshToken() {
  const stored = await syncStorage.getValue()
  
  if (!stored.refreshToken) {
    throw new Error('No refresh token available. Please sign in again.')
  }

  const authMode = stored.authMode || 'custom'

  if (authMode === 'shared') {
    // The grant is still valid — only the host permission is missing, so this
    // must not go through markNeedsReauth().
    try {
      await assertProxyPermission()
    } catch (error) {
      syncState.needsProxyPermission = true
      throw error
    }
  } else if (!stored.customCredentials?.clientId || !stored.customCredentials?.clientSecret) {
    throw new Error('OAuth credentials missing. Please sign in again.')
  }
  
  try {
    console.log(`[CloudSync] Refreshing token (${authMode} mode)`)
    const { accessToken, expiresAt } = authMode === 'shared'
      ? await refreshAccessToken(stored.refreshToken)
      : await refreshAccessTokenDirect(
          stored.refreshToken,
          stored.customCredentials.clientId,
          stored.customCredentials.clientSecret
        )
    
    // Re-read: the refresh above was a network round-trip, and a sync in another
    // context may have written chatSyncMarker meanwhile.
    const latest = await syncStorage.getValue()
    await syncStorage.setValue({
      ...latest,
      accessToken,
      tokenExpiry: expiresAt,
    })
    
    // Update cache
    tokenCache = {
      accessToken,
      tokenExpiry: expiresAt,
      lastUpdated: Date.now()
    }
    
    return accessToken
  } catch (error) {
    console.error('[CloudSync] Token refresh failed:', error)
    // Only a dead grant is terminal. Network blips, 5xx from Google and the
    // like must not tear the session down — they resolve on the next attempt.
    if (error.code === 'invalid_grant') {
      await markNeedsReauth()
    }
    throw error
  }
}

/**
 * Get valid access token (refresh if needed)
 * Uses in-memory cache to avoid storage reads
 */
async function getValidAccessToken() {
  // Check cache first
  if (tokenCache.accessToken && !isTokenExpired(tokenCache.tokenExpiry)) {
    return tokenCache.accessToken
  }
  
  const stored = await syncStorage.getValue()

  if (stored.needsReauth) {
    tokenCache = { accessToken: null, tokenExpiry: null, lastUpdated: 0 }
    const error = new Error(reauthHint(stored.authMode))
    error.code = 'needs_reauth'
    throw error
  }

  if (!stored.accessToken) {
    tokenCache = { accessToken: null, tokenExpiry: null, lastUpdated: 0 }
    throw new Error('Not logged in')
  }

  let token = stored.accessToken
  let expiry = stored.tokenExpiry
  
  if (isTokenExpired(expiry)) {
    // Try silent refresh with Implicit Flow
    token = await doRefreshToken()
    const updatedStored = await syncStorage.getValue()
    expiry = updatedStored.tokenExpiry
  }
  
  // Update cache
  tokenCache = {
    accessToken: token,
    tokenExpiry: expiry,
    lastUpdated: Date.now()
  }
  
  return token
}

// --- Auth Functions ---

/**
 * Login with Google
 * @param {{ mode?: 'shared' | 'custom' }} [options] - 'shared' (default): the
 *   published client via the token proxy. 'custom': the user's own OAuth client.
 * @returns {Promise<{needsAutoSyncChoice: boolean}>}
 */
export async function login({ mode = 'shared' } = {}) {
  syncState.syncError = null
  
  try {
    let tokens
    if (mode === 'custom') {
      const stored = await syncStorage.getValue()
      const customCreds = stored.customCredentials

      if (!customCreds?.clientId || !customCreds?.clientSecret) {
        throw new Error('OAuth credentials required. Please save your Client ID and Client Secret first.')
      }

      console.log('[CloudSync] Logging in with custom credentials')
      tokens = await authenticateWithCustomCredentials(
        customCreds.clientId,
        customCreds.clientSecret
      )
    } else {
      // Checked before the OAuth window opens: without the permission the
      // flow would complete and then fail at /exchange.
      await assertProxyPermission()
      console.log('[CloudSync] Logging in with the shared client')
      tokens = await authenticate()
    }
    const { accessToken, refreshToken: newRefreshToken, expiresAt } = tokens
    
    // Get user profile
    const profile = await getUserProfile(accessToken)
    
    const freshStored = await syncStorage.getValue()
    const isFirstLogin = freshStored.autoSyncEnabled === null
    
    // Update storage with profile and auth info
    const updatedState = {
      ...freshStored,
      isLoggedIn: true,
      needsReauth: false, // Fresh grant — clears any pending Reconnect prompt
      authMode: mode,
      accessToken,
      refreshToken: newRefreshToken,
      tokenExpiry: expiresAt,
      userEmail: profile.email,
      userName: profile.name,
      userPicture: profile.picture,
      // Possibly a different account: the marker described the old one's file.
      chatSyncMarker: null,
    }

    // Set default sync mode on first login
    if (isFirstLogin) {
      updatedState.autoSyncEnabled = false
    }
    
    await syncStorage.setValue(updatedState)
    
    syncState.isLoggedIn = true
    syncState.needsReauth = false
    syncState.authMode = mode
    syncState.needsProxyPermission = false
    syncState.syncError = null
    syncState.userEmail = profile.email
    syncState.userName = profile.name
    syncState.userPicture = profile.picture
    syncState.lastSyncTime = (await syncStorage.getValue()).lastSyncTime
    syncState.autoSyncEnabled = updatedState.autoSyncEnabled
    syncState.syncPreferences = withDefaultPreferences(freshStored.syncPreferences)

    // markNeedsReauth() cleared the alarm when the grant died; a reconnect has
    // to put it back, otherwise auto-sync stays silently off.
    if (updatedState.autoSyncEnabled) {
      startAutoSync()
    }

    return {}
  } catch (error) {
    console.error('Login failed:', error)
    syncState.syncError = error.message
    throw error
  }
}

/**
 * Re-authorise an account whose refresh token died, without losing the session.
 * Same OAuth round-trip as login(); named separately so the UI reads honestly
 * and so the two intents stay distinguishable if they ever diverge.
 */
export async function reconnect() {
  const stored = await syncStorage.getValue()
  return await login({ mode: stored.authMode || 'custom' })
}

/**
 * Logout
 * @param {boolean} revokeAccess - Whether to revoke access on Google side
 */
export async function logout(revokeAccess = true) {
  try {
    if (revokeAccess) {
      const stored = await syncStorage.getValue()
      if (stored.accessToken) {
        await revokeToken(stored.accessToken)
      }
    }
  } catch (error) {
    console.error('Failed to revoke token:', error)
  }
  
  stopAutoSync()
  
  // Clear caches on logout (important for multi-account support)
  tokenCache = { accessToken: null, tokenExpiry: null, lastUpdated: 0 }
  clearSyncFolderCache() // Clear folder ID cache to avoid using wrong account's folder
  
  const stored = await syncStorage.getValue()
  
  await syncStorage.setValue({
    ...stored,
    isLoggedIn: false,
    needsReauth: false,
    authMode: null,
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    userEmail: null,
    userName: null,
    userPicture: null,
    chatSyncMarker: null,
    // Only a deliberate sign-out re-arms this: the next login may be a
    // different Google account, so its settings genuinely need reconciling.
    // An expired-token reconnect goes through markNeedsReauth() and leaves it
    // alone — same account, nothing to reconcile.
    needsSettingsConflictCheck: true,
    // Note: Keep lastSyncTime so UI can still show last sync time
  })

  syncState.isLoggedIn = false
  syncState.needsReauth = false
  syncState.authMode = null
  syncState.needsProxyPermission = false
  syncState.syncError = null
  syncState.userEmail = null
  syncState.userName = null
  syncState.userPicture = null
  // Note: Don't reset syncState.lastSyncTime so it can still be displayed in UI
  
  // Clear any pending conflict
  pendingSettingsConflict = null
}


// --- Utility Functions ---

/**
 * Convert array to map by ID
 */
function arrayToMap(arr) {
  const map = {}
  if (!arr || !Array.isArray(arr)) return map
  arr.forEach(item => {
    if (item && item.id) {
      map[item.id] = item
    }
  })
  return map
}

/**
 * Convert map to array
 */
function mapToArray(map) {
  if (!map || typeof map !== 'object') return []
  return Object.values(map)
}

/**
 * Get item timestamp for comparison
 */
function getItemTimestamp(item) {
  return new Date(item.updatedAt || item.createdAt || item.date || 0).getTime()
}

/**
 * Clean up soft-deleted items older than threshold
 */
function cleanupSoftDeleted(itemsMap) {
  const now = Date.now()
  const cleaned = {}
  
  for (const [id, item] of Object.entries(itemsMap)) {
    if (item.deleted) {
      const deletedTime = getItemTimestamp(item)
      if (now - deletedTime < SOFT_DELETE_CLEANUP_MS) {
        // Keep soft-deleted items within 30 days
        cleaned[id] = item
      }
      // Else: Hard delete (don't include in cleaned map)
    } else {
      cleaned[id] = item
    }
  }
  
  return cleaned
}

// --- Sync Functions ---

/**
 * Main sync function - Pull and merge data from cloud
 * @param {boolean} _isRetry - Internal flag to prevent infinite retry loops (do not use externally)
 */
export async function pullData(_isRetry = false) {
  if (!isToolEnabled('cloudSync')) return
  if (syncState.isSyncing) return

  // No point burning a network round-trip (or the alarm's wake-up) while the
  // grant is dead — nothing works until the user reconnects.
  const preflight = await syncStorage.getValue()
  if (preflight.needsReauth) {
    syncState.needsReauth = true
    logToUI('Sync skipped: reconnect required', 'error')
    return
  }

  syncState.isSyncing = true
  syncState.syncError = null
  logToUI('Starting sync...')
  
  try {
    const accessToken = await getValidAccessToken()
    const stored = await syncStorage.getValue()
    const prefs = syncState.syncPreferences
    
    // Fetch cloud files in parallel based on preferences
    logToUI('Fetching cloud data...')
    const fetchPromises = []
    
    if (prefs.settings) fetchPromises.push(getFile(accessToken, FILES.SETTINGS))
    else fetchPromises.push(Promise.resolve(null))
    
    // Use JSONL format for history and library
    if (prefs.history) fetchPromises.push(getFileJsonl(accessToken, FILES.HISTORY))
    else fetchPromises.push(Promise.resolve(null))
    
    if (prefs.library) fetchPromises.push(getFileJsonl(accessToken, FILES.LIBRARY))
    else fetchPromises.push(Promise.resolve(null))

    // Chats: metadata only. syncChats downloads the file itself, and only when
    // it has changed since the last sync or local chats have changed.
    if (prefs.chats) fetchPromises.push(findFileMeta(accessToken, FILES.CHATS))
    else fetchPromises.push(Promise.resolve(null))

    const [settingsFile, historyFile, libraryFile, chatsMeta] = await Promise.all(fetchPromises)

    const hasCloudData = settingsFile || historyFile || libraryFile || chatsMeta

    if (!hasCloudData) {
      // No cloud data - push local data for first time
      logToUI('No cloud data found, pushing local data...')
      await pushAllData(accessToken)
      return
    }

    // Sync each data type
    if (prefs.settings) {
      await syncSettings(accessToken, settingsFile, stored)
    }

    if (prefs.history) {
      await syncHistory(accessToken, historyFile)
    }

    if (prefs.library) {
      await syncLibrary(accessToken, libraryFile)
    }

    let chatMarkerUpdate = {}
    if (prefs.chats) {
      chatMarkerUpdate = { chatSyncMarker: await syncChats(accessToken, chatsMeta) }
    }

    // Update last sync time ONLY if there's no pending settings conflict
    // If there's a pending conflict, we need to wait for user to resolve it.
    // The chats marker is written either way: it describes chats, not settings.
    // Re-read storage first: another context may have written meanwhile, and
    // spreading the stale `stored` would overwrite its changes.
    const latest = await syncStorage.getValue()
    if (!pendingSettingsConflict) {
      const now = new Date().toISOString()
      await syncStorage.setValue({
        ...latest,
        lastSyncTime: now,
        ...chatMarkerUpdate,
      })

      syncState.lastSyncTime = now
      logToUI('Sync completed successfully', 'success')
    } else {
      await syncStorage.setValue({ ...latest, ...chatMarkerUpdate })
      logToUI('Sync paused - waiting for settings conflict resolution', 'info')
    }
  } catch (error) {
    console.error('Sync failed:', error)
    
    // Auto-retry on TOKEN_EXPIRED (only once to prevent infinite loops)
    // This handles the case where token expires mid-sync during background alarm
    if (error.message === 'TOKEN_EXPIRED' && !_isRetry) {
      logToUI('Token expired mid-sync, refreshing and retrying...', 'info')
      
      // Clear token cache to force refresh
      tokenCache = { accessToken: null, tokenExpiry: null, lastUpdated: 0 }
      
      try {
        await doRefreshToken()
        logToUI('Token refreshed successfully, retrying sync...', 'info')
        
        // Reset syncing state before retry
        syncState.isSyncing = false
        
        // Retry sync with _isRetry flag to prevent infinite loops
        return pullData(true)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        // markNeedsReauth() has already logged the actionable message for a
        // dead grant, and a missing proxy permission has its own banner; don't
        // bury either under a generic error.
        if (refreshError.code === 'proxy_permission_missing') {
          logToUI('Sync skipped: Firefox permission for oauth.summarizerrrr.com is missing', 'info')
        } else if (refreshError.code !== 'invalid_grant') {
          logToUI(`Token refresh failed: ${refreshError.message}`, 'error')
          syncState.syncError = `Token refresh failed: ${refreshError.message}`
        }
      }
    } else if (error.code === 'proxy_permission_missing') {
      // The UI shows a Grant-access banner for this; no error toast.
      logToUI('Sync skipped: Firefox permission for oauth.summarizerrrr.com is missing', 'info')
    } else {
      logToUI(`Sync failed: ${error.message}`, 'error')
      syncState.syncError = error.message
    }
  } finally {
    syncState.isSyncing = false
    
    // Check if there were changes during sync, trigger another sync
    if (pendingSync) {
      pendingSync = false
      logToUI('Pending changes detected, scheduling sync...', 'info')
      debouncedPush()
    }
  }
}

/**
 * Sync Settings - Last Write Wins strategy with first-time conflict detection
 * Uses settings.lastModified for comparison instead of lastSyncTime
 */
async function syncSettings(accessToken, cloudFile, stored) {
  await loadSettings()
  const localSettings = { ...settings }
  
  if (!cloudFile || !cloudFile.data) {
    // No cloud settings, push local
    logToUI('No cloud Settings, pushing local...')
    await saveFile(accessToken, FILES.SETTINGS, {
      version: 2,
      updatedAt: Date.now(),
      data: localSettings,
    })
    return
  }
  
  // Compare settings content to determine if sync needed
  const cloudSettings = cloudFile.data
  const localStr = JSON.stringify(localSettings)
  const cloudStr = JSON.stringify(cloudSettings)
  
  if (localStr === cloudStr) {
    // Settings are identical, no action needed
    logToUI('Settings in sync.')
    return
  }
  
  // Use needsSettingsConflictCheck flag instead of lastSyncTime (so lastSyncTime can still show in UI)
  const needsConflictCheck = stored.needsSettingsConflictCheck !== false
  
  if (needsConflictCheck) {
    // First sync after login with existing cloud data - let user choose
    logToUI('Settings conflict detected, showing dialog...')
    
    const localTime = localSettings.lastModified || 0
    const cloudTime = cloudFile.updatedAt || 0
    
    pendingSettingsConflict = {
      localSettings,
      cloudSettings,
      localTimestamp: localTime,
      cloudTimestamp: cloudTime,
    }
    
    // Don't auto-resolve, wait for user choice
    return
  }
  
  // Normal sync: use lastModified to decide direction
  const cloudTime = cloudFile.updatedAt || 0
  const localTime = localSettings.lastModified || 0
  
  if (cloudTime > localTime) {
    // Cloud is newer, apply to local (using updateSettingsFromCloud to prevent sync loop)
    logToUI('Cloud Settings is newer, applying...')
    await updateSettingsFromCloud(cloudSettings)
  } else if (localTime > cloudTime) {
    // Local is newer, push to cloud
    logToUI('Pushing local Settings...')
    await saveFile(accessToken, FILES.SETTINGS, {
      version: 2,
      updatedAt: Date.now(),
      data: localSettings,
    })
  } else {
    // Same timestamp but different content - push local as it's the current device
    logToUI('Timestamps equal but content differs, pushing local Settings...')
    await saveFile(accessToken, FILES.SETTINGS, {
      version: 2,
      updatedAt: Date.now(),
      data: localSettings,
    })
  }
}

/**
 * Sync History - Smart Merge with Soft Delete
 * Similar to Library sync but for history items
 */
async function syncHistory(accessToken, cloudFile) {
  const localHistory = await getAllHistory()
  const localMap = arrayToMap(localHistory)
  
  if (!cloudFile || !cloudFile.items || Object.keys(cloudFile.items).length === 0) {
    // No cloud history, push local
    logToUI('No cloud History, pushing local...')
    await saveFileJsonl(accessToken, FILES.HISTORY, {
      meta: { version: 2, updatedAt: Date.now() },
      items: localMap,
    })
    return
  }
  
  const cloudMap = cloudFile.items || {}
  
  // Merge using timestamp-based strategy (like Library)
  logToUI('Merging History...')
  const mergedHistory = mergeItemsMap(cloudMap, localMap)
  const cleanedHistory = cleanupSoftDeleted(mergedHistory)
  
  // Apply merged data to local (filter out deleted items for display)
  const historyArray = mapToArray(cleanedHistory).filter(h => !h.deleted)
  
  await replaceHistoryStore(historyArray)
  
  // Check if merged data differs from cloud
  const hasChanges = detectMapChanges(cloudMap, cleanedHistory)
  
  if (hasChanges) {
    logToUI('Pushing merged History...')
    await saveFileJsonl(accessToken, FILES.HISTORY, {
      meta: { version: 2, updatedAt: Date.now() },
      items: cleanedHistory,
    })
  } else {
    logToUI('History in sync.')
  }
}

/**
 * Sync Library (Archive + Tags) - Smart Merge with Soft Delete
 * This ensures atomic sync of related data
 */
async function syncLibrary(accessToken, cloudFile) {
  // Get local data
  const localArchives = await getAllSummaries()
  const localTags = await getAllTags()
  
  const localArchivesMap = arrayToMap(localArchives)
  const localTagsMap = arrayToMap(localTags)
  
  if (!cloudFile || (!cloudFile.archives && !cloudFile.tags) || 
      (Object.keys(cloudFile.archives || {}).length === 0 && Object.keys(cloudFile.tags || {}).length === 0)) {
    // No cloud library, push local
    logToUI('No cloud Library, pushing local...')
    await saveFileJsonl(accessToken, FILES.LIBRARY, {
      meta: { version: 2, updatedAt: Date.now() },
      archives: localArchivesMap,
      tags: localTagsMap,
    })
    return
  }
  
  const cloudArchivesMap = cloudFile.archives || {}
  const cloudTagsMap = cloudFile.tags || {}
  
  // Step 1: Merge Tags first (to ensure tag IDs exist for archives)
  logToUI('Merging Tags...')
  const mergedTags = mergeItemsMap(cloudTagsMap, localTagsMap)
  const cleanedTags = cleanupSoftDeleted(mergedTags)
  
  // Step 2: Merge Archives
  logToUI('Merging Archives...')
  const mergedArchives = mergeItemsMap(cloudArchivesMap, localArchivesMap)
  const cleanedArchives = cleanupSoftDeleted(mergedArchives)
  
  // Step 3: Validate tagIds in archives (remove invalid references)
  for (const archive of Object.values(cleanedArchives)) {
    if (archive.tags && Array.isArray(archive.tags)) {
      archive.tags = archive.tags.filter(tagId => {
        const tag = cleanedTags[tagId]
        return tag && !tag.deleted
      })
    }
  }
  
  // Apply merged data to local
  const tagsArray = mapToArray(cleanedTags).filter(t => !t.deleted)
  const archivesArray = mapToArray(cleanedArchives).filter(a => !a.deleted)
  
  // Clear and replace in atomic operations
  await replaceSummariesStore(archivesArray)
  await replaceTagsStore(tagsArray)
  
  // Check if merged data differs from cloud data
  const hasChanges = detectLibraryChanges(cloudArchivesMap, cloudTagsMap, cleanedArchives, cleanedTags)
  
  if (hasChanges) {
    // Push merged data back to cloud (include soft-deleted for sync)
    logToUI('Pushing merged Library...')
    await saveFileJsonl(accessToken, FILES.LIBRARY, {
      meta: { version: 2, updatedAt: Date.now() },
      archives: cleanedArchives,
      tags: cleanedTags,
    })
  } else {
    logToUI('Library in sync.')
  }
  
  logToUI('Library sync complete.')
}

/**
 * Sync Chats - Last Write Wins per conversation (record + all its messages),
 * tombstones for deletions, sources GC'd to what live conversations reference.
 * Merge rules live in lib/db/conversationSyncMerge.js.
 */
/**
 * @param {string} accessToken
 * @param {{ id: string, modifiedTime: string } | null} cloudMeta  Drive metadata of the chats file (null = no file)
 * @returns {Promise<{ cloudModifiedTime: string | null, localRevision: number } | null>}
 *   The marker to persist, or null when this sync cannot prove both sides match
 *   (the next sync then does a full reconcile).
 */
async function syncChats(accessToken, cloudMeta) {
  const {
    exportConversationSnapshot,
    applyConversationSyncChanges,
    getChatRevision,
  } = await import('@/lib/db/conversationRepository.js')

  // Skip: neither the cloud file nor local chats changed since the last sync
  // that left them identical. Nothing is downloaded.
  const { chatSyncMarker: marker } = await syncStorage.getValue()
  if (
    cloudMeta?.modifiedTime &&
    marker &&
    marker.cloudModifiedTime === cloudMeta.modifiedTime &&
    (await getChatRevision()) === marker.localRevision
  ) {
    logToUI('Chats in sync (skipped).')
    return marker
  }

  // The snapshot carries the revision it was read at (same transaction).
  const snapshot = await exportConversationSnapshot()
  const startRevision = snapshot.revision
  const local = buildLocalChatItems(snapshot)
  const cloudFile = cloudMeta ? await getFileJsonl(accessToken, FILES.CHATS, { gzip: true }) : null

  logToUI('Merging Chats...')
  const result = mergeChatData({
    cloudItems: cloudFile?.conversations || {},
    cloudSources: cloudFile?.chatSources || {},
    local,
    tombstoneTtlMs: SOFT_DELETE_CLEANUP_MS,
  })

  let applied = 0
  let purged = 0
  let skipped = 0
  if (result.upserts.length || result.purgeIds.length) {
    const outcome = await applyConversationSyncChanges({
      upserts: result.upserts,
      purgeIds: result.purgeIds,
      sources: result.sourcesToApply,
    })
    applied = outcome.applied
    purged = outcome.purged
    skipped = outcome.skipped || 0
    logToUI(`Applied ${applied} chat change(s) from cloud.`)
  }

  let uploaded = null
  if (result.hasChanges) {
    logToUI('Pushing merged Chats...')
    uploaded = await saveFileJsonl(accessToken, FILES.CHATS, {
      meta: { version: 2, updatedAt: Date.now() },
      conversations: result.items,
      chatSources: result.sources,
    }, { gzip: true })
  } else {
    logToUI('Chats in sync.')
  }

  // Commit the marker only if this sync provably left the two sides identical:
  //  - nothing was skipped (skipped conversations are not in the uploaded payload);
  //  - the revision moved only by our own apply (one readwrite transaction = +1).
  // Any other movement means a local write landed during the sync and is not in
  // what we uploaded, so no marker and the next sync reconciles.
  const endRevision = await getChatRevision()
  const expectedRevision = startRevision + (applied + purged > 0 ? 1 : 0)
  if (skipped > 0 || endRevision !== expectedRevision) {
    logToUI('Chats changed during sync, the next sync will reconcile fully.', 'info')
    return null
  }

  return {
    cloudModifiedTime: uploaded?.modifiedTime ?? cloudMeta?.modifiedTime ?? null,
    localRevision: endRevision,
  }
}

/**
 * Merge two item maps based on updatedAt timestamp
 * Handles soft-delete propagation
 */
function mergeItemsMap(cloudMap, localMap) {
  const merged = {}
  
  // Start with all cloud items
  for (const [id, cloudItem] of Object.entries(cloudMap)) {
    merged[id] = cloudItem
  }
  
  // Merge local items
  for (const [id, localItem] of Object.entries(localMap)) {
    const cloudItem = merged[id]
    
    if (!cloudItem) {
      // Local only - add to merged
      merged[id] = localItem
    } else {
      // Conflict - pick newer by updatedAt
      const localTime = getItemTimestamp(localItem)
      const cloudTime = getItemTimestamp(cloudItem)
      
      if (localTime >= cloudTime) {
        merged[id] = localItem
      }
      // Else keep cloudItem (already in merged)
    }
  }
  
  return merged
}

/**
 * Detect if library data has changed after merge
 * Returns true if merged data differs from cloud data
 */
function detectLibraryChanges(cloudArchives, cloudTags, mergedArchives, mergedTags) {
  // Quick check: different number of keys
  const cloudArchiveIds = Object.keys(cloudArchives)
  const mergedArchiveIds = Object.keys(mergedArchives)
  const cloudTagIds = Object.keys(cloudTags)
  const mergedTagIds = Object.keys(mergedTags)
  
  if (cloudArchiveIds.length !== mergedArchiveIds.length) return true
  if (cloudTagIds.length !== mergedTagIds.length) return true
  
  // Check if any merged archive differs from cloud
  for (const [id, mergedItem] of Object.entries(mergedArchives)) {
    const cloudItem = cloudArchives[id]
    if (!cloudItem) return true // New item
    
    // Compare by updatedAt - if merged has newer timestamp, there's a change
    const mergedTime = getItemTimestamp(mergedItem)
    const cloudTime = getItemTimestamp(cloudItem)
    if (mergedTime > cloudTime) return true
    
    // Also check deleted status
    if (mergedItem.deleted !== cloudItem.deleted) return true
  }
  
  // Check if any merged tag differs from cloud
  for (const [id, mergedItem] of Object.entries(mergedTags)) {
    const cloudItem = cloudTags[id]
    if (!cloudItem) return true // New item
    
    const mergedTime = getItemTimestamp(mergedItem)
    const cloudTime = getItemTimestamp(cloudItem)
    if (mergedTime > cloudTime) return true
    
    if (mergedItem.deleted !== cloudItem.deleted) return true
  }
  
  return false
}

/**
 * Detect if a merged map differs from cloud map
 * Generic version for single map comparison (used for History)
 */
function detectMapChanges(cloudMap, mergedMap) {
  const cloudIds = Object.keys(cloudMap)
  const mergedIds = Object.keys(mergedMap)
  
  if (cloudIds.length !== mergedIds.length) return true
  
  for (const [id, mergedItem] of Object.entries(mergedMap)) {
    const cloudItem = cloudMap[id]
    if (!cloudItem) return true // New item
    
    const mergedTime = getItemTimestamp(mergedItem)
    const cloudTime = getItemTimestamp(cloudItem)
    if (mergedTime > cloudTime) return true
    
    if (mergedItem.deleted !== cloudItem.deleted) return true
  }
  
  return false
}

/**
 * Push all local data to cloud (initial sync)
 */
async function pushAllData(accessToken) {
  await loadSettings()
  const localSettings = { ...settings }
  const localHistory = await getAllHistory()
  const localArchives = await getAllSummaries()
  const localTags = await getAllTags()
  
  const now = Date.now()
  const prefs = syncState.syncPreferences
  
  const pushPromises = []
  
  if (prefs.settings) {
    pushPromises.push(
      saveFile(accessToken, FILES.SETTINGS, {
        version: 2,
        updatedAt: now,
        data: localSettings,
      })
    )
  }
  
  // Use JSONL format for history and library
  if (prefs.history) {
    pushPromises.push(
      saveFileJsonl(accessToken, FILES.HISTORY, {
        meta: { version: 2, updatedAt: now },
        items: arrayToMap(localHistory),
      })
    )
  }
  
  if (prefs.library) {
    pushPromises.push(
      saveFileJsonl(accessToken, FILES.LIBRARY, {
        meta: { version: 2, updatedAt: now },
        archives: arrayToMap(localArchives),
        tags: arrayToMap(localTags),
      })
    )
  }
  
  let chatMarker = null
  if (prefs.chats) {
    // Same path as a regular sync against an empty cloud file: tombstones and
    // in-flight conversations are handled there.
    pushPromises.push(syncChats(accessToken, null).then((marker) => { chatMarker = marker }))
  }

  await Promise.all(pushPromises)

  // pullData returns right after this, so the marker is persisted here.
  if (prefs.chats) {
    const latest = await syncStorage.getValue()
    await syncStorage.setValue({ ...latest, chatSyncMarker: chatMarker })
  }

  logToUI('Initial push completed')
}

/**
 * Manual sync trigger
 */
export async function syncNow() {
  if (!isToolEnabled('cloudSync')) return
  await pullData()
}

/**
 * Debounced sync to avoid too frequent syncs
 * Note: This function reads directly from storage to ensure correct state
 * even when called from different contexts (popup, settings page, etc.)
 */
async function debouncedPush() {
  // Read directly from storage to ensure we have the latest state
  // This is necessary because syncState may not be initialized in all contexts
  const stored = await syncStorage.getValue()
  
  console.log('[CloudSync] debouncedPush called', {
    isToolEnabled: isToolEnabled('cloudSync'),
    isLoggedIn: stored.isLoggedIn,
    autoSyncEnabled: stored.autoSyncEnabled,
    isSyncing: syncState.isSyncing
  })
  
  if (!isToolEnabled('cloudSync')) {
    console.log('[CloudSync] Sync skipped: cloudSync tool is disabled')
    return
  }
  if (!stored.isLoggedIn || !stored.autoSyncEnabled) {
    console.log('[CloudSync] Sync skipped: not logged in or auto sync disabled')
    return
  }
  if (stored.needsReauth) {
    console.log('[CloudSync] Sync skipped: reconnect required')
    return
  }
  
  // If currently syncing, mark as pending to sync again after current sync completes
  if (syncState.isSyncing) {
    pendingSync = true
    logToUI('Sync in progress, changes will be synced after current sync completes', 'info')
    return
  }
  
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  console.log(`[CloudSync] Scheduling sync in ${DEBOUNCE_DELAY / 1000}s...`)
  debounceTimer = setTimeout(() => {
    pullData()
  }, DEBOUNCE_DELAY)
}

/**
 * Trigger sync after data changes
 * Delegates to background script to ensure timer survives sidepanel/popup closure
 */
export function triggerSync() {
  console.log('[CloudSync] triggerSync called')
  if (!isToolEnabled('cloudSync')) {
    console.log('[CloudSync] triggerSync skipped: cloudSync tool is disabled')
    return
  }
  
  // Send message to background script to handle debounced sync
  // This ensures the sync happens even if sidepanel/popup is closed
  browser.runtime.sendMessage({ type: 'TRIGGER_SYNC' }).catch(error => {
    console.warn('[CloudSync] Failed to send TRIGGER_SYNC to background:', error)
    // Fallback to local debouncedPush if message fails (e.g., background not ready)
    debouncedPush()
  })
}

/**
 * Resolve settings conflict when user makes a choice
 * @param {'local' | 'cloud' | 'cancel'} choice
 */
export async function resolveSettingsConflict(choice) {
  if (!pendingSettingsConflict) {
    console.warn('[CloudSync] No pending settings conflict to resolve')
    return
  }
  
  const { localSettings, cloudSettings } = pendingSettingsConflict
  
  try {
    if (choice === 'cancel') {
      // User cancelled - don't set lastSyncTime so dialog will show again next sync
      // Also switch back to Manual mode to prevent auto-sync without resolution
      logToUI('User cancelled settings sync - switching to Manual mode')
      pendingSettingsConflict = null
      
      // Switch back to Manual mode
      const stored = await syncStorage.getValue()
      await syncStorage.setValue({
        ...stored,
        autoSyncEnabled: false,
      })
      syncState.autoSyncEnabled = false
      stopAutoSync()
      
      return
    }
    
    const accessToken = await getValidAccessToken()
    
    if (choice === 'local') {
      // User chose local settings - push to cloud
      logToUI('User chose local settings, pushing to cloud...')
      await saveFile(accessToken, FILES.SETTINGS, {
        version: 2,
        updatedAt: Date.now(),
        data: localSettings,
      })
    } else if (choice === 'cloud') {
      // User chose cloud settings - apply to local (using updateSettingsFromCloud to prevent sync loop)
      logToUI('User chose cloud settings, applying to local...')
      await updateSettingsFromCloud(cloudSettings)
    }
    
    // Clear the pending conflict
    pendingSettingsConflict = null
    
    // Update lastSyncTime and mark conflict as resolved
    const stored = await syncStorage.getValue()
    const now = new Date().toISOString()
    await syncStorage.setValue({
      ...stored,
      lastSyncTime: now,
      needsSettingsConflictCheck: false, // User made a choice, don't show dialog again until logout
    })
    syncState.lastSyncTime = now
    
    logToUI('Settings conflict resolved', 'success')
  } catch (error) {
    console.error('Failed to resolve settings conflict:', error)
    logToUI(`Failed to resolve conflict: ${error.message}`, 'error')
    throw error
  }
}

/**
 * Clear pending settings conflict (e.g., when user cancels)
 */
export function clearPendingSettingsConflict() {
  pendingSettingsConflict = null
}

// --- Auto Sync ---

/**
 * Enable or disable auto-sync
 * @param {boolean} enabled
 */
export async function setAutoSync(enabled) {
  const stored = await syncStorage.getValue()
  
  await syncStorage.setValue({
    ...stored,
    autoSyncEnabled: enabled,
  })
  
  syncState.autoSyncEnabled = enabled
  
  if (enabled) {
    startAutoSync()
    // Trigger immediate sync when enabled
    pullData()
  } else {
    stopAutoSync()
  }
}

/**
 * Update sync preferences
 * @param {Object} preferences - { settings, history, library, chats } booleans
 */
export async function setSyncPreferences(preferences) {
  const stored = await syncStorage.getValue()
  
  // Handle legacy 'archive' key
  if (preferences.archive !== undefined) {
    preferences.library = preferences.archive
    delete preferences.archive
  }
  
  const updatedPreferences = withDefaultPreferences({
    ...stored.syncPreferences,
    ...preferences,
  })
  
  await syncStorage.setValue({
    ...stored,
    syncPreferences: updatedPreferences,
    // Chats off: a later re-enable must not trust a marker from before.
    ...(updatedPreferences.chats ? {} : { chatSyncMarker: null }),
  })

  syncState.syncPreferences = updatedPreferences
}

/**
 * Forget the chats skip marker so the next chats sync reconciles fully. Used
 * when chat data is wiped by a path that bypasses the repository (and therefore
 * the revision counter).
 */
export async function clearChatSyncMarker() {
  const latest = await syncStorage.getValue()
  await syncStorage.setValue({ ...latest, chatSyncMarker: null })
}

/**
 * Start auto-sync - Delegates to background.js via message
 * Background.js manages the actual Chrome Alarms
 */
async function startAutoSync() {
  console.log('[CloudSync] Auto-sync enabled, notifying background...')
  
  // Notify background.js to setup alarm
  try {
    await browser.runtime.sendMessage({ type: 'SETUP_AUTO_SYNC_ALARM' })
    console.log('[CloudSync] Background notified to setup auto-sync alarm')
  } catch (error) {
    console.warn('[CloudSync] Failed to notify background:', error)
  }
}

/**
 * Stop auto-sync - Delegates to background.js via message
 */
async function stopAutoSync() {
  console.log('[CloudSync] Auto-sync disabled, notifying background...')
  
  // Notify background.js to clear alarm
  try {
    await browser.runtime.sendMessage({ type: 'CLEAR_AUTO_SYNC_ALARM' })
    console.log('[CloudSync] Background notified to clear auto-sync alarm')
  } catch (error) {
    console.warn('[CloudSync] Failed to notify background:', error)
  }
  
  // Also clear local interval fallback if exists
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
  
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

/**
 * Ask Firefox for the proxy host permission. Must be called directly from a
 * click handler (permissions.request() needs the user gesture).
 * @returns {Promise<boolean>} true if granted
 */
export async function grantProxyPermission() {
  const granted = await requestSpecificPermission(PROXY_ORIGIN_PATTERN)
  if (!granted) return false

  syncState.needsProxyPermission = false
  const stored = await syncStorage.getValue()
  if (stored.isLoggedIn && stored.autoSyncEnabled && !stored.needsReauth) {
    startAutoSync()
  }
  return true
}

// --- BYOK (Bring Your Own Key) Credentials Management ---

/**
 * Save custom OAuth credentials for BYOK mode
 * @param {string} clientId - OAuth Client ID
 * @param {string} clientSecret - OAuth Client Secret
 */
export async function saveCustomCredentials(clientId, clientSecret) {
  const stored = await syncStorage.getValue()
  
  await syncStorage.setValue({
    ...stored,
    customCredentials: {
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    },
  })
  
  console.log('[CloudSync] Custom credentials saved')
}

/**
 * Clear custom OAuth credentials
 */
export async function clearCustomCredentials() {
  const stored = await syncStorage.getValue()
  
  await syncStorage.setValue({
    ...stored,
    customCredentials: null,
  })
  
  console.log('[CloudSync] Custom credentials cleared')
}

/**
 * Get current custom credentials (if set)
 * @returns {Promise<{clientId: string, clientSecret: string} | null>}
 */
export async function getCustomCredentials() {
  const stored = await syncStorage.getValue()
  return stored.customCredentials || null
}

/**
 * Check if using BYOK mode (has custom credentials)
 * @returns {Promise<boolean>}
 */
export async function isUsingCustomCredentials() {
  const stored = await syncStorage.getValue()
  return !!(stored.customCredentials?.clientId && stored.customCredentials?.clientSecret)
}

// --- Export State ---

export const cloudSyncStore = {
  get isLoggedIn() {
    return syncState.isLoggedIn
  },
  get needsReauth() {
    return syncState.needsReauth
  },
  get authMode() {
    return syncState.authMode
  },
  get needsProxyPermission() {
    return syncState.needsProxyPermission
  },
  get autoSyncEnabled() {
    return syncState.autoSyncEnabled
  },
  get lastSyncTime() {
    return syncState.lastSyncTime
  },
  get isSyncing() {
    return syncState.isSyncing
  },
  get syncError() {
    return syncState.syncError
  },
  get userEmail() {
    return syncState.userEmail
  },
  get userName() {
    return syncState.userName
  },
  get userPicture() {
    return syncState.userPicture
  },
  get debugLogs() {
    return debugLogs
  },
  get syncPreferences() {
    return syncState.syncPreferences
  },
  get pendingSettingsConflict() {
    return pendingSettingsConflict
  }
}
