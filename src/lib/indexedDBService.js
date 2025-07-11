// @ts-nocheck
const DB_NAME = 'summarizer_db'
const STORE_NAME = 'summaries'
const DB_VERSION = 1

let db

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
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
      const summaries = request.result
      resolve(summaries)
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
    const request = objectStore.getAll()

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = (event) => {
      console.error('Error getting all summaries:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

export { openDatabase, addSummary, getAllSummaries }
