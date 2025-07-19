// @ts-nocheck
import { generateUUID } from './utils'

const DB_NAME = 'summarizer_db'
const STORE_NAME = 'summaries'
const DB_VERSION = 3
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
        objectStore.createIndex('isArchived', 'isArchived', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      db = event.target.result
      console.log('IndexedDB opened successfully.')
      resolve(db)
    }

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

async function addSummary(summaryData) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const newSummary = { ...summaryData, id: generateUUID() } // Tạo ID mới cho bản tóm tắt
    const request = objectStore.add(newSummary)

    request.onsuccess = () => {
      resolve(newSummary.id) // Trả về ID mới được tạo
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

async function deleteSummary(id) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)

    // Lấy summary trước khi xóa để có historySourceId
    const getRequest = objectStore.get(id)
    getRequest.onsuccess = async () => {
      const summaryToDelete = getRequest.result
      if (summaryToDelete && summaryToDelete.historySourceId) {
        // Lưu trữ historySourceId nếu có trước khi xóa summary
        const historySourceId = summaryToDelete.historySourceId

        // Xóa summary
        const deleteRequest = objectStore.delete(id)
        deleteRequest.onsuccess = async () => {
          console.log(`Summary with ID ${id} successfully deleted.`)
          // Cập nhật isArchived của mục history tương ứng sau khi summary đã được xóa
          if (historySourceId) {
            try {
              await updateHistoryArchivedStatus(historySourceId, false)
            } catch (error) {
              console.error(
                'Error updating history archived status after deleting summary:',
                error
              )
              // Vẫn tiếp tục resolve dù có lỗi cập nhật history
            }
          }
          resolve(true)
        }
        deleteRequest.onerror = (event) => {
          console.error('Error deleting summary:', event.target.errorCode)
          reject(event.target.errorCode)
        }
      } else {
        // Nếu không tìm thấy summary để xóa, vẫn tiến hành xóa
        const deleteRequest = objectStore.delete(id)
        deleteRequest.onsuccess = () => {
          console.log(`Summary with ID ${id} successfully deleted.`)
          resolve(true)
        }
        deleteRequest.onerror = (event) => {
          console.error('Error deleting summary:', event.target.errorCode)
          reject(event.target.errorCode)
        }
      }
    }
    getRequest.onerror = (event) => {
      console.error(
        'Error getting summary before deletion:',
        event.target.errorCode
      )
      reject(event.target.errorCode)
    }
  })
}

async function deleteHistory(id) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    console.log(`Attempting to delete history with ID: ${id}`)
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')

    transaction.oncomplete = () => {
      console.log(
        `Transaction completed. History with ID ${id} successfully deleted.`
      )
      resolve(true)
    }

    transaction.onerror = (event) => {
      console.error('Transaction error deleting history:', event.target.error)
      reject(event.target.error)
    }

    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    objectStore.delete(id)
  })
}

async function updateSummary(summary) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.put(summary) // Use put for update

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = (event) => {
      console.error('Error updating summary:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

async function updateHistory(historyData) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    const request = objectStore.put(historyData) // Use put for update

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = (event) => {
      console.error('Error updating history:', event.target.errorCode)
      reject(event.target.errorCode)
    }
  })
}

async function updateHistoryArchivedStatus(id, isArchivedStatus) {
  if (!db) {
    db = await openDatabase()
  }
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
        putRequest.onerror = (event) =>
          reject(
            'Error updating history archived status:' + event.target.errorCode
          )
      } else {
        reject('History item not found.')
      }
    }
    getRequest.onerror = (event) =>
      reject('Error getting history item for update:' + event.target.errorCode)
  })
}

async function moveHistoryItemToArchive(historyId) {
  if (!db) {
    db = await openDatabase()
  }
  return new Promise(async (resolve, reject) => {
    try {
      const historyItem = await getHistoryById(historyId)
      if (historyItem) {
        // Tạo một bản sao của historyItem và thêm historySourceId
        const summaryToArchive = { ...historyItem, historySourceId: historyId }
        // Gọi addSummary để thêm vào kho summaries, addSummary sẽ tạo id mới
        await addSummary(summaryToArchive)
        // Cập nhật trạng thái isArchived của mục lịch sử gốc
        await updateHistoryArchivedStatus(historyId, true)
        resolve(true)
      } else {
        reject('History item not found.')
      }
    } catch (error) {
      console.error('Error moving history item to archive:', error)
      reject(error)
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
  deleteSummary,
  deleteHistory,
  updateSummary,
  updateHistory,
  updateHistoryArchivedStatus,
  moveHistoryItemToArchive,
}
