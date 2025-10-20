// @ts-nocheck
import {
  getAllSummaries,
  getAllHistory,
  getAllTags,
  addMultipleSummaries,
  addMultipleTags,
  updateSummary,
  updateTag,
  getSummaryById,
  getTagById,
  openDatabase,
  addHistory,
  updateHistory,
} from '../lib/db/indexedDBService.js'
import { generateUUID, withRetry } from '../lib/utils/utils.js'
import { dataIntegrityService } from './dataIntegrityService.js'
import { settings, updateSettings } from '../stores/settingsStore.svelte.js'

/**
 * Smart Merge Service
 * Handles intelligent merging of data with conflict resolution
 */
class SmartMergeService {
  constructor() {
    this.mergeStrategies = {
      KEEP_EXISTING: 'keep_existing',
      USE_IMPORTED: 'use_imported',
      MERGE: 'merge',
      KEEP_BOTH: 'keep_both',
      SKIP: 'skip',
    }

    this.dataTypes = {
      SUMMARIES: 'summaries',
      HISTORY: 'history',
      TAGS: 'tags',
      SETTINGS: 'settings',
      THEMES: 'themes',
    }

    this.currentMergeSession = null
    this.mergeHistory = []
    this.batchSize = 50 // Process large datasets in batches
  }

  /**
   * Initialize a new merge session
   * @param {Object} importedData - Data to be imported
   * @param {Object} options - Merge options
   * @returns {Promise<string>} Merge session ID
   */
  async initializeMerge(importedData, options = {}) {
    try {
      const sessionId = generateUUID()

      // Create backup before merge
      const backupId = await dataIntegrityService.createPreImportBackup(
        `Pre-merge backup: ${options.description || 'Smart merge session'}`
      )

      // Detect conflicts
      const conflicts = await dataIntegrityService.detectConflicts(importedData)

      // Validate data structure
      const validation = await dataIntegrityService.validateDataStructure(
        importedData
      )

      this.currentMergeSession = {
        id: sessionId,
        backupId,
        importedData,
        options,
        conflicts,
        validation,
        startTime: new Date().toISOString(),
        status: 'initialized',
        resolutions: {},
        results: {
          summaries: { added: 0, updated: 0, skipped: 0, conflicts: 0 },
          history: { added: 0, updated: 0, skipped: 0, conflicts: 0 },
          tags: { added: 0, updated: 0, skipped: 0, conflicts: 0 },
          settings: { added: 0, updated: 0, skipped: 0, conflicts: 0 },
          themes: { added: 0, updated: 0, skipped: 0, conflicts: 0 },
        },
      }

      console.log(`Merge session initialized: ${sessionId}`)
      return sessionId
    } catch (error) {
      console.error('Error initializing merge:', error)
      throw new Error(`Failed to initialize merge: ${error.message}`)
    }
  }

  /**
   * Apply user resolutions from ConflictResolution component
   * @param {Object} resolutions - User resolutions for conflicts
   * @returns {Promise<Object>} Updated merge session
   */
  async applyUserResolutions(resolutions) {
    if (!this.currentMergeSession) {
      throw new Error('No active merge session')
    }

    try {
      this.currentMergeSession.resolutions = resolutions
      this.currentMergeSession.status = 'resolutions_applied'

      console.log('User resolutions applied successfully')
      return this.currentMergeSession
    } catch (error) {
      console.error('Error applying resolutions:', error)
      throw new Error(`Failed to apply resolutions: ${error.message}`)
    }
  }

  /**
   * Execute the merge process with applied resolutions
   * @returns {Promise<Object>} Merge results
   */
  async executeMerge() {
    if (!this.currentMergeSession) {
      throw new Error('No active merge session')
    }

    try {
      this.currentMergeSession.status = 'merging'
      const { importedData, resolutions } = this.currentMergeSession

      // Merge summaries with UUID-based logic
      if (importedData.summaries) {
        await this.mergeSummaries(importedData.summaries, resolutions)
      }

      // Merge history with UUID-based logic
      if (importedData.history) {
        await this.mergeHistory(importedData.history, resolutions)
      }

      // Merge tags with name-based matching
      if (importedData.tags) {
        await this.mergeTags(importedData.tags, resolutions)
      }

      // Merge settings with intelligent merge
      if (importedData.settings) {
        await this.mergeSettings(importedData.settings, resolutions)
      }

      // Merge themes with conflict resolution
      if (importedData.themes) {
        await this.mergeThemes(importedData.themes, resolutions)
      }

      this.currentMergeSession.status = 'completed'
      this.currentMergeSession.endTime = new Date().toISOString()

      // Generate merge report
      const report = this.generateMergeReport()

      // Save to merge history
      this.mergeHistory.push({ ...this.currentMergeSession, report })

      console.log('Merge completed successfully')
      return { session: this.currentMergeSession, report }
    } catch (error) {
      this.currentMergeSession.status = 'failed'
      this.currentMergeSession.error = error.message
      console.error('Error during merge execution:', error)
      throw new Error(`Merge failed: ${error.message}`)
    }
  }

  /**
   * Merge summaries with UUID-based logic
   * @param {Array} importedSummaries - Summaries to merge
   * @param {Object} resolutions - User resolutions
   */
  async mergeSummaries(importedSummaries, resolutions) {
    const currentSummaries = await getAllSummaries()
    const currentSummaryMap = new Map(currentSummaries.map((s) => [s.id, s]))
    const currentUrlMap = new Map(currentSummaries.map((s) => [s.url, s]))

    for (const importedSummary of importedSummaries) {
      const conflictId = `summary_${importedSummary.id}`
      const resolution = resolutions[conflictId] || this.mergeStrategies.MERGE

      // Check for UUID conflict
      if (currentSummaryMap.has(importedSummary.id)) {
        const existingSummary = currentSummaryMap.get(importedSummary.id)

        switch (resolution) {
          case this.mergeStrategies.KEEP_EXISTING:
            this.currentMergeSession.results.summaries.skipped++
            break

          case this.mergeStrategies.USE_IMPORTED:
            await updateSummary(importedSummary)
            this.currentMergeSession.results.summaries.updated++
            break

          case this.mergeStrategies.KEEP_BOTH:
            // Create new UUID for the imported summary
            const newSummary = {
              ...importedSummary,
              id: generateUUID(),
              title: `${importedSummary.title} (Imported)`,
            }
            await addMultipleSummaries([newSummary])
            this.currentMergeSession.results.summaries.added++
            break

          case this.mergeStrategies.MERGE:
          default:
            // Intelligent merge - combine data from both
            const mergedSummary = this.mergeSummaryData(
              existingSummary,
              importedSummary
            )
            await updateSummary(mergedSummary)
            this.currentMergeSession.results.summaries.updated++
            break
        }
      }
      // Check for URL conflict
      else if (importedSummary.url && currentUrlMap.has(importedSummary.url)) {
        const existingByUrl = currentUrlMap.get(importedSummary.url)
        const urlConflictId = `summary_url_${importedSummary.url}`
        const urlResolution = resolutions[urlConflictId] || resolution

        switch (urlResolution) {
          case this.mergeStrategies.KEEP_EXISTING:
            this.currentMergeSession.results.summaries.skipped++
            break

          case this.mergeStrategies.USE_IMPORTED:
            await updateSummary(importedSummary)
            this.currentMergeSession.results.summaries.updated++
            break

          case this.mergeStrategies.KEEP_BOTH:
            const newSummary = {
              ...importedSummary,
              id: generateUUID(),
              title: `${importedSummary.title} (Imported)`,
            }
            await addMultipleSummaries([newSummary])
            this.currentMergeSession.results.summaries.added++
            break

          case this.mergeStrategies.MERGE:
          default:
            const mergedSummary = this.mergeSummaryData(
              existingByUrl,
              importedSummary
            )
            await updateSummary(mergedSummary)
            this.currentMergeSession.results.summaries.updated++
            break
        }
      }
      // No conflict - add new summary
      else {
        await addMultipleSummaries([importedSummary])
        this.currentMergeSession.results.summaries.added++
      }
    }
  }

  /**
   * Merge history with UUID-based logic
   * @param {Array} importedHistory - History items to merge
   * @param {Object} resolutions - User resolutions
   */
  async mergeHistory(importedHistory, resolutions) {
    const currentHistory = await getAllHistory()
    const currentHistoryMap = new Map(currentHistory.map((h) => [h.id, h]))
    const currentUrlMap = new Map(currentHistory.map((h) => [h.url, h]))

    for (const importedItem of importedHistory) {
      const conflictId = `history_${importedItem.id}`
      const resolution = resolutions[conflictId] || this.mergeStrategies.MERGE

      // Check for UUID conflict
      if (currentHistoryMap.has(importedItem.id)) {
        const existingItem = currentHistoryMap.get(importedItem.id)

        switch (resolution) {
          case this.mergeStrategies.KEEP_EXISTING:
            this.currentMergeSession.results.history.skipped++
            break

          case this.mergeStrategies.USE_IMPORTED:
            await updateHistory(importedItem)
            this.currentMergeSession.results.history.updated++
            break

          case this.mergeStrategies.KEEP_BOTH:
            const newItem = {
              ...importedItem,
              id: generateUUID(),
              title: `${importedItem.title} (Imported)`,
            }
            await addHistory(newItem)
            this.currentMergeSession.results.history.added++
            break

          case this.mergeStrategies.MERGE:
          default:
            const mergedItem = this.mergeHistoryData(existingItem, importedItem)
            await updateHistory(mergedItem)
            this.currentMergeSession.results.history.updated++
            break
        }
      }
      // Check for URL conflict
      else if (importedItem.url && currentUrlMap.has(importedItem.url)) {
        const existingByUrl = currentUrlMap.get(importedItem.url)
        const urlConflictId = `history_url_${importedItem.url}`
        const urlResolution = resolutions[urlConflictId] || resolution

        switch (urlResolution) {
          case this.mergeStrategies.KEEP_EXISTING:
            this.currentMergeSession.results.history.skipped++
            break

          case this.mergeStrategies.USE_IMPORTED:
            await updateHistory(importedItem)
            this.currentMergeSession.results.history.updated++
            break

          case this.mergeStrategies.KEEP_BOTH:
            const newItem = {
              ...importedItem,
              id: generateUUID(),
              title: `${importedItem.title} (Imported)`,
            }
            await addHistory(newItem)
            this.currentMergeSession.results.history.added++
            break

          case this.mergeStrategies.MERGE:
          default:
            const mergedItem = this.mergeHistoryData(
              existingByUrl,
              importedItem
            )
            await updateHistory(mergedItem)
            this.currentMergeSession.results.history.updated++
            break
        }
      }
      // No conflict - add new history item
      else {
        await addHistory(importedItem)
        this.currentMergeSession.results.history.added++
      }
    }
  }

  /**
   * Merge tags with name-based matching
   * @param {Array} importedTags - Tags to merge
   * @param {Object} resolutions - User resolutions
   */
  async mergeTags(importedTags, resolutions) {
    const currentTags = await getAllTags()
    const currentTagMap = new Map(currentTags.map((t) => [t.id, t]))
    const currentNameMap = new Map(
      currentTags.map((t) => [t.name.toLowerCase(), t])
    )

    for (const importedTag of importedTags) {
      const conflictId = `tag_${importedTag.id}`
      const nameConflictId = `tag_name_${importedTag.name.toLowerCase()}`
      const resolution =
        resolutions[conflictId] ||
        resolutions[nameConflictId] ||
        this.mergeStrategies.MERGE

      // Check for name conflict (primary matching strategy)
      if (currentNameMap.has(importedTag.name.toLowerCase())) {
        const existingTag = currentNameMap.get(importedTag.name.toLowerCase())

        switch (resolution) {
          case this.mergeStrategies.KEEP_EXISTING:
            this.currentMergeSession.results.tags.skipped++
            break

          case this.mergeStrategies.USE_IMPORTED:
            // Update existing tag with imported data but keep existing ID
            const updatedTag = {
              ...existingTag,
              ...importedTag,
              id: existingTag.id, // Keep existing ID
            }
            await updateTag(updatedTag)
            this.currentMergeSession.results.tags.updated++
            break

          case this.mergeStrategies.KEEP_BOTH:
            // Create new tag with modified name
            const newTag = {
              ...importedTag,
              id: generateUUID(),
              name: `${importedTag.name} (Imported)`,
            }
            await addMultipleTags([newTag])
            this.currentMergeSession.results.tags.added++
            break

          case this.mergeStrategies.MERGE:
          default:
            // Merge tag properties, keeping existing ID
            const mergedTag = this.mergeTagData(existingTag, importedTag)
            await updateTag(mergedTag)
            this.currentMergeSession.results.tags.updated++
            break
        }
      }
      // Check for UUID conflict (fallback)
      else if (currentTagMap.has(importedTag.id)) {
        const existingTag = currentTagMap.get(importedTag.id)

        switch (resolution) {
          case this.mergeStrategies.KEEP_EXISTING:
            this.currentMergeSession.results.tags.skipped++
            break

          case this.mergeStrategies.USE_IMPORTED:
            await updateTag(importedTag)
            this.currentMergeSession.results.tags.updated++
            break

          case this.mergeStrategies.KEEP_BOTH:
            const newTag = {
              ...importedTag,
              id: generateUUID(),
              name: `${importedTag.name} (Imported)`,
            }
            await addMultipleTags([newTag])
            this.currentMergeSession.results.tags.added++
            break

          case this.mergeStrategies.MERGE:
          default:
            const mergedTag = this.mergeTagData(existingTag, importedTag)
            await updateTag(mergedTag)
            this.currentMergeSession.results.tags.updated++
            break
        }
      }
      // No conflict - add new tag
      else {
        await addMultipleTags([importedTag])
        this.currentMergeSession.results.tags.added++
      }
    }
  }

  /**
   * Merge settings with intelligent merge (preserve user customizations)
   * @param {Object} importedSettings - Settings to merge
   * @param {Object} resolutions - User resolutions
   */
  async mergeSettings(importedSettings, resolutions) {
    const currentSettings = { ...settings }

    for (const [key, value] of Object.entries(importedSettings)) {
      const conflictId = `settings_${key}`
      const resolution = resolutions[conflictId] || this.mergeStrategies.MERGE

      if (currentSettings.hasOwnProperty(key)) {
        switch (resolution) {
          case this.mergeStrategies.KEEP_EXISTING:
            this.currentMergeSession.results.settings.skipped++
            break

          case this.mergeStrategies.USE_IMPORTED:
            currentSettings[key] = value
            this.currentMergeSession.results.settings.updated++
            break

          case this.mergeStrategies.KEEP_BOTH:
            // Store imported setting with prefix
            currentSettings[`imported_${key}`] = value
            this.currentMergeSession.results.settings.added++
            break

          case this.mergeStrategies.MERGE:
          default:
            // Intelligent merge based on setting type
            const mergedValue = this.mergeSettingValue(
              key,
              currentSettings[key],
              value
            )
            currentSettings[key] = mergedValue
            this.currentMergeSession.results.settings.updated++
            break
        }
      } else {
        // New setting - just add it
        currentSettings[key] = value
        this.currentMergeSession.results.settings.added++
      }
    }

    // Apply merged settings
    await updateSettings(currentSettings)
  }

  /**
   * Merge themes with conflict resolution
   * @param {Object} importedThemes - Themes to merge
   * @param {Object} resolutions - User resolutions
   */
  async mergeThemes(importedThemes, resolutions) {
    // Get current themes from settings
    const currentThemes = settings.customThemes || {}

    for (const [themeName, themeData] of Object.entries(importedThemes)) {
      const conflictId = `theme_${themeName}`
      const resolution = resolutions[conflictId] || this.mergeStrategies.MERGE

      if (currentThemes.hasOwnProperty(themeName)) {
        switch (resolution) {
          case this.mergeStrategies.KEEP_EXISTING:
            this.currentMergeSession.results.themes.skipped++
            break

          case this.mergeStrategies.USE_IMPORTED:
            currentThemes[themeName] = themeData
            this.currentMergeSession.results.themes.updated++
            break

          case this.mergeStrategies.KEEP_BOTH:
            // Create new theme with modified name
            const newThemeName = `${themeName} (Imported)`
            currentThemes[newThemeName] = themeData
            this.currentMergeSession.results.themes.added++
            break

          case this.mergeStrategies.MERGE:
          default:
            // Merge theme properties
            currentThemes[themeName] = this.mergeThemeData(
              currentThemes[themeName],
              themeData
            )
            this.currentMergeSession.results.themes.updated++
            break
        }
      } else {
        // New theme - just add it
        currentThemes[themeName] = themeData
        this.currentMergeSession.results.themes.added++
      }
    }

    // Update settings with merged themes
    await updateSettings({ customThemes: currentThemes })
  }

  /**
   * Merge summary data intelligently
   * @param {Object} existing - Existing summary
   * @param {Object} imported - Imported summary
   * @returns {Object} Merged summary
   */
  mergeSummaryData(existing, imported) {
    const merged = { ...existing }

    // Update with newer data
    if (imported.updatedAt && existing.updatedAt) {
      if (new Date(imported.updatedAt) > new Date(existing.updatedAt)) {
        merged.summary = imported.summary || merged.summary
        merged.transcript = imported.transcript || merged.transcript
      }
    } else {
      // If no timestamps, prefer imported data
      merged.summary = imported.summary || merged.summary
      merged.transcript = imported.transcript || merged.transcript
    }

    // Merge tags (combine both)
    if (imported.tags && Array.isArray(imported.tags)) {
      const existingTags = Array.isArray(existing.tags) ? existing.tags : []
      merged.tags = [...new Set([...existingTags, ...imported.tags])]
    }

    // Update other fields if they exist in imported
    merged.title = imported.title || merged.title
    merged.url = imported.url || merged.url
    merged.updatedAt = new Date().toISOString()

    return merged
  }

  /**
   * Merge history data intelligently
   * @param {Object} existing - Existing history item
   * @param {Object} imported - Imported history item
   * @returns {Object} Merged history item
   */
  mergeHistoryData(existing, imported) {
    const merged = { ...existing }

    // Update with newer data
    if (imported.updatedAt && existing.updatedAt) {
      if (new Date(imported.updatedAt) > new Date(existing.updatedAt)) {
        merged.summary = imported.summary || merged.summary
        merged.transcript = imported.transcript || merged.transcript
      }
    } else {
      merged.summary = imported.summary || merged.summary
      merged.transcript = imported.transcript || merged.transcript
    }

    // Update other fields
    merged.title = imported.title || merged.title
    merged.url = imported.url || merged.url
    merged.contentType = imported.contentType || merged.contentType
    merged.updatedAt = new Date().toISOString()

    return merged
  }

  /**
   * Merge tag data intelligently
   * @param {Object} existing - Existing tag
   * @param {Object} imported - Imported tag
   * @returns {Object} Merged tag
   */
  mergeTagData(existing, imported) {
    const merged = { ...existing }

    // Keep existing ID and name, update other properties
    merged.color = imported.color || merged.color
    merged.description = imported.description || merged.description
    merged.updatedAt = new Date().toISOString()

    return merged
  }

  /**
   * Merge setting value based on type
   * @param {string} key - Setting key
   * @param {*} existing - Existing value
   * @param {*} imported - Imported value
   * @returns {*} Merged value
   */
  mergeSettingValue(key, existing, imported) {
    // Special handling for different setting types
    if (
      key === 'fabDomainControl' &&
      typeof existing === 'object' &&
      typeof imported === 'object'
    ) {
      // Merge domain control settings
      return {
        mode: imported.mode || existing.mode,
        whitelist: [
          ...new Set([
            ...(existing.whitelist || []),
            ...(imported.whitelist || []),
          ]),
        ],
        blacklist: [
          ...new Set([
            ...(existing.blacklist || []),
            ...(imported.blacklist || []),
          ]),
        ],
      }
    }

    if (Array.isArray(existing) && Array.isArray(imported)) {
      // Merge arrays
      return [...new Set([...existing, ...imported])]
    }

    if (
      typeof existing === 'object' &&
      typeof imported === 'object' &&
      existing !== null &&
      imported !== null
    ) {
      // Merge objects
      return { ...existing, ...imported }
    }

    // For primitive types, prefer imported (newer) value
    return imported
  }

  /**
   * Merge theme data intelligently
   * @param {Object} existing - Existing theme
   * @param {Object} imported - Imported theme
   * @returns {Object} Merged theme
   */
  mergeThemeData(existing, imported) {
    const merged = { ...existing }

    // Merge theme properties
    for (const [key, value] of Object.entries(imported)) {
      if (
        key === 'colors' &&
        typeof value === 'object' &&
        typeof merged.colors === 'object'
      ) {
        merged.colors = { ...merged.colors, ...value }
      } else {
        merged[key] = value
      }
    }

    merged.updatedAt = new Date().toISOString()

    return merged
  }

  /**
   * Generate detailed merge report with statistics
   * @returns {Object} Merge report
   */
  generateMergeReport() {
    if (!this.currentMergeSession) {
      throw new Error('No active merge session')
    }

    const { results, startTime, endTime, conflicts } = this.currentMergeSession

    // Calculate duration
    const duration = endTime ? new Date(endTime) - new Date(startTime) : 0

    // Calculate totals
    const totals = {
      added: 0,
      updated: 0,
      skipped: 0,
      conflicts: 0,
    }

    Object.values(results).forEach((result) => {
      totals.added += result.added
      totals.updated += result.updated
      totals.skipped += result.skipped
      totals.conflicts += result.conflicts
    })

    return {
      sessionId: this.currentMergeSession.id,
      startTime,
      endTime,
      duration: `${duration}ms`,
      status: this.currentMergeSession.status,
      conflicts: {
        total: conflicts.totalConflicts,
        resolved: Object.keys(this.currentMergeSession.resolutions).length,
        byType: conflicts,
      },
      results: {
        byType: results,
        totals,
      },
      validation: this.currentMergeSession.validation,
      backupId: this.currentMergeSession.backupId,
    }
  }

  /**
   * Rollback to backup if merge failed
   * @param {string} sessionId - Merge session ID
   * @returns {Promise<boolean>} Success status
   */
  async rollbackMerge(sessionId = null) {
    try {
      const session = sessionId
        ? this.mergeHistory.find((s) => s.id === sessionId)
        : this.currentMergeSession

      if (!session || !session.backupId) {
        throw new Error('No backup found for rollback')
      }

      const success = await dataIntegrityService.rollbackToBackup(
        session.backupId
      )

      if (success) {
        console.log(`Successfully rolled back merge session: ${session.id}`)
        return true
      }

      return false
    } catch (error) {
      console.error('Error during rollback:', error)
      throw new Error(`Rollback failed: ${error.message}`)
    }
  }

  /**
   * Get current merge session
   * @returns {Object|null} Current merge session
   */
  getCurrentMergeSession() {
    return this.currentMergeSession
  }

  /**
   * Get merge history
   * @returns {Array} Array of merge sessions
   */
  getMergeHistory() {
    return this.mergeHistory
  }

  /**
   * Clear current merge session
   */
  clearCurrentSession() {
    this.currentMergeSession = null
  }

  /**
   * Process large datasets in batches for better performance
   * @param {Array} items - Items to process
   * @param {Function} processFn - Function to process each batch
   * @param {number} batchSize - Size of each batch
   * @returns {Promise<Array>} Results from all batches
   */
  async processBatches(items, processFn, batchSize = this.batchSize) {
    const results = []

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResult = await processFn(batch)
      results.push(batchResult)

      // Allow UI to breathe between batches
      if (i + batchSize < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }

    return results.flat()
  }

  /**
   * Validate merge session before execution
   * @param {Object} session - Merge session to validate
   * @returns {boolean} Validation result
   */
  validateMergeSession(session) {
    if (!session) {
      throw new Error('No merge session provided')
    }

    if (!session.importedData) {
      throw new Error('No imported data in session')
    }

    if (session.status === 'completed') {
      throw new Error('Merge session already completed')
    }

    if (session.status === 'failed') {
      throw new Error('Cannot execute failed merge session')
    }

    return true
  }

  /**
   * Get merge strategy for a specific conflict
   * @param {string} conflictId - Conflict ID
   * @param {Object} resolutions - User resolutions
   * @param {string} defaultStrategy - Default strategy if no resolution found
   * @returns {string} Merge strategy
   */
  getResolutionStrategy(
    conflictId,
    resolutions,
    defaultStrategy = this.mergeStrategies.MERGE
  ) {
    return resolutions[conflictId] || defaultStrategy
  }

  /**
   * Check if data is large dataset
   * @param {Object} data - Data to check
   * @returns {boolean} True if large dataset
   */
  isLargeDataset(data) {
    const totalItems =
      (data.summaries?.length || 0) +
      (data.history?.length || 0) +
      (data.tags?.length || 0)

    return totalItems > this.batchSize * 2
  }

  /**
   * Optimize merge process for large datasets
   * @param {Object} importedData - Imported data
   * @param {Object} resolutions - User resolutions
   * @returns {Promise<Object>} Merge results
   */
  async optimizedMerge(importedData, resolutions) {
    const isLarge = this.isLargeDataset(importedData)

    if (!isLarge) {
      // Use standard merge for small datasets
      if (importedData.summaries)
        await this.mergeSummaries(importedData.summaries, resolutions)
      if (importedData.history)
        await this.mergeHistory(importedData.history, resolutions)
      if (importedData.tags)
        await this.mergeTags(importedData.tags, resolutions)
      if (importedData.settings)
        await this.mergeSettings(importedData.settings, resolutions)
      if (importedData.themes)
        await this.mergeThemes(importedData.themes, resolutions)
      return this.currentMergeSession.results
    }

    // Use batch processing for large datasets
    console.log('Processing large dataset with batch optimization')

    if (importedData.summaries) {
      await this.processBatches(importedData.summaries, (batch) =>
        this.mergeSummaries(batch, resolutions)
      )
    }

    if (importedData.history) {
      await this.processBatches(importedData.history, (batch) =>
        this.mergeHistory(batch, resolutions)
      )
    }

    if (importedData.tags) {
      await this.processBatches(importedData.tags, (batch) =>
        this.mergeTags(batch, resolutions)
      )
    }

    // Settings and themes are usually small, process normally
    if (importedData.settings)
      await this.mergeSettings(importedData.settings, resolutions)
    if (importedData.themes)
      await this.mergeThemes(importedData.themes, resolutions)

    return this.currentMergeSession.results
  }

  /**
   * Enhanced merge execution with retry logic and optimization
   * @returns {Promise<Object>} Merge results
   */
  async executeMergeEnhanced() {
    if (!this.currentMergeSession) {
      throw new Error('No active merge session')
    }

    this.validateMergeSession(this.currentMergeSession)

    const executeWithRetry = withRetry(
      async () => {
        this.currentMergeSession.status = 'merging'
        const { importedData, resolutions } = this.currentMergeSession

        // Use optimized merge for better performance
        await this.optimizedMerge(importedData, resolutions)

        this.currentMergeSession.status = 'completed'
        this.currentMergeSession.endTime = new Date().toISOString()

        // Generate merge report
        const report = this.generateMergeReport()

        // Save to merge history
        this.mergeHistory.push({ ...this.currentMergeSession, report })

        console.log('Merge completed successfully')
        return { session: this.currentMergeSession, report }
      },
      3,
      1000
    ) // 3 retries with 1s initial delay

    return executeWithRetry()
  }

  /**
   * Get merge statistics for analytics
   * @returns {Object} Merge statistics
   */
  getMergeStatistics() {
    const stats = {
      totalSessions: this.mergeHistory.length,
      successfulSessions: this.mergeHistory.filter(
        (s) => s.status === 'completed'
      ).length,
      failedSessions: this.mergeHistory.filter((s) => s.status === 'failed')
        .length,
      averageDuration: 0,
      totalItemsMerged: 0,
      mostCommonConflicts: {},
    }

    if (stats.totalSessions === 0) return stats

    // Calculate average duration
    const totalDuration = this.mergeHistory.reduce((sum, session) => {
      if (session.startTime && session.endTime) {
        return sum + (new Date(session.endTime) - new Date(session.startTime))
      }
      return sum
    }, 0)

    stats.averageDuration = totalDuration / stats.totalSessions

    // Calculate total items merged
    this.mergeHistory.forEach((session) => {
      if (session.report && session.report.results) {
        stats.totalItemsMerged +=
          session.report.results.totals.added +
          session.report.results.totals.updated
      }
    })

    return stats
  }

  /**
   * Clean up old merge history (keep last 10 sessions)
   */
  cleanupMergeHistory() {
    if (this.mergeHistory.length > 10) {
      this.mergeHistory = this.mergeHistory.slice(-10)
    }
  }
}

// Export singleton instance
export const smartMergeService = new SmartMergeService()
export default smartMergeService
