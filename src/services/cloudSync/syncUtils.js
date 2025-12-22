// @ts-nocheck
/**
 * Sync Utility Functions
 * Helper functions for Cloud Sync operations
 */

/**
 * Detect if merged data has changes compared to cloud data
 * @param {object} merged - Merged data after conflict resolution
 * @param {object} cloudData - Original cloud data
 * @returns {boolean} True if there are local changes to push
 */
export function detectChanges(merged, cloudData) {
  // Compare settings
  const settingsChanged = JSON.stringify(merged.settings) !== JSON.stringify(cloudData.settings)
  if (settingsChanged) return true
  
  // Compare summaries/history counts and IDs
  if (merged.summaries.length !== (cloudData.summaries?.length || 0)) return true
  if (merged.history.length !== (cloudData.history?.length || 0)) return true
  if (merged.tags && merged.tags.length !== (cloudData.tags?.length || 0)) return true
  
  // Compare deletedIds
  const mergedDeletedIds = new Set(merged.deletedIds || [])
  const cloudDeletedIds = new Set(cloudData.deletedIds || [])
  if (mergedDeletedIds.size !== cloudDeletedIds.size) return true
  
  // Deep compare deletedIds content
  for (const id of mergedDeletedIds) {
    if (!cloudDeletedIds.has(id)) return true
  }
  
  return false
}

/**
 * Calculate diff between local and merged items
 * @param {Array} localItems - Current local items
 * @param {Array} mergedItems - Merged items from sync
 * @returns {{toAdd: Array, toUpdate: Array, toDelete: Array}}
 */
export function diffItems(localItems, mergedItems) {
  const localMap = new Map(localItems.map(item => [item.id, item]))
  const mergedMap = new Map(mergedItems.map(item => [item.id, item]))
  
  const toAdd = []
  const toUpdate = []
  const toDelete = []
  
  // Find items to add or update
  for (const [id, mergedItem] of mergedMap) {
    const localItem = localMap.get(id)
    if (!localItem) {
      toAdd.push(mergedItem)
    } else {
      // Compare by stringifying - if different, needs update
      const localStr = JSON.stringify(localItem)
      const mergedStr = JSON.stringify(mergedItem)
      if (localStr !== mergedStr) {
        toUpdate.push(mergedItem)
      }
    }
  }
  
  // Find items to delete (exist locally but not in merged)
  for (const [id] of localMap) {
    if (!mergedMap.has(id)) {
      toDelete.push({ id })
    }
  }
  
  return { toAdd, toUpdate, toDelete }
}
