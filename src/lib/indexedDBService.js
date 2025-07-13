// @ts-nocheck
const DB_NAME = 'summarizer_db'
const STORE_NAME = 'summaries'
const DB_VERSION = 2
const HISTORY_STORE_NAME = 'history'
const HISTORY_LIMIT = 50

let db

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: false, // Change to false for UUID
        })
        objectStore.createIndex('title', 'title', { unique: false })
        objectStore.createIndex('url', 'url', { unique: false })
        objectStore.createIndex('date', 'date', { unique: false })
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        const objectStore = db.createObjectStore(HISTORY_STORE_NAME, {
          keyPath: 'id',
          autoIncrement: false, // Change to false for UUID
        })
        objectStore.createIndex('title', 'title', { unique: false })
        objectStore.createIndex('url', 'url', { unique: false })
        objectStore.createIndex('date', 'date', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      db = event.target.result
      resolve(db)
    }

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

async function addSummary(summary) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.add(summary)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = (event) => {
      console.error('Error adding summary:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

async function getAllSummaries() {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const summaries = []

    // Mở cursor trên index 'date' theo thứ tự giảm dần
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

    request.onerror = (event) => {
      console.error('Error getting all summaries:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

async function addHistory(historyData) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)

    const request = objectStore.add(historyData)

    request.onsuccess = async () => {
      // Check history limit and delete oldest if exceeded
      const countRequest = objectStore.count()
      countRequest.onsuccess = async () => {
        if (countRequest.result > HISTORY_LIMIT) {
          const oldestRequest = objectStore.index('date').openCursor('next')
          oldestRequest.onsuccess = (event) => {
            const cursor = event.target.result
            if (cursor) {
              objectStore.delete(cursor.primaryKey)
            }
          }
        }
        resolve(request.result)
      }
      countRequest.onerror = (event) => {
        console.error('Error counting history:', event.target.errorCode)
        reject(event.target.errorCode)
      }
    }

    request.onerror = (event) => {
      console.error('Error adding history:', event.target.errorCode)
      reject(event.target.errorCode)
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

async function getSummaryById(id) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.get(id)

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = (event) => {
      console.error('Error getting summary by ID:', event.target.errorCode)
      reject(event.target.errorCode)
    }
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

export {
  openDatabase,
  addSummary,
  getAllSummaries,
  addHistory,
  getAllHistory,
  getSummaryById,
  getHistoryById,
}
