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
  getSyncData,
  saveSyncData,
  getUserProfile,
} from './googleDriveAdapter.js'
import { mergeAllData, prepareSyncData } from './conflictResolver.js'
import {
  getAllSummaries,
  getAllHistory,
  addMultipleSummaries,
  addMultipleHistory,
  clearAllSummaries,
  clearAllHistory,
} from '@/lib/db/indexedDBService.js'
import { settings, loadSettings, updateSettings } from '@/stores/settingsStore.svelte.js'
import { generateUUID } from '@/lib/utils/utils.js'

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
    deletedIds: [], // Track soft-deleted items
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
})

// Debug logs store
let debugLogs = $state([])

function logToUI(msg, type = 'info') {
  console.log(`[CloudSync] ${msg}`)
  debugLogs.unshift({ time: new Date().toLocaleTimeString(), msg, type })
  if (debugLogs.length > 20) debugLogs.pop()
}

let syncInterval = null
const AUTO_SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes
const DEBOUNCE_DELAY = 30 * 1000 // 30 seconds
let debounceTimer = null

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
      
      // Perform initial sync on startup
      await pullData()
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
 */
async function getValidAccessToken() {
  const stored = await syncStorage.getValue()
  
  if (!stored.accessToken) {
    throw new Error('Not logged in')
  }
  
  if (isTokenExpired(stored.tokenExpiry)) {
    return await refreshToken()
  }
  
  return stored.accessToken
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
 * Pull data from cloud and merge with local
 */
export async function pullData() {
  if (syncState.isSyncing) return
  
  syncState.isSyncing = true
  syncState.syncError = null
  logToUI('Starting pullData...')
  
  try {
    const accessToken = await getValidAccessToken()
    const cloudData = await getSyncData(accessToken)
    
    if (!cloudData) {
      // No cloud data - push local data
      logToUI('No cloud data found, pushing local data...')
      await internalPushData(accessToken)
      return
    }
    
    // Get local data
    await loadSettings()
    const localSummaries = await getAllSummaries()
    const localHistory = await getAllHistory()
    const stored = await syncStorage.getValue()
    
    const localData = prepareSyncData(
      { ...settings },
      localSummaries,
      localHistory,
      stored.deviceId,
      stored.deletedIds || []
    )
    
    // Merge data
    const merged = mergeAllData(localData, cloudData)
    
    // Apply merged data locally
    await applyMergedData(merged)
    
    // Push merged data back to cloud
    const syncData = prepareSyncData(
      merged.settings,
      merged.summaries,
      merged.history,
      stored.deviceId,
      merged.deletedIds
    )
    
    await saveSyncData(accessToken, syncData)
    
    // Update last sync time
    const now = new Date().toISOString()
    await syncStorage.setValue({
      ...stored,
      lastSyncTime: now,
      deletedIds: merged.deletedIds,
    })
    
    syncState.lastSyncTime = now
    
    logToUI(`Sync completed. Stats: ${JSON.stringify(merged.stats)}`, 'success')
  } catch (error) {
    console.error('Pull data failed:', error)
    logToUI(`Pull data failed: ${error.message}`, 'error')
    syncState.syncError = error.message
  } finally {
    syncState.isSyncing = false
  }
}

/**
 * Push local data to cloud
 */
/**
 * Internal push data logic (no state/error handling wrapper)
 */
async function internalPushData(accessToken) {
  // Get local data
  await loadSettings()
  const localSummaries = await getAllSummaries()
  const localHistory = await getAllHistory()
  const stored = await syncStorage.getValue()
  
  const syncData = prepareSyncData(
    { ...settings },
    localSummaries,
    localHistory,
    stored.deviceId,
    stored.deletedIds || []
  )
  
  await saveSyncData(accessToken, syncData)
  
  // Update last sync time
  const now = new Date().toISOString()
  await syncStorage.setValue({
    ...stored,
    lastSyncTime: now,
  })
  
  syncState.lastSyncTime = now
  
  logToUI('Push completed successfully', 'success')
}

/**
 * Push local data to cloud
 */
export async function pushData() {
  if (syncState.isSyncing) return
  
  syncState.isSyncing = true
  syncState.syncError = null
  logToUI('Starting pushData...')
  
  try {
    const accessToken = await getValidAccessToken()
    await internalPushData(accessToken)
  } catch (error) {
    console.error('Push data failed:', error)
    logToUI(`Push data failed: ${error.message}`, 'error')
    syncState.syncError = error.message
  } finally {
    syncState.isSyncing = false
  }
}

/**
 * Apply merged data to local storage
 */
async function applyMergedData(merged) {
  // Update settings
  if (merged.settings) {
    await updateSettings(merged.settings)
  }
  
  // Clear and re-add summaries (simplest approach for now)
  // In future, could optimize to only update changed items
  if (merged.summaries && merged.summaries.length > 0) {
    await clearAllSummaries()
    await addMultipleSummaries(merged.summaries)
  }
  
  // Clear and re-add history
  if (merged.history && merged.history.length > 0) {
    await clearAllHistory()
    await addMultipleHistory(merged.history)
  }
}

/**
 * Manual sync trigger
 */
export async function syncNow() {
  await pullData()
}

/**
 * Track deleted item for sync
 * @param {string} itemId - ID of deleted item
 */
export async function trackDeletedItem(itemId) {
  const stored = await syncStorage.getValue()
  const deletedIds = stored.deletedIds || []
  
  if (!deletedIds.includes(itemId)) {
    deletedIds.push(itemId)
    await syncStorage.setValue({
      ...stored,
      deletedIds,
    })
  }
  
  // Trigger debounced sync
  debouncedPush()
}

/**
 * Debounced push to avoid too frequent syncs
 */
function debouncedPush() {
  if (!syncState.isLoggedIn || !syncState.autoSyncEnabled) return
  
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  
  debounceTimer = setTimeout(() => {
    pushData()
  }, DEBOUNCE_DELAY)
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
  }
}
