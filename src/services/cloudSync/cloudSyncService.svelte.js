// @ts-nocheck
/**
 * Cloud Sync Service v2
 * Architecture: 3 files (settings.json, history.json, library.json)
 * - Settings: Last Write Wins
 * - History: Append-only Map Merge
 * - Library (Archive + Tags): Smart Merge with Soft Delete
 */

import { storage } from '@wxt-dev/storage'
import { browser } from 'wxt/browser'
import {
  authenticate,
  refreshAccessToken,
  revokeToken,
  getFile,
  saveFile,
  getUserProfile,
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

// File names on Google Drive - 3 file architecture
const FILES = {
  SETTINGS: 'summarizerrrr-settings.json',
  HISTORY: 'summarizerrrr-history.json',
  LIBRARY: 'summarizerrrr-library.json', // Archive + Tags combined for atomic sync
}

// Soft delete cleanup threshold (30 days in ms)
const SOFT_DELETE_CLEANUP_MS = 30 * 24 * 60 * 60 * 1000

// --- Storage Definition ---
export const syncStorage = storage.defineItem('local:syncState', {
  defaultValue: {
    isLoggedIn: false,
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
    },
  },
})

// --- State ---
let syncState = $state({
  isLoggedIn: false,
  autoSyncEnabled: null,
  lastSyncTime: null,
  isSyncing: false,
  syncError: null,
  userEmail: null,
  userName: null,
  userPicture: null,
  syncPreferences: {
    settings: true,
    history: true,
    library: true,
  },
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
    
    syncState.isLoggedIn = stored.isLoggedIn
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
    
    syncState.syncPreferences = stored.syncPreferences || {
      settings: true,
      history: true,
      library: true,
    }
    
    // If logged in, check token validity and start auto-sync
    if (stored.isLoggedIn && stored.accessToken) {
      if (isTokenExpired(stored.tokenExpiry)) {
        // Try silent re-auth with Implicit Flow
        try {
          await doRefreshToken()
        } catch (error) {
          console.warn('Silent refresh failed, user needs to re-login:', error)
          // Don't logout immediately - let them manually try again
          // await logout(false)
        }
      }
      
      if (stored.autoSyncEnabled) {
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
    syncState.autoSyncEnabled = stored.autoSyncEnabled
    syncState.lastSyncTime = stored.lastSyncTime
    syncState.userEmail = stored.userEmail
    syncState.userName = stored.userName
    syncState.userPicture = stored.userPicture
    syncState.syncPreferences = stored.syncPreferences || {
      settings: true,
      history: true,
      library: true,
    }
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

/**
 * Refresh access token using stored refresh_token
 * This enables persistent sessions across browser restarts
 */
async function doRefreshToken() {
  const stored = await syncStorage.getValue()
  
  if (!stored.refreshToken) {
    throw new Error('No refresh token available. Please sign in again.')
  }
  
  try {
    const { accessToken, expiresAt } = await refreshAccessToken(stored.refreshToken)
    
    await syncStorage.setValue({
      ...stored,
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
    console.error('Token refresh failed:', error)
    // If refresh token is invalid, clear login state
    if (error.message.includes('Session expired')) {
      await logout(false)
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
 * @returns {Promise<{needsAutoSyncChoice: boolean}>}
 */
export async function login() {
  syncState.syncError = null
  
  try {
    const { accessToken, refreshToken: newRefreshToken, expiresAt } = await authenticate()
    
    // Get user profile
    const profile = await getUserProfile(accessToken)
    
    const stored = await syncStorage.getValue()
    const isFirstLogin = stored.autoSyncEnabled === null
    
    // Update storage with profile and auth info
    const updatedState = {
      ...stored,
      isLoggedIn: true,
      accessToken,
      refreshToken: newRefreshToken,
      tokenExpiry: expiresAt,
      userEmail: profile.email,
      userName: profile.name,
      userPicture: profile.picture,
    }
    
    // Set default sync mode on first login
    if (isFirstLogin) {
      updatedState.autoSyncEnabled = false
    }
    
    await syncStorage.setValue(updatedState)
    
    syncState.isLoggedIn = true
    syncState.userEmail = profile.email
    syncState.userName = profile.name
    syncState.userPicture = profile.picture
    syncState.lastSyncTime = (await syncStorage.getValue()).lastSyncTime
    syncState.autoSyncEnabled = updatedState.autoSyncEnabled
    syncState.syncPreferences = stored.syncPreferences || {
      settings: true,
      history: true,
      library: true,
    }
    
    return {}
  } catch (error) {
    console.error('Login failed:', error)
    syncState.syncError = error.message
    throw error
  }
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
  
  // Clear token cache on logout
  tokenCache = { accessToken: null, tokenExpiry: null, lastUpdated: 0 }
  
  const stored = await syncStorage.getValue()
  
  await syncStorage.setValue({
    ...stored,
    isLoggedIn: false,
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    userEmail: null,
    userName: null,
    userPicture: null,
    needsSettingsConflictCheck: true, // Trigger conflict dialog on next login (important for multiple profiles)
    // Note: Keep lastSyncTime so UI can still show last sync time
  })
  
  syncState.isLoggedIn = false
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
    
    if (prefs.history) fetchPromises.push(getFile(accessToken, FILES.HISTORY))
    else fetchPromises.push(Promise.resolve(null))
    
    if (prefs.library) fetchPromises.push(getFile(accessToken, FILES.LIBRARY))
    else fetchPromises.push(Promise.resolve(null))
    
    const [settingsFile, historyFile, libraryFile] = await Promise.all(fetchPromises)

    const hasCloudData = settingsFile || historyFile || libraryFile
    
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
    
    // Update last sync time ONLY if there's no pending settings conflict
    // If there's a pending conflict, we need to wait for user to resolve it
    if (!pendingSettingsConflict) {
      const now = new Date().toISOString()
      await syncStorage.setValue({
        ...stored,
        lastSyncTime: now,
      })
      
      syncState.lastSyncTime = now
      logToUI('Sync completed successfully', 'success')
    } else {
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
        logToUI(`Token refresh failed: ${refreshError.message}`, 'error')
        syncState.syncError = `Token refresh failed: ${refreshError.message}`
      }
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
  
  if (!cloudFile || !cloudFile.items) {
    // No cloud history, push local
    logToUI('No cloud History, pushing local...')
    await saveFile(accessToken, FILES.HISTORY, {
      version: 2,
      updatedAt: Date.now(),
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
    await saveFile(accessToken, FILES.HISTORY, {
      version: 2,
      updatedAt: Date.now(),
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
  
  if (!cloudFile || (!cloudFile.archives && !cloudFile.tags)) {
    // No cloud library, push local
    logToUI('No cloud Library, pushing local...')
    await saveFile(accessToken, FILES.LIBRARY, {
      version: 2,
      updatedAt: Date.now(),
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
    await saveFile(accessToken, FILES.LIBRARY, {
      version: 2,
      updatedAt: Date.now(),
      archives: cleanedArchives,
      tags: cleanedTags,
    })
  } else {
    logToUI('Library in sync.')
  }
  
  logToUI('Library sync complete.')
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
  
  if (prefs.history) {
    pushPromises.push(
      saveFile(accessToken, FILES.HISTORY, {
        version: 2,
        updatedAt: now,
        items: arrayToMap(localHistory),
      })
    )
  }
  
  if (prefs.library) {
    pushPromises.push(
      saveFile(accessToken, FILES.LIBRARY, {
        version: 2,
        updatedAt: now,
        archives: arrayToMap(localArchives),
        tags: arrayToMap(localTags),
      })
    )
  }
  
  await Promise.all(pushPromises)
  
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
 */
export function triggerSync() {
  console.log('[CloudSync] triggerSync called')
  if (!isToolEnabled('cloudSync')) {
    console.log('[CloudSync] triggerSync skipped: cloudSync tool is disabled')
    return
  }
  debouncedPush()
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
 * @param {Object} preferences - { settings: boolean, history: boolean, library: boolean }
 */
export async function setSyncPreferences(preferences) {
  const stored = await syncStorage.getValue()
  
  // Handle legacy 'archive' key
  if (preferences.archive !== undefined) {
    preferences.library = preferences.archive
    delete preferences.archive
  }
  
  const updatedPreferences = {
    ...stored.syncPreferences,
    ...preferences,
  }
  
  await syncStorage.setValue({
    ...stored,
    syncPreferences: updatedPreferences,
  })
  
  syncState.syncPreferences = updatedPreferences
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

// --- Export State ---

export const cloudSyncStore = {
  get isLoggedIn() {
    return syncState.isLoggedIn
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
