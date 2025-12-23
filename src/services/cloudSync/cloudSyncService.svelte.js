// @ts-nocheck
/**
 * Cloud Sync Service
 * Main service for syncing data between local storage and Google Drive
 */

import { storage } from '@wxt-dev/storage'
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
  addSummary,
  updateSummary,
  deleteSummary,
  addHistory,
  updateHistory,
  deleteHistory,
  addMultipleSummaries,
  addMultipleHistory,
  clearAllSummaries,
  clearAllHistory,
  getAllTags,
  addTag,
  updateTag,
  deleteTag,
  clearAllTags,
  replaceTagsStore,
} from '@/lib/db/indexedDBService.js'
import { settings, loadSettings, updateSettings } from '@/stores/settingsStore.svelte.js'
import { generateUUID } from '@/lib/utils/utils.js'

const FILES = {
  SETTINGS: 'summarizerrrr-settings.json',
  SUMMARIES: 'summarizerrrr-summaries.json',
  HISTORY: 'summarizerrrr-history.json',
  TAGS: 'summarizerrrr-tags.json',
}

// --- Storage Definition ---
export const syncStorage = storage.defineItem('local:syncState', {
  defaultValue: {
    isLoggedIn: false,
    autoSyncEnabled: null, // null = chưa hỏi, true/false = user đã chọn
    lastSyncTime: null,
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
      archive: true, // includes tags
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
    archive: true,
  },
})

// Debug logs store
let debugLogs = $state([])

function logToUI(msg, type = 'info') {
  console.log(`[CloudSync] ${msg}`)
  debugLogs.unshift({ time: new Date().toLocaleTimeString(), msg, type })
  if (debugLogs.length > 20) debugLogs.pop()
}

let syncInterval = null
const AUTO_SYNC_INTERVAL = 2 * 60 * 1000 // 2 minutes (optimized from 5)
const DEBOUNCE_DELAY = 7 * 1000 // 7 seconds - sync shortly after user actions
let debounceTimer = null

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
    syncState.syncPreferences = stored.syncPreferences || {
      settings: true,
      history: true,
      archive: true,
    }
    
    // If logged in, check token validity and start auto-sync
    if (stored.isLoggedIn && stored.accessToken) {
      if (isTokenExpired(stored.tokenExpiry)) {
        if (stored.refreshToken) {
          await refreshToken()
        } else {
          // Token expired and no refresh token - need re-login
          await logout(false)
          return
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
 * Check if access token is expired
 */
function isTokenExpired(expiryTime) {
  if (!expiryTime) return true
  return Date.now() >= expiryTime - 60000 // 1 minute buffer
}

/**
 * Refresh access token
 */
async function refreshToken() {
  const stored = await syncStorage.getValue()
  
  if (!stored.refreshToken) {
    throw new Error('No refresh token available')
  }
  
  const { accessToken, expiresAt } = await refreshAccessToken(stored.refreshToken)
  
  await syncStorage.setValue({
    ...stored,
    accessToken,
    tokenExpiry: expiresAt,
  })
  
  return accessToken
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
    token = await refreshToken()
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
    
    await syncStorage.setValue({
      ...stored,
      isLoggedIn: true,
      accessToken,
      refreshToken: newRefreshToken,
      tokenExpiry: expiresAt,
      userEmail: profile.email,
      userName: profile.name,
      userPicture: profile.picture,
    })
    
    syncState.isLoggedIn = true
    syncState.userEmail = profile.email
    syncState.userName = profile.name
    syncState.userPicture = profile.picture
    
    // Check if user needs to choose auto-sync preference
    const needsAutoSyncChoice = stored.autoSyncEnabled === null
    
    return { needsAutoSyncChoice }
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
    // Keep deviceId and deletedIds
  })
  
  syncState.isLoggedIn = false
  syncState.userEmail = null
  syncState.userName = null
  syncState.userPicture = null
  syncState.lastSyncTime = null
}


// --- Sync Functions ---

/**
 * Pull data from cloud and sync with local (simplified last-write-wins)
 */
export async function pullData() {
  if (syncState.isSyncing) return
  
  syncState.isSyncing = true
  syncState.syncError = null
  logToUI('Starting sync...')
  
  try {
    const accessToken = await getValidAccessToken()
    const stored = await syncStorage.getValue()
    
    // Fetch all cloud files in parallel
    logToUI('Fetching cloud data...')
    const [settingsFile, summariesFile, historyFile, tagsFile] = await Promise.all([
      getFile(accessToken, FILES.SETTINGS),
      getFile(accessToken, FILES.SUMMARIES),
      getFile(accessToken, FILES.HISTORY),
      getFile(accessToken, FILES.TAGS),
    ])

    const hasCloudData = settingsFile || summariesFile || historyFile || tagsFile
    
    if (!hasCloudData) {
      // No cloud data - push local data for first time
      logToUI('No cloud data found, pushing local data...')
      await pushAllData(accessToken, stored.deviceId)
      return
    }

    // Get local data
    await loadSettings()
    const localSummaries = await getAllSummaries()
    const localHistory = await getAllHistory()
    const localTags = await getAllTags()

    // Normalize Settings structure (support "settings" key from legacy/current format)
    if (settingsFile && !settingsFile.data && settingsFile.settings) {
      settingsFile.data = settingsFile.settings
    }

    // Get sync preferences
    const prefs = syncState.syncPreferences

    // Sync each data type independently based on preferences
    if (prefs.settings) {
      await syncDataType('Settings', settingsFile, { ...settings }, 
        (data) => updateSettings(data),
        async (dataToPush) => {
          await saveFile(accessToken, FILES.SETTINGS, {
            version: 1,
            lastModified: new Date().toISOString(),
            data: dataToPush || { ...settings },
          })
        }
      )
    } else {
      logToUI('Skipping Settings sync (disabled in preferences)')
    }
    
    if (prefs.history) {
      await syncDataType('Summaries', summariesFile, localSummaries,
        async (data) => {
          await clearAllSummaries()
          if (data && data.length > 0) await addMultipleSummaries(data)
        },
        async (dataToPush) => {
          await saveFile(accessToken, FILES.SUMMARIES, {
            version: 1,
            lastModified: new Date().toISOString(),
            data: dataToPush || localSummaries,
          })
        }
      )
      
      await syncDataType('History', historyFile, localHistory,
        async (data) => {
          await clearAllHistory()
          if (data && data.length > 0) await addMultipleHistory(data)
        },
        async (dataToPush) => {
          await saveFile(accessToken, FILES.HISTORY, {
            version: 1,
            lastModified: new Date().toISOString(),
            data: dataToPush || localHistory,
          })
        }
      )
    } else {
      logToUI('Skipping History sync (disabled in preferences)')
    }
    
    if (prefs.archive) {
      await syncDataType('Tags', tagsFile, localTags,
        async (data) => {
          if (data && data.length > 0) {
            // Use safer replaceTagsStore which doesn't wipe summary references
            await replaceTagsStore(data)
          } else {
            // If cloud data is empty, we might want to clear local tags?
            // Or just merged result is empty.
            // If merging returned empty, we should clear.
            await replaceTagsStore([])
          }
        },
        async (dataToPush) => {
          await saveFile(accessToken, FILES.TAGS, {
            version: 1,
            lastModified: new Date().toISOString(),
            data: dataToPush || localTags,
          })
        }
      )
    } else {
      logToUI('Skipping Archive/Tags sync (disabled in preferences)')
    }
    
    // Update last sync time
    const now = new Date().toISOString()
    await syncStorage.setValue({
      ...stored,
      lastSyncTime: now,
    })
    
    syncState.lastSyncTime = now
    logToUI('Sync completed successfully', 'success')
  } catch (error) {
    console.error('Sync failed:', error)
    logToUI(`Sync failed: ${error.message}`, 'error')
    syncState.syncError = error.message
  } finally {
    syncState.isSyncing = false
  }
}

/**
 * Helper: Sync a single data type using Item-Level Merge
 */
async function syncDataType(name, cloudFile, localData, applyCloud, pushLocal) {
  if (!cloudFile || !cloudFile.data) {
    // No cloud data, push local
    logToUI(`No cloud ${name}, pushing local...`)
    await pushLocal(localData)
    return
  }
  
  // Use Merge Strategy for Arrays (Summaries, History, Tags)
  if (Array.isArray(localData) && Array.isArray(cloudFile.data)) {
    logToUI(`Merging ${name}...`)
    const mergedData = mergeData(cloudFile.data, localData)
    
    // Always apply merged data locally to ensure we have the latest items from cloud
    await applyCloud(mergedData)
    
    // Push if merged data is different/newer than cloud
    const cloudTime = new Date(cloudFile.lastModified).getTime()
    const mergedTime = getLatestTimestamp(mergedData)
    
    // Heuristic: If merged result has newer items or different count, push to cloud
    if (mergedTime > cloudTime || mergedData.length !== cloudFile.data.length) {
      logToUI(`Pushing merged ${name}...`)
      await pushLocal(mergedData)
    } else {
      logToUI(`${name} in sync.`)
    }
    
  } else {
    // Fallback for Objects (Settings) - Last Write Wins based on file timestamp
    const cloudTime = new Date(cloudFile.lastModified).getTime()
    
    // For object sync (Settings), we assume Cloud wins if it exists, unless we implemented granular timestamp tracking.
    // In current architecture, Settings change updates the store but no explicit timestamp is passed here.
    // However, if the user changed settings locally, we want that to persist.
    // But since we can't compare timestamps of object content easily without metadata,
    // and pullData happens primarily on startup/auto-sync...
    // If we simply rely on cloudTime > 0, we imply Cloud always overwrites Local on sync.
    // This is "Server Authoritative".
    // If user changes settings offline, and then syncs?
    // User changes settings -> triggers `triggerSync()` -> `pullData()`.
    // If cloud is older, we should push.
    // But we don't know local timestamp.
    // Ideally we should track `lastSettingsUpdate` time in storage.
    // For now, to be safe and consistent with previous behavior (mostly), we can stick to "Cloud wins if newer file".
    // But "newer" than what? We don't have local time.
    // PREVIOUS LOGIC FLAW: `localTime` was 0. So Cloud ALWAYS won.
    // If I change settings locally, `pushLocal` is never called if cloud exists?
    // Wait, `debouncedPush` calls `pullData`.
    // If I change settings, I want to Push.
    // If `pullData` sees existing cloud file, and I compare 0 vs CloudTime. Cloud Wins.
    // My local changes are OVERWRITTEN.
    // THIS IS A BUG FOR SETTINGS TOO.
    //
    // FIX: We should fetch LastSyncTime.
    // If CloudFile.lastModified > LastSyncTime -> Cloud has updates since we last synced -> Apply Cloud.
    // Else -> We have updates (or no changes) -> Push Local.
    
    const lastSyncTime = syncState.lastSyncTime ? new Date(syncState.lastSyncTime).getTime() : 0
    
    if (cloudTime > lastSyncTime) {
       logToUI(`Cloud ${name} is newer, applying...`)
       await applyCloud(cloudFile.data)
    } else {
       // Cloud is old, or we updated locally since last sync
       // BUT, be careful. usage of lastSyncTime assumes we successfully synced previously.
       // If I login fresh, lastSyncTime is null (0). CloudTime > 0.
       // So fresh login -> Pull Cloud Settings. Correct.
       // If I am synced. I change settings. 
       // Trigger Sync. CloudTime (old) < LastSyncTime (recent).
       // We Push Local. Correct.
       
       // What if CloudTime == LastSyncTime (approx)?
       // If CloudTime <= LastSyncTime, it means cloud hasn't changed since we last synced.
       // So our local state is either same or newer. Push to be safe.
       logToUI(`Pushing local ${name}...`)
       await pushLocal(localData)
    }
  }
}

/**
 * Helper: Merge Cloud and Local items based on ID and Timestamp
 */
function mergeData(cloudItems, localItems) {
  const merged = new Map()
  
  // 1. Add all Cloud items initially
  cloudItems.forEach(item => {
    if (item && item.id) merged.set(item.id, item)
  })
  
  // 2. Merge Local items
  localItems.forEach(localItem => {
    if (!localItem || !localItem.id) return
    
    const cloudItem = merged.get(localItem.id)
    if (cloudItem) {
      // Conflict: Pick newer
      const localTime = getItemTimestamp(localItem)
      const cloudTime = getItemTimestamp(cloudItem)
      
      if (localTime >= cloudTime) {
        merged.set(localItem.id, localItem)
      }
      // Else keep cloudItem
    } else {
      // Unique to local
      merged.set(localItem.id, localItem)
    }
  })
  
  return Array.from(merged.values())
}

/**
 * Helper: Get timestamp of a specific item
 */
function getItemTimestamp(item) {
  return new Date(item.updatedAt || item.createdAt || item.date || 0).getTime()
}

/**
 * Helper: Get latest timestamp from array of items
 */
function getLatestTimestamp(items) {
  if (!items || !Array.isArray(items) || items.length === 0) return 0
  
  const timestamps = items.map(getItemTimestamp)
  
  return Math.max(...timestamps, 0)
}

/**
 * Helper: Push all local data to cloud
 */
async function pushAllData(accessToken, deviceId) {
  await loadSettings()
  const localSummaries = await getAllSummaries()
  const localHistory = await getAllHistory()
  const localTags = await getAllTags()
  
  const now = new Date().toISOString()
  const prefs = syncState.syncPreferences
  
  const pushPromises = []
  
  if (prefs.settings) {
    pushPromises.push(
      saveFile(accessToken, FILES.SETTINGS, {
        version: 1,
        lastModified: now,
        settings: { ...settings },
      })
    )
  }
  
  if (prefs.history) {
    pushPromises.push(
      saveFile(accessToken, FILES.SUMMARIES, {
        version: 1,
        lastModified: now,
        data: localSummaries,
      })
    )
    pushPromises.push(
      saveFile(accessToken, FILES.HISTORY, {
        version: 1,
        lastModified: now,
        data: localHistory,
      })
    )
  }
  
  if (prefs.archive) {
    pushPromises.push(
      saveFile(accessToken, FILES.TAGS, {
        version: 1,
        lastModified: now,
        data: localTags,
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
  await pullData()
}

/**
 * Debounced sync to avoid too frequent syncs
 * Changed to call pullData() instead of pushData() to avoid overwriting cloud changes
 */
function debouncedPush() {
  if (!syncState.isLoggedIn || !syncState.autoSyncEnabled) return
  
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  debounceTimer = setTimeout(() => {
    pullData() // Changed from pushData() to merge before pushing
  }, DEBOUNCE_DELAY)
}

/**
 * Trigger sync after data changes (add/update/delete)
 * Public wrapper for debouncedPush to be called by other components
 */
export function triggerSync() {
  debouncedPush()
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
 * @param {Object} preferences - { settings: boolean, history: boolean, archive: boolean }
 */
export async function setSyncPreferences(preferences) {
  const stored = await syncStorage.getValue()
  
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
 * Start auto-sync interval
 */
function startAutoSync() {
  if (syncInterval) return
  
  syncInterval = setInterval(() => {
    if (syncState.isLoggedIn && syncState.autoSyncEnabled) {
      pullData()
    }
  }, AUTO_SYNC_INTERVAL)
}

/**
 * Stop auto-sync interval
 */
function stopAutoSync() {
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
  }
}
