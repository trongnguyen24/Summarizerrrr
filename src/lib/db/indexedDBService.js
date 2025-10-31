// @ts-nocheck
import { generateUUID } from '../utils/utils'

const DB_NAME = 'summarizer_db'
const STORE_NAME = 'summaries'
const TAGS_STORE_NAME = 'tags'
const DB_VERSION = 8 // Version increased for backup store
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
            if (value.tags === undefined) {
              value.tags = []
              cursor.update(value)
            }
            cursor.continue()
          }
        }
      }

      // Migration: Add contentType to existing history items
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
            if (value.contentType === undefined) {
              try {
                const detectedType = detectContentTypeSync(value.url)
                value.contentType = detectedType
                cursor.update(value)
              } catch (error) {
                // Fallback to 'website' if detection fails
                value.contentType = 'website'
                cursor.update(value)
              }
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
        summaries.push(cursor.value)
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
    const request = objectStore.count()
    request.onsuccess = () => resolve(request.result)
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
      const countRequest = objectStore.count()
      countRequest.onsuccess = () => {
        let count = countRequest.result
        if (count > HISTORY_LIMIT) {
          const overage = count - HISTORY_LIMIT
          const cursorRequest = objectStore.index('date').openCursor()
          let deletedCount = 0
          cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result
            if (cursor && deletedCount < overage) {
              cursor.delete()
              deletedCount++
              cursor.continue()
            }
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
        history.push(cursor.value)
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
    const request = objectStore.count()
    request.onsuccess = () => resolve(request.result)
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
async function addTag(name) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    const newTag = {
      id: generateUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
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
        tags.push(cursor.value)
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
    const request = objectStore.count()
    request.onsuccess = () => resolve(request.result)
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
  return new Promise(async (resolve, reject) => {
    try {
      // First, remove all tags from summaries
      const transaction1 = db.transaction([STORE_NAME], 'readwrite')
      const summaryStore = transaction1.objectStore(STORE_NAME)
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
        }
      }

      transaction1.oncomplete = () => {
        // Then clear tags store
        const transaction2 = db.transaction([TAGS_STORE_NAME], 'readwrite')
        const tagStore = transaction2.objectStore(TAGS_STORE_NAME)
        const request = tagStore.clear()
        request.onsuccess = () => resolve(true)
        request.onerror = (event) => reject(event.target.error)
      }

      transaction1.onerror = (event) => reject(event.target.error)
    } catch (error) {
      reject(error)
    }
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
  // Clear/Delete All exports
  clearAllSummaries,
  clearAllHistory,
  clearAllTags,
}
