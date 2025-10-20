// @ts-nocheck
import {
  getAllSummaries,
  getAllHistory,
  getAllTags,
  addMultipleSummaries,
  addMultipleTags,
  openDatabase,
} from '../lib/db/indexedDBService.js'
import { generateUUID } from '../lib/utils/utils.js'

const BACKUP_STORE_NAME = 'data_backups'
const DB_NAME = 'summarizer_db'
let db

/**
 * Data Integrity Service
 * Provides backup, conflict detection, validation, and rollback functionality
 */
class DataIntegrityService {
  constructor() {
    this.currentBackupId = null
  }

  /**
   * Initialize the backup store if it doesn't exist
   */
  async initializeBackupStore() {
    if (!db) db = await openDatabase()

    // Check if backup store exists
    if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
      // Need to upgrade the database to add the backup store
      console.log('Backup store not found, creating database upgrade...')

      // Close current connection to allow upgrade
      db.close()

      // Open with higher version to trigger upgrade
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 8) // Increase version

        request.onupgradeneeded = (event) => {
          const upgradedDb = event.target.result

          // Create backup store
          if (!upgradedDb.objectStoreNames.contains(BACKUP_STORE_NAME)) {
            const backupStore = upgradedDb.createObjectStore(
              BACKUP_STORE_NAME,
              {
                keyPath: 'id',
              }
            )
            backupStore.createIndex('createdAt', 'createdAt', { unique: false })
            backupStore.createIndex('type', 'type', { unique: false })
            console.log('Backup store created successfully')
          }
        }

        request.onsuccess = (event) => {
          db = event.target.result
          resolve()
        }

        request.onerror = (event) => {
          console.error('Failed to upgrade database:', event.target.error)
          reject(event.target.error)
        }
      })
    }

    return Promise.resolve()
  }

  /**
   * Create a complete backup of all data before import
   * @param {string} description - Optional description for the backup
   * @returns {Promise<string>} Backup ID
   */
  async createPreImportBackup(description = 'Pre-import backup') {
    try {
      await this.initializeBackupStore()

      // Get all current data
      const summaries = await getAllSummaries()
      const history = await getAllHistory()
      const tags = await getAllTags()

      const backupData = {
        id: generateUUID(),
        createdAt: new Date().toISOString(),
        description,
        type: 'pre_import',
        data: {
          summaries,
          history,
          tags,
        },
      }

      // Store backup
      await this.storeBackup(backupData)
      this.currentBackupId = backupData.id

      console.log(`Pre-import backup created with ID: ${backupData.id}`)
      return backupData.id
    } catch (error) {
      console.error('Error creating pre-import backup:', error)
      throw new Error(`Failed to create backup: ${error.message}`)
    }
  }

  /**
   * Store backup data in IndexedDB
   * @param {Object} backupData - Backup data object
   */
  async storeBackup(backupData) {
    if (!db) db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BACKUP_STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(BACKUP_STORE_NAME)
      const request = objectStore.add(backupData)

      request.onsuccess = () => resolve(request.result)
      request.onerror = (event) => reject(event.target.error)
    })
  }

  /**
   * Detect conflicts between imported data and current data
   * @param {Object} importedData - Data to be imported
   * @returns {Promise<Object>} Conflict report
   */
  async detectConflicts(importedData) {
    try {
      const currentSummaries = await getAllSummaries()
      const currentHistory = await getAllHistory()
      const currentTags = await getAllTags()

      const conflicts = {
        uuidConflicts: {
          summaries: [],
          history: [],
          tags: [],
        },
        urlConflicts: {
          summaries: [],
          history: [],
        },
        tagConflicts: [],
        totalConflicts: 0,
      }

      // Check UUID conflicts for summaries
      if (importedData.summaries) {
        const currentSummaryIds = new Set(currentSummaries.map((s) => s.id))
        importedData.summaries.forEach((summary) => {
          if (currentSummaryIds.has(summary.id)) {
            conflicts.uuidConflicts.summaries.push({
              id: summary.id,
              title: summary.title,
              url: summary.url,
            })
            conflicts.totalConflicts++
          }
        })

        // Check URL conflicts for summaries
        const currentSummaryUrls = new Set(currentSummaries.map((s) => s.url))
        importedData.summaries.forEach((summary) => {
          if (summary.url && currentSummaryUrls.has(summary.url)) {
            conflicts.urlConflicts.summaries.push({
              id: summary.id,
              title: summary.title,
              url: summary.url,
            })
            conflicts.totalConflicts++
          }
        })
      }

      // Check UUID conflicts for history
      if (importedData.history) {
        const currentHistoryIds = new Set(currentHistory.map((h) => h.id))
        importedData.history.forEach((item) => {
          if (currentHistoryIds.has(item.id)) {
            conflicts.uuidConflicts.history.push({
              id: item.id,
              title: item.title,
              url: item.url,
            })
            conflicts.totalConflicts++
          }
        })

        // Check URL conflicts for history
        const currentHistoryUrls = new Set(currentHistory.map((h) => h.url))
        importedData.history.forEach((item) => {
          if (item.url && currentHistoryUrls.has(item.url)) {
            conflicts.urlConflicts.history.push({
              id: item.id,
              title: item.title,
              url: item.url,
            })
            conflicts.totalConflicts++
          }
        })
      }

      // Check UUID conflicts for tags
      if (importedData.tags) {
        const currentTagIds = new Set(currentTags.map((t) => t.id))
        const currentTagNames = new Set(currentTags.map((t) => t.name))

        importedData.tags.forEach((tag) => {
          if (currentTagIds.has(tag.id)) {
            conflicts.uuidConflicts.tags.push({
              id: tag.id,
              name: tag.name,
            })
            conflicts.totalConflicts++
          }

          if (currentTagNames.has(tag.name)) {
            conflicts.tagConflicts.push({
              id: tag.id,
              name: tag.name,
            })
            conflicts.totalConflicts++
          }
        })
      }

      return conflicts
    } catch (error) {
      console.error('Error detecting conflicts:', error)
      throw new Error(`Failed to detect conflicts: ${error.message}`)
    }
  }

  /**
   * Validate the structure of imported data
   * @param {Object} importedData - Data to validate
   * @returns {Promise<Object>} Validation report
   */
  async validateDataStructure(importedData) {
    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        summary: {
          totalItems: 0,
          validItems: 0,
          invalidItems: 0,
        },
      }

      // Validate summaries
      if (importedData.summaries) {
        validation.summary.totalItems += importedData.summaries.length

        importedData.summaries.forEach((summary, index) => {
          const itemValidation = this.validateSummaryItem(summary, index)
          if (itemValidation.isValid) {
            validation.summary.validItems++
          } else {
            validation.summary.invalidItems++
            validation.isValid = false
            validation.errors.push(...itemValidation.errors)
          }
          validation.warnings.push(...itemValidation.warnings)
        })
      }

      // Validate history
      if (importedData.history) {
        validation.summary.totalItems += importedData.history.length

        importedData.history.forEach((item, index) => {
          const itemValidation = this.validateHistoryItem(item, index)
          if (itemValidation.isValid) {
            validation.summary.validItems++
          } else {
            validation.summary.invalidItems++
            validation.isValid = false
            validation.errors.push(...itemValidation.errors)
          }
          validation.warnings.push(...itemValidation.warnings)
        })
      }

      // Validate tags
      if (importedData.tags) {
        validation.summary.totalItems += importedData.tags.length

        importedData.tags.forEach((tag, index) => {
          const itemValidation = this.validateTagItem(tag, index)
          if (itemValidation.isValid) {
            validation.summary.validItems++
          } else {
            validation.summary.invalidItems++
            validation.isValid = false
            validation.errors.push(...itemValidation.errors)
          }
          validation.warnings.push(...itemValidation.warnings)
        })
      }

      return validation
    } catch (error) {
      console.error('Error validating data structure:', error)
      throw new Error(`Failed to validate data: ${error.message}`)
    }
  }

  /**
   * Validate a single summary item
   * @param {Object} summary - Summary item to validate
   * @param {number} index - Index of the item in the array
   * @returns {Object} Validation result
   */
  validateSummaryItem(summary, index) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    // Required fields
    if (!summary.id) {
      result.isValid = false
      result.errors.push(
        `Summary at index ${index}: Missing required field 'id'`
      )
    }

    if (!summary.title) {
      result.isValid = false
      result.errors.push(
        `Summary at index ${index}: Missing required field 'title'`
      )
    }

    if (!summary.url) {
      result.isValid = false
      result.errors.push(
        `Summary at index ${index}: Missing required field 'url'`
      )
    }

    if (!summary.date) {
      result.warnings.push(
        `Summary at index ${index}: Missing field 'date', will use current date`
      )
    }

    // Optional fields validation
    if (summary.tags && !Array.isArray(summary.tags)) {
      result.warnings.push(
        `Summary at index ${index}: 'tags' should be an array`
      )
    }

    return result
  }

  /**
   * Validate a single history item
   * @param {Object} item - History item to validate
   * @param {number} index - Index of the item in the array
   * @returns {Object} Validation result
   */
  validateHistoryItem(item, index) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    // Required fields
    if (!item.id) {
      result.isValid = false
      result.errors.push(
        `History item at index ${index}: Missing required field 'id'`
      )
    }

    if (!item.title) {
      result.isValid = false
      result.errors.push(
        `History item at index ${index}: Missing required field 'title'`
      )
    }

    if (!item.url) {
      result.isValid = false
      result.errors.push(
        `History item at index ${index}: Missing required field 'url'`
      )
    }

    if (!item.date) {
      result.warnings.push(
        `History item at index ${index}: Missing field 'date', will use current date`
      )
    }

    return result
  }

  /**
   * Validate a single tag item
   * @param {Object} tag - Tag item to validate
   * @param {number} index - Index of the item in the array
   * @returns {Object} Validation result
   */
  validateTagItem(tag, index) {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    }

    // Required fields
    if (!tag.id) {
      result.isValid = false
      result.errors.push(`Tag at index ${index}: Missing required field 'id'`)
    }

    if (!tag.name) {
      result.isValid = false
      result.errors.push(`Tag at index ${index}: Missing required field 'name'`)
    }

    if (!tag.createdAt) {
      result.warnings.push(
        `Tag at index ${index}: Missing field 'createdAt', will use current date`
      )
    }

    return result
  }

  /**
   * Rollback to a previous backup
   * @param {string} backupId - ID of the backup to rollback to
   * @returns {Promise<boolean>} Success status
   */
  async rollbackToBackup(backupId) {
    try {
      const backup = await this.getBackupById(backupId)
      if (!backup) {
        throw new Error(`Backup with ID ${backupId} not found`)
      }

      // Clear current data
      await this.clearAllData()

      // Restore data from backup
      if (backup.data.summaries && backup.data.summaries.length > 0) {
        await addMultipleSummaries(backup.data.summaries)
      }

      if (backup.data.history && backup.data.history.length > 0) {
        await this.restoreHistoryData(backup.data.history)
      }

      if (backup.data.tags && backup.data.tags.length > 0) {
        await addMultipleTags(backup.data.tags)
      }

      console.log(`Successfully rolled back to backup ${backupId}`)
      return true
    } catch (error) {
      console.error('Error during rollback:', error)
      throw new Error(`Failed to rollback: ${error.message}`)
    }
  }

  /**
   * Get backup by ID
   * @param {string} backupId - Backup ID
   * @returns {Promise<Object>} Backup data
   */
  async getBackupById(backupId) {
    if (!db) db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BACKUP_STORE_NAME], 'readonly')
      const objectStore = transaction.objectStore(BACKUP_STORE_NAME)
      const request = objectStore.get(backupId)

      request.onsuccess = () => resolve(request.result)
      request.onerror = (event) => reject(event.target.error)
    })
  }

  /**
   * Get all backups
   * @returns {Promise<Array>} Array of backups
   */
  async getAllBackups() {
    if (!db) db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BACKUP_STORE_NAME], 'readonly')
      const objectStore = transaction.objectStore(BACKUP_STORE_NAME)
      const backups = []

      const request = objectStore.index('createdAt').openCursor(null, 'prev')
      request.onsuccess = (event) => {
        const cursor = event.target.result
        if (cursor) {
          backups.push(cursor.value)
          cursor.continue()
        } else {
          resolve(backups)
        }
      }
      request.onerror = (event) => reject(event.target.error)
    })
  }

  /**
   * Clear all current data (summaries, history, tags)
   * @returns {Promise<boolean>} Success status
   */
  async clearAllData() {
    if (!db) db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        ['summaries', 'history', 'tags'],
        'readwrite'
      )

      transaction.oncomplete = () => resolve(true)
      transaction.onerror = (event) => reject(event.target.error)

      // Clear all stores
      transaction.objectStore('summaries').clear()
      transaction.objectStore('history').clear()
      transaction.objectStore('tags').clear()
    })
  }

  /**
   * Restore history data (helper function for rollback)
   * @param {Array} historyData - History data to restore
   * @returns {Promise<boolean>} Success status
   */
  async restoreHistoryData(historyData) {
    if (!db) db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['history'], 'readwrite')
      const objectStore = transaction.objectStore('history')
      let count = 0

      historyData.forEach((item) => {
        const request = objectStore.put(item)
        request.onsuccess = () => {
          count++
          if (count === historyData.length) {
            resolve(true)
          }
        }
      })

      transaction.oncomplete = () => resolve(true)
      transaction.onerror = (event) => reject(event.target.error)
    })
  }

  /**
   * Delete a backup
   * @param {string} backupId - Backup ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteBackup(backupId) {
    if (!db) db = await openDatabase()

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([BACKUP_STORE_NAME], 'readwrite')
      const objectStore = transaction.objectStore(BACKUP_STORE_NAME)
      const request = objectStore.delete(backupId)

      request.onsuccess = () => resolve(true)
      request.onerror = (event) => reject(event.target.error)
    })
  }

  /**
   * Get current backup ID
   * @returns {string|null} Current backup ID
   */
  getCurrentBackupId() {
    return this.currentBackupId
  }
}

// Export singleton instance
export const dataIntegrityService = new DataIntegrityService()
export default dataIntegrityService
