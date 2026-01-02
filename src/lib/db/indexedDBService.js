// @ts-nocheck
import { generateUUID } from '../utils/utils'

const DB_NAME = 'summarizer_db'
const STORE_NAME = 'summaries'
const TAGS_STORE_NAME = 'tags'
const DB_VERSION = 9 // Version increased for soft delete migration
const HISTORY_STORE_NAME = 'history'
const HISTORY_LIMIT = 100

let db

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      db = event.target.result
      const transaction = event.target.transaction

      // Summaries store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const summaryStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        summaryStore.createIndex('title', 'title', { unique: false })
        summaryStore.createIndex('url', 'url', { unique: false })
        summaryStore.createIndex('date', 'date', { unique: false })
      }

      // History store
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        const historyStore = db.createObjectStore(HISTORY_STORE_NAME, {
          keyPath: 'id',
        })
        historyStore.createIndex('title', 'title', { unique: false })
        historyStore.createIndex('url', 'url', { unique: false })
        historyStore.createIndex('date', 'date', { unique: false })
        historyStore.createIndex('isArchived', 'isArchived', { unique: false })
        historyStore.createIndex('contentType', 'contentType', {
          unique: false,
        })
      } else {
        // Add contentType index if it doesn't exist (for existing databases)
        const historyStore = transaction.objectStore(HISTORY_STORE_NAME)
        if (!historyStore.indexNames.contains('contentType')) {
          historyStore.createIndex('contentType', 'contentType', {
            unique: false,
          })
        }
      }

      // Tags store (New)
      if (!db.objectStoreNames.contains(TAGS_STORE_NAME)) {
        const tagStore = db.createObjectStore(TAGS_STORE_NAME, {
          keyPath: 'id',
        })
        tagStore.createIndex('name', 'name', { unique: true })
        tagStore.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Backups store (New)
      const BACKUP_STORE_NAME = 'data_backups'
      if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        const backupStore = db.createObjectStore(BACKUP_STORE_NAME, {
          keyPath: 'id',
        })
        backupStore.createIndex('createdAt', 'createdAt', { unique: false })
        backupStore.createIndex('type', 'type', { unique: false })
      }

      // Data migration: ensure all summaries have a 'tags' array
      if (transaction.objectStoreNames.contains(STORE_NAME)) {
        const summaryStore = transaction.objectStore(STORE_NAME)
        if (!summaryStore.indexNames.contains('tags')) {
          summaryStore.createIndex('tags', 'tags', { multiEntry: true })
        }
        summaryStore.openCursor().onsuccess = (e) => {
          const cursor = e.target.result
          if (cursor) {
            const value = cursor.value
            let needsUpdate = false
            
            // Migration: tags array
            if (value.tags === undefined) {
              value.tags = []
              needsUpdate = true
            }
            
            // Migration: soft delete fields for cloud sync
            if (value.deleted === undefined) {
              value.deleted = false
              needsUpdate = true
            }
            if (value.updatedAt === undefined) {
              value.updatedAt = value.date || new Date().toISOString()
              needsUpdate = true
            }
            
            if (needsUpdate) {
              cursor.update(value)
            }
            cursor.continue()
          }
        }
      }

      // Migration: Add contentType and soft delete fields to existing history items
      if (transaction.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        const historyStore = transaction.objectStore(HISTORY_STORE_NAME)

        // Define a simple content type detection function inline to avoid async issues
        function detectContentTypeSync(url) {
          if (!url || typeof url !== 'string') return 'website'
          if (/youtube\.com\/watch/i.test(url)) return 'youtube'
          if (
            /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i.test(url)
          )
            return 'course'
          return 'website'
        }

        historyStore.openCursor().onsuccess = (e) => {
          const cursor = e.target.result
          if (cursor) {
            const value = cursor.value
            let needsUpdate = false
            
            // Migration: contentType
            if (value.contentType === undefined) {
              try {
                value.contentType = detectContentTypeSync(value.url)
              } catch (error) {
                value.contentType = 'website'
              }
              needsUpdate = true
            }
            
            // Migration: soft delete fields for cloud sync
            if (value.deleted === undefined) {
              value.deleted = false
              needsUpdate = true
            }
            if (value.updatedAt === undefined) {
              value.updatedAt = value.date || new Date().toISOString()
              needsUpdate = true
            }
            
            if (needsUpdate) {
              cursor.update(value)
            }
            cursor.continue()
          }
        }
      }

      // Migration: Add soft delete fields to existing tags
      if (transaction.objectStoreNames.contains(TAGS_STORE_NAME)) {
        const tagStore = transaction.objectStore(TAGS_STORE_NAME)
        
        tagStore.openCursor().onsuccess = (e) => {
          const cursor = e.target.result
          if (cursor) {
            const value = cursor.value
            let needsUpdate = false
            
            // Migration: soft delete fields for cloud sync
            if (value.deleted === undefined) {
              value.deleted = false
              needsUpdate = true
            }
            if (value.updatedAt === undefined) {
              value.updatedAt = value.createdAt || new Date().toISOString()
              needsUpdate = true
            }
            
            if (needsUpdate) {
              cursor.update(value)
            }
            cursor.continue()
          }
        }
      }
    }

    request.onsuccess = (event) => {
      db = event.target.result
      console.log('IndexedDB opened successfully.')
      resolve(db)
    }

    request.onerror = (event) => {
      const error =
        event.target.error ||
        event.target.errorCode ||
        new Error('Unknown IndexedDB error')
      console.error('IndexedDB error:', error)
      reject(error)
    }
  })
}

// --- Summary Functions ---
async function addSummary(summaryData) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const newSummary = {
      ...summaryData,
      id: generateUUID(),
      tags: summaryData.tags || [],
    }
    const request = objectStore.add(newSummary)
    request.onsuccess = () => resolve(newSummary.id)
    request.onerror = (event) => reject(event.target.error)
  })
}

async function getAllSummaries() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const summaries = []
    const request = objectStore.index('date').openCursor(null, 'prev')
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        // Only include non-deleted records
        if (cursor.value.deleted !== true) {
          summaries.push(cursor.value)
        }
        cursor.continue()
      } else {
        resolve(summaries)
      }
    }
    request.onerror = (event) => reject(event.target.error)
  })
}

async function getSummaryCount() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.openCursor()
    let count = 0
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        // Only count non-deleted records
        if (cursor.value.deleted !== true) {
          count++
        }
        cursor.continue()
      } else {
        resolve(count)
      }
    }
    request.onerror = (event) => reject(event.target.error)
  })
}

async function getSummaryById(id) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

async function deleteSummary(id) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const getRequest = objectStore.get(id)
    getRequest.onsuccess = async () => {
      const summaryToDelete = getRequest.result
      const historySourceId = summaryToDelete?.historySourceId
      const deleteRequest = objectStore.delete(id)
      deleteRequest.onsuccess = async () => {
        if (historySourceId) {
          try {
            await updateHistoryArchivedStatus(historySourceId, false)
          } catch (error) {
            console.error(
              'Error updating history status after deleting summary:',
              error
            )
          }
        }
        resolve(true)
      }
      deleteRequest.onerror = (event) => reject(event.target.error)
    }
    getRequest.onerror = (event) => reject(event.target.error)
  })
}

async function updateSummary(summary) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.put(summary)
    request.onsuccess = () => resolve(request.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

async function addMultipleSummaries(summaries) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    let count = 0

    summaries.forEach((summary) => {
      const request = objectStore.put(summary)
      request.onsuccess = () => {
        count++
        if (count === summaries.length) {
          resolve(true)
        }
      }
    })

    transaction.oncomplete = () => {
      resolve(true)
    }

    transaction.onerror = (event) => {
      reject(event.target.error)
    }
  })
}

// --- History Functions ---
// ... (Existing history functions are unchanged, so they are omitted for brevity but are still in the file)
async function addHistory(historyData) {
  if (!db) {
    db = await openDatabase()
  }

  // Validate input
  if (!historyData || typeof historyData !== 'object') {
    throw new Error('Invalid history data: must be an object')
  }

  // Ensure required fields
  if (!historyData.id) {
    historyData.id = generateUUID()
  }

  if (!historyData.date) {
    historyData.date = new Date().toISOString()
  }

  // Detect content type BEFORE entering Promise
  if (!historyData.contentType) {
    const { detectContentType } = await import(
      '../utils/contentTypeDetector.js'
    )
    historyData.contentType = detectContentType(historyData.url)
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)

    const request = objectStore.add(historyData)

    request.onsuccess = () => {
      // Count only non-deleted items for the limit check
      const cursorRequest = objectStore.openCursor()
      let activeCount = 0
      const activeItems = [] // Store {id, date} of active items for potential deletion
      
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          if (cursor.value.deleted !== true) {
            activeCount++
            activeItems.push({ id: cursor.value.id, date: cursor.value.date })
          }
          cursor.continue()
        } else {
          // After counting, check if we need to delete old items
          if (activeCount > HISTORY_LIMIT) {
            // Sort by date ascending (oldest first)
            activeItems.sort((a, b) => new Date(a.date) - new Date(b.date))
            const overage = activeCount - HISTORY_LIMIT
            const itemsToDelete = activeItems.slice(0, overage)
            
            // Hard delete the oldest active items
            itemsToDelete.forEach((item) => {
              objectStore.delete(item.id)
            })
          }
        }
      }
      resolve(request.result)
    }

    request.onerror = (event) => {
      const error =
        event.target.error ||
        event.target.errorCode ||
        new Error('Failed to add history')
      console.error('Error adding history:', error)
      reject(error)
    }
  })
}

async function getAllHistory() {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    const history = []

    const request = objectStore.index('date').openCursor(null, 'prev')

    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        // Only include non-deleted records
        if (cursor.value.deleted !== true) {
          history.push(cursor.value)
        }
        cursor.continue()
      } else {
        resolve(history)
      }
    }

    request.onerror = (event) => {
      console.error('Error getting all history:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

async function getHistoryCount() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    const request = objectStore.openCursor()
    let count = 0
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        // Only count non-deleted records
        if (cursor.value.deleted !== true) {
          count++
        }
        cursor.continue()
      } else {
        resolve(count)
      }
    }
    request.onerror = (event) => reject(event.target.error)
  })
}

async function getHistoryById(id) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    const request = objectStore.get(id)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = (event) => {
      console.error('Error getting history by ID:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

async function deleteHistory(id) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = (event) => reject(event.target.error)
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    objectStore.delete(id)
  })
}

async function updateHistory(historyData) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    
    // Ensure updatedAt is set
    historyData.updatedAt = historyData.updatedAt || new Date().toISOString()
    
    const request = objectStore.put(historyData)
    request.onsuccess = () => resolve(request.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

async function updateHistoryArchivedStatus(id, isArchivedStatus) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    const getRequest = objectStore.get(id)
    getRequest.onsuccess = () => {
      const historyItem = getRequest.result
      if (historyItem) {
        historyItem.isArchived = isArchivedStatus
        historyItem.updatedAt = new Date().toISOString() // Update timestamp
        const putRequest = objectStore.put(historyItem)
        putRequest.onsuccess = () => resolve(historyItem.id)
        putRequest.onerror = (event) => reject(event.target.error)
      } else {
        reject('History item not found.')
      }
    }
    getRequest.onerror = (event) => reject(event.target.error)
  })
}

async function moveHistoryItemToArchive(historyId) {
  if (!db) db = await openDatabase()
  return new Promise(async (resolve, reject) => {
    try {
      const historyItem = await getHistoryById(historyId)
      if (historyItem) {
        const summaryToArchive = {
          ...historyItem,
          historySourceId: historyId,
          tags: [],
        }
        await addSummary(summaryToArchive)
        await updateHistoryArchivedStatus(historyId, true)
        resolve(true)
      } else {
        reject('History item not found.')
      }
    } catch (error) {
      reject(error)
    }
  })
}

// --- Tag Functions (New) ---
/**
 * Add a new tag
 * @param {string} name - Tag name
 * @param {string} [id] - Optional tag ID (for cloud sync)
 * @param {string} [createdAt] - Optional creation timestamp (for cloud sync)
 */
async function addTag(name, id = null, createdAt = null) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    const now = new Date().toISOString()
    const newTag = {
      id: id || generateUUID(), // Use provided ID or generate new one
      name: name.trim(),
      createdAt: createdAt || now, // Use provided timestamp or current time
      updatedAt: createdAt || now, // Initialize updatedAt
    }
    const request = objectStore.add(newTag)
    request.onsuccess = () => resolve(newTag)
    request.onerror = (event) => {
      console.error('Error adding tag:', event.target.error)
      reject(event.target.error)
    }
  })
}

async function getAllTags() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    const request = objectStore.index('createdAt').openCursor(null, 'prev')
    const tags = []
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        // Only include non-deleted records
        if (cursor.value.deleted !== true) {
          tags.push(cursor.value)
        }
        cursor.continue()
      } else {
        resolve(tags)
      }
    }
    request.onerror = (event) => reject(event.target.error)
  })
}

async function getTagsCount() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    const request = objectStore.openCursor()
    let count = 0
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        // Only count non-deleted records
        if (cursor.value.deleted !== true) {
          count++
        }
        cursor.continue()
      } else {
        resolve(count)
      }
    }
    request.onerror = (event) => reject(event.target.error)
  })
}

async function getTagById(id) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    const request = objectStore.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

async function updateTag(tag) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    
    // Update timestamp
    tag.updatedAt = new Date().toISOString()
    
    const request = objectStore.put(tag)
    request.onsuccess = () => resolve(request.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

async function deleteTag(id) {
  if (!db) db = await openDatabase()
  return new Promise(async (resolve, reject) => {
    try {
      await removeTagFromAllSummaries(id)
      const transaction = db.transaction([TAGS_STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(TAGS_STORE_NAME)
      const request = objectStore.delete(id)
      request.onsuccess = () => resolve(true)
      request.onerror = (event) => reject(event.target.error)
    } catch (error) {
      reject(error)
    }
  })
}

async function addMultipleTags(tags) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    let count = 0

    tags.forEach((tag) => {
      const request = objectStore.put(tag)
      request.onsuccess = () => {
        count++
        if (count === tags.length) {
          resolve(true)
        }
      }
    })

    transaction.oncomplete = () => {
      resolve(true)
    }

    transaction.onerror = (event) => {
      reject(event.target.error)
    }
  })
}

// --- Tag & Summary Association Functions (New) ---
async function removeTagFromAllSummaries(tagId) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const summaryStore = transaction.objectStore(STORE_NAME)
    const request = summaryStore.openCursor()
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        const summary = cursor.value
        if (summary.tags && summary.tags.includes(tagId)) {
          summary.tags = summary.tags.filter((tId) => tId !== tagId)
          cursor.update(summary)
        }
        cursor.continue()
      } else {
        resolve()
      }
    }
    request.onerror = (event) => reject(event.target.error)
  })
}

async function updateSummaryTags(summaryId, tags) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const getRequest = objectStore.get(summaryId)
    getRequest.onsuccess = () => {
      const summary = getRequest.result
      if (summary) {
        summary.tags = tags
        // Update timestamp to ensure this change is synced
        summary.updatedAt = new Date().toISOString()
        const putRequest = objectStore.put(summary)
        putRequest.onsuccess = () => resolve(summary)
        putRequest.onerror = (event) => reject(event.target.error)
      } else {
        reject('Summary not found.')
      }
    }
    getRequest.onerror = (event) => reject(event.target.error)
  })
}

// --- Tag Statistics Functions ---
async function getTagCounts() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.openCursor()
    const tagCounts = {}

    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        const summary = cursor.value
        if (summary.tags && Array.isArray(summary.tags)) {
          summary.tags.forEach((tagId) => {
            tagCounts[tagId] = (tagCounts[tagId] || 0) + 1
          })
        }
        cursor.continue()
      } else {
        resolve(tagCounts)
      }
    }
    request.onerror = (event) => reject(event.target.error)
  })
}

async function addMultipleHistory(historyItems) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    let count = 0

    historyItems.forEach((item) => {
      const request = objectStore.put(item)
      request.onsuccess = () => {
        count++
        if (count === historyItems.length) {
          resolve(true)
        }
      }
    })

    transaction.oncomplete = () => resolve(true)
    transaction.onerror = (event) => reject(event.target.error)
  })
}

// --- Data Count Functions ---
async function getDataCounts() {
  try {
    const [summariesCount, historyCount, tagsCount] = await Promise.all([
      getSummaryCount(),
      getHistoryCount(),
      getTagsCount(),
    ])

    return {
      summaries: summariesCount,
      history: historyCount,
      tags: tagsCount,
    }
  } catch (error) {
    console.error('Error getting data counts:', error)
    return {
      summaries: 0,
      history: 0,
      tags: 0,
    }
  }
}

// --- Clear/Delete All Functions ---
async function clearAllSummaries() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.clear()
    request.onsuccess = () => resolve(true)
    request.onerror = (event) => reject(event.target.error)
  })
}

async function clearAllHistory() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    const request = objectStore.clear()
    request.onsuccess = () => resolve(true)
    request.onerror = (event) => reject(event.target.error)
  })
}

async function clearAllTags() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [STORE_NAME, TAGS_STORE_NAME],
      'readwrite'
    )
    const summaryStore = transaction.objectStore(STORE_NAME)
    const tagStore = transaction.objectStore(TAGS_STORE_NAME)

    transaction.oncomplete = () => resolve(true)
    transaction.onerror = (event) => reject(event.target.error)

    // 1. Loop through and update summaries to remove tags
    const cursorRequest = summaryStore.openCursor()
    cursorRequest.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        const summary = cursor.value
        if (summary.tags && summary.tags.length > 0) {
          summary.tags = []
          cursor.update(summary)
        }
        cursor.continue()
      } else {
        // 2. After iterating through all summaries, clear the tags store
        tagStore.clear()
      }
    }
  })
}

// --- Local Soft Delete Cleanup ---
const CLEANUP_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

/**
 * Cleanup soft-deleted items older than 30 days
 * Call once per day when extension opens
 * @returns {Promise<number>} Total items cleaned up
 */
async function cleanupSoftDeletedItems() {
  console.log('[IndexedDB] 🧹 Starting soft delete cleanup...')
  const now = Date.now()
  let totalCleaned = 0
  
  for (const storeName of [STORE_NAME, HISTORY_STORE_NAME, TAGS_STORE_NAME]) {
    const cleaned = await cleanupStore(storeName, now)
    if (cleaned > 0) {
      console.log(`[IndexedDB]   └─ ${storeName}: removed ${cleaned} items`)
    }
    totalCleaned += cleaned
  }
  
  console.log(`[IndexedDB] ✅ Cleanup complete. Total removed: ${totalCleaned}`)
  
  return totalCleaned
}

async function cleanupStore(storeName, now) {
  if (!db) db = await openDatabase()
  
  return new Promise((resolve) => {
    const transaction = db.transaction([storeName], 'readwrite')
    const objectStore = transaction.objectStore(storeName)
    const request = objectStore.openCursor()
    let deleted = 0
    
    request.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        const item = cursor.value
        if (item.deleted === true) {
          const deletedTime = new Date(item.updatedAt || item.date || 0).getTime()
          if (now - deletedTime >= CLEANUP_THRESHOLD_MS) {
            cursor.delete()
            deleted++
          }
        }
        cursor.continue()
      } else {
        resolve(deleted)
      }
    }
    
    request.onerror = () => resolve(0) // Fail silently
  })
}

export {
  openDatabase,
  addSummary,
  getAllSummaries,
  getSummaryCount,
  getSummaryById,
  deleteSummary,
  updateSummary,
  addHistory,
  getAllHistory,
  getHistoryCount,
  getHistoryById,
  deleteHistory,
  updateHistory,
  updateHistoryArchivedStatus,
  moveHistoryItemToArchive,
  addMultipleHistory,
  // Tag exports
  addTag,
  getAllTags,
  getTagsCount,
  getTagById,
  updateTag,
  deleteTag,
  addMultipleSummaries,
  addMultipleTags,
  updateSummaryTags,
  getTagCounts,
  getDataCounts,
  clearAllSummaries,
  clearAllHistory,
  clearAllTags,
  softDeleteSummary,
  softDeleteTag,
  softDeleteHistory,
  replaceSummariesStore,
  replaceHistoryStore,
  replaceTagsStore,
  // Cleanup
  cleanupSoftDeletedItems,
}

// --- Soft Delete Functions for Cloud Sync ---

/**
 * Soft delete a summary (mark as deleted instead of removing)
 * Used for cloud sync to propagate deletions across devices
 * @param {string} id - Summary ID to soft delete
 */
async function softDeleteSummary(id) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const getRequest = objectStore.get(id)
    
    getRequest.onsuccess = () => {
      const summary = getRequest.result
      if (summary) {
        summary.deleted = true
        summary.updatedAt = new Date().toISOString()
        const putRequest = objectStore.put(summary)
        putRequest.onsuccess = () => resolve(summary)
        putRequest.onerror = (event) => reject(event.target.error)
      } else {
        reject(new Error('Summary not found'))
      }
    }
    getRequest.onerror = (event) => reject(event.target.error)
  })
}

/**
 * Soft delete a tag (mark as deleted instead of removing)
 * Used for cloud sync to propagate deletions across devices
 * @param {string} id - Tag ID to soft delete
 */
async function softDeleteTag(id) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    const getRequest = objectStore.get(id)
    
    getRequest.onsuccess = () => {
      const tag = getRequest.result
      if (tag) {
        tag.deleted = true
        tag.updatedAt = new Date().toISOString()
        const putRequest = objectStore.put(tag)
        putRequest.onsuccess = () => resolve(tag)
        putRequest.onerror = (event) => reject(event.target.error)
      } else {
        reject(new Error('Tag not found'))
      }
    }
    getRequest.onerror = (event) => reject(event.target.error)
  })
}

/**
 * Soft delete a history item (mark as deleted instead of removing)
 * Used for cloud sync to propagate deletions across devices
 * @param {string} id - History ID to soft delete
 */
async function softDeleteHistory(id) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    const getRequest = objectStore.get(id)
    
    getRequest.onsuccess = () => {
      const historyItem = getRequest.result
      if (historyItem) {
        historyItem.deleted = true
        historyItem.updatedAt = new Date().toISOString()
        const putRequest = objectStore.put(historyItem)
        putRequest.onsuccess = () => resolve(historyItem)
        putRequest.onerror = (event) => reject(event.target.error)
      } else {
        reject(new Error('History item not found'))
      }
    }
    getRequest.onerror = (event) => reject(event.target.error)
  })
}

// --- Sync Helper Functions ---
async function replaceTagsStore(tags) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = (event) => reject(event.target.error)

    // 1. Clear the store
    objectStore.clear()
    
    // 2. Add all tags
    if (tags && tags.length > 0) {
      tags.forEach((tag) => {
        if (tag.id && tag.name) {
          objectStore.put(tag)
        }
      })
    }
  })
}

/**
 * Atomic replacement of all summaries
 * @param {Array} summaries 
 */
async function replaceSummariesStore(summaries) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = (event) => reject(event.target.error)

    objectStore.clear()
    
    if (summaries && summaries.length > 0) {
      summaries.forEach((item) => {
        if (item.id) {
          objectStore.put(item)
        }
      })
    }
  })
}

/**
 * Atomic replacement of all history items
 * @param {Array} historyItems 
 */
async function replaceHistoryStore(historyItems) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    
    transaction.oncomplete = () => resolve(true)
    transaction.onerror = (event) => reject(event.target.error)

    objectStore.clear()
    
    if (historyItems && historyItems.length > 0) {
      historyItems.forEach((item) => {
        if (item.id) {
          objectStore.put(item)
        }
      })
    }
  })
}
