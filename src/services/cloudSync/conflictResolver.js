// @ts-nocheck
/**
 * Conflict Resolver for Cloud Sync
 * Handles merging of local and cloud data with conflict resolution strategies
 */

/**
 * Compare timestamps and return the newer value
 * @param {string} timestamp1
 * @param {string} timestamp2
 * @returns {number} 1 if timestamp1 is newer, -1 if timestamp2 is newer, 0 if equal
 */
function compareTimestamps(timestamp1, timestamp2) {
  const t1 = new Date(timestamp1).getTime()
  const t2 = new Date(timestamp2).getTime()
  if (t1 > t2) return 1
  if (t1 < t2) return -1
  return 0
}

/**
 * Deep merge two objects, preferring values from 'preferred' when both exist
 * @param {object} base - Base object
 * @param {object} preferred - Preferred object (takes precedence)
 * @returns {object} Merged object
 */
function deepMerge(base, preferred) {
  if (!base) return preferred
  if (!preferred) return base
  
  const result = { ...base }
  
  for (const key of Object.keys(preferred)) {
    if (
      typeof preferred[key] === 'object' &&
      preferred[key] !== null &&
      !Array.isArray(preferred[key])
    ) {
      result[key] = deepMerge(base[key], preferred[key])
    } else {
      result[key] = preferred[key]
    }
  }
  
  return result
}

/**
 * Merge settings using last-write-wins strategy
 * @param {object} localSettings - Local settings
 * @param {object} cloudSettings - Cloud settings
 * @param {string} localTimestamp - Local last modified timestamp
 * @param {string} cloudTimestamp - Cloud last modified timestamp
 * @returns {{merged: object, source: 'local'|'cloud'}}
 */
export function mergeSettings(localSettings, cloudSettings, localTimestamp, cloudTimestamp) {
  if (!cloudSettings) {
    return { merged: localSettings, source: 'local' }
  }
  
  if (!localSettings) {
    return { merged: cloudSettings, source: 'cloud' }
  }
  
  // Last-write-wins for settings
  // Prefer internal timestamps if available, otherwise fallback to packet timestamps
  const realLocalTs = localSettings?.lastModified ?? localTimestamp
  const realCloudTs = cloudSettings?.lastModified ?? cloudTimestamp
  
  const comparison = compareTimestamps(realLocalTs, realCloudTs)
  
  if (comparison >= 0) {
    // Local is newer or equal - use local but merge any new cloud fields
    return {
      merged: deepMerge(cloudSettings, localSettings),
      source: 'local',
    }
  } else {
    // Cloud is newer - use cloud but merge any new local fields  
    return {
      merged: deepMerge(localSettings, cloudSettings),
      source: 'cloud',
    }
  }
}

/**
 * Merge summaries/history arrays by ID with timestamp-based conflict resolution
 * @param {Array} localItems - Local items array
 * @param {Array} cloudItems - Cloud items array
 * @param {Set<string>} deletedIds - Set of soft-deleted IDs
 * @returns {{merged: Array, conflicts: Array, newFromCloud: number, newFromLocal: number}}
 */
export function mergeItemsById(localItems = [], cloudItems = [], deletedIds = new Set()) {
  const result = new Map()
  const conflicts = []
  let newFromCloud = 0
  let newFromLocal = 0
  
  // Index cloud items by ID
  const cloudMap = new Map()
  for (const item of cloudItems) {
    cloudMap.set(item.id, item)
  }
  
  // Process local items
  for (const localItem of localItems) {
    if (deletedIds.has(localItem.id)) {
      // Item was deleted on another device - skip it
      continue
    }
    
    const cloudItem = cloudMap.get(localItem.id)
    
    if (!cloudItem) {
      // Only exists locally - keep it
      result.set(localItem.id, localItem)
      newFromLocal++
    } else {
      // Exists in both - compare timestamps
      const localTime = localItem.updatedAt || localItem.createdAt
      const cloudTime = cloudItem.updatedAt || cloudItem.createdAt
      
      if (cloudItem.deleted) {
        // Deleted on cloud - don't add to result
        continue
      }
      
      const comparison = compareTimestamps(localTime, cloudTime)
      
      if (comparison >= 0) {
        // Local is newer or equal
        result.set(localItem.id, localItem)
      } else {
        // Cloud is newer
        result.set(localItem.id, cloudItem)
        conflicts.push({
          id: localItem.id,
          resolution: 'cloud',
          localTime,
          cloudTime,
        })
      }
      
      // Remove from cloudMap since we've processed it
      cloudMap.delete(localItem.id)
    }
  }
  
  // Add remaining cloud items (not in local)
  for (const [id, cloudItem] of cloudMap) {
    if (!cloudItem.deleted && !deletedIds.has(id)) {
      result.set(id, cloudItem)
      newFromCloud++
    }
  }
  
  return {
    merged: Array.from(result.values()),
    conflicts,
    newFromCloud,
    newFromLocal,
  }
}

/**
 * Merge tags arrays by name (tags use name as unique constraint, not ID)
 * @param {Array} localTags - Local tags array
 * @param {Array} cloudTags - Cloud tags array
 * @param {Set<string>} deletedTagNames - Set of soft-deleted tag names
 * @returns {{merged: Array, conflicts: Array, newFromCloud: number, newFromLocal: number}}
 */
export function mergeTagsByName(localTags = [], cloudTags = [], deletedTagNames = new Set()) {
  const result = new Map()
  const conflicts = []
  let newFromCloud = 0
  let newFromLocal = 0
  
  // Index cloud tags by name
  const cloudMap = new Map()
  for (const tag of cloudTags) {
    if (!deletedTagNames.has(tag.name)) {
      cloudMap.set(tag.name, tag)
    }
  }
  
  // Process local tags
  for (const localTag of localTags) {
    if (deletedTagNames.has(localTag.name)) {
      // Tag was deleted on another device - skip it
      continue
    }
    
    const cloudTag = cloudMap.get(localTag.name)
    
    if (!cloudTag) {
      // Only exists locally - keep it
      result.set(localTag.name, localTag)
      newFromLocal++
    } else {
      // Exists in both - compare timestamps
      const localTime = localTag.updatedAt || localTag.createdAt
      const cloudTime = cloudTag.updatedAt || cloudTag.createdAt
      
      const comparison = compareTimestamps(localTime, cloudTime)
      
      if (comparison >= 0) {
        // Local is newer or equal
        result.set(localTag.name, localTag)
      } else {
        // Cloud is newer
        result.set(cloudTag.name, cloudTag)
        conflicts.push({
          name: localTag.name,
          resolution: 'cloud',
          localTime,
          cloudTime,
        })
      }
      
      // Remove from cloudMap since we've processed it
      cloudMap.delete(localTag.name)
    }
  }
  
  // Add remaining cloud tags (not in local)
  for (const [name, cloudTag] of cloudMap) {
    if (!deletedTagNames.has(name)) {
      result.set(name, cloudTag)
      newFromCloud++
    }
  }
  
  return {
    merged: Array.from(result.values()),
    conflicts,
    newFromCloud,
    newFromLocal,
  }
}

/**
 * Merge complete sync data from local and cloud
 * @param {object} localData - Complete local data
 * @param {object} cloudData - Complete cloud data
 * @returns {{
 *   settings: object,
 *   summaries: Array,
 *   history: Array,
 *   tags: Array,
 *   deletedIds: Array,
 *   stats: {
 *     settingsSource: 'local'|'cloud',
 *     summariesFromCloud: number,
 *     summariesFromLocal: number,
 *     historyFromCloud: number,
 *     historyFromLocal: number,
 *     tagsFromCloud: number,
 *     tagsFromLocal: number,
 *     conflicts: number
 *   }
 * }}
 */
export function mergeAllData(localData, cloudData) {
  if (!cloudData) {
    return {
      settings: localData.settings,
      summaries: localData.summaries || [],
      history: localData.history || [],
      tags: localData.tags || [],
      deletedIds: localData.deletedIds || [],
      deletedTagNames: localData.deletedTagNames || [],
      stats: {
        settingsSource: 'local',
        summariesFromCloud: 0,
        summariesFromLocal: localData.summaries?.length || 0,
        historyFromCloud: 0,
        historyFromLocal: localData.history?.length || 0,
        tagsFromCloud: 0,
        tagsFromLocal: localData.tags?.length || 0,
        conflicts: 0,
      },
    }
  }
  
  if (!localData) {
    return {
      settings: cloudData.settings,
      summaries: cloudData.summaries || [],
      history: cloudData.history || [],
      tags: cloudData.tags || [],
      deletedIds: cloudData.deletedIds || [],
      deletedTagNames: cloudData.deletedTagNames || [],
      stats: {
        settingsSource: 'cloud',
        summariesFromCloud: cloudData.summaries?.length || 0,
        summariesFromLocal: 0,
        historyFromCloud: cloudData.history?.length || 0,
        historyFromLocal: 0,
        tagsFromCloud: cloudData.tags?.length || 0,
        tagsFromLocal: 0,
        conflicts: 0,
      },
    }
  }
  
  // Combine deleted IDs from both sources
  const deletedIds = new Set([
    ...(localData.deletedIds || []),
    ...(cloudData.deletedIds || []),
  ])
  
  // Combine deleted tag names from both sources
  const deletedTagNames = new Set([
    ...(localData.deletedTagNames || []),
    ...(cloudData.deletedTagNames || []),
  ])
  
  // Merge settings
  const { merged: mergedSettings, source: settingsSource } = mergeSettings(
    localData.settings,
    cloudData.settings,
    localData.lastModified,
    cloudData.lastModified
  )
  
  // Merge summaries
  const summariesResult = mergeItemsById(
    localData.summaries || [],
    cloudData.summaries || [],
    deletedIds
  )
  
  // Merge history
  const historyResult = mergeItemsById(
    localData.history || [],
    cloudData.history || [],
    deletedIds
  )
  
  // Merge tags by name (tags use name as unique constraint)
  const tagsResult = mergeTagsByName(
    localData.tags || [],
    cloudData.tags || [],
    deletedTagNames
  )
  
  return {
    settings: mergedSettings,
    summaries: summariesResult.merged,
    history: historyResult.merged,
    tags: tagsResult.merged,
    deletedIds: Array.from(deletedIds),
    deletedTagNames: Array.from(deletedTagNames),
    stats: {
      settingsSource,
      summariesFromCloud: summariesResult.newFromCloud,
      summariesFromLocal: summariesResult.newFromLocal,
      historyFromCloud: historyResult.newFromCloud,
      historyFromLocal: historyResult.newFromLocal,
      tagsFromCloud: tagsResult.newFromCloud,
      tagsFromLocal: tagsResult.newFromLocal,
      conflicts: summariesResult.conflicts.length + historyResult.conflicts.length + tagsResult.conflicts.length,
    },
  }
}

/**
 * Prepare local data for sync by adding necessary metadata
 * @param {object} settings - Local settings
 * @param {Array} summaries - Local summaries
 * @param {Array} history - Local history
 * @param {Array} tags - Local tags
 * @param {string} deviceId - Current device ID
 * @param {Array} deletedIds - List of deleted item IDs
 * @param {Array} deletedTagNames - List of deleted tag names
 * @returns {object} Formatted sync data
 */
export function prepareSyncData(settings, summaries, history, tags, deviceId, deletedIds = [], deletedTagNames = []) {
  return {
    version: 1,
    lastModified: new Date().toISOString(),
    deviceId,
    settings,
    summaries: summaries.map((s) => ({
      ...s,
      deleted: false,
    })),
    history: history.map((h) => ({
      ...h,
      deleted: false,
    })),
    tags: tags.map((t) => ({
      ...t,
      deleted: false,
    })),
    deletedIds,
    deletedTagNames,
  }
}
