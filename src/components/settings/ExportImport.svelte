<script>
  // @ts-nocheck
  import { get } from 'svelte/store'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import {
    themeSettings,
    updateThemeSettings,
  } from '../../stores/themeStore.svelte.js'
  import { archiveStore } from '../../stores/archiveStore.svelte.js'
  import {
    tagsCache,
    invalidateTagsCache,
    preloadTagsData,
  } from '../../stores/tagsCacheStore.svelte.js'
  import {
    addMultipleSummaries,
    addMultipleTags,
  } from '../../lib/db/indexedDBService.js'

  // Import new services and components
  import { dataIntegrityService } from '../../services/dataIntegrityService.js'
  import {
    validateImportFile,
    formatValidationResult,
  } from '../../lib/utils/importValidation.js'
  import { smartMergeService } from '../../services/smartMergeService.js'
  import ConflictResolution from './ConflictResolution.svelte'
  import ImportProgress from './ImportProgress.svelte'

  // State management
  let showImportModal = false
  let showConflictModal = false
  let showProgressModal = false
  let importData = null
  let validationResults = null
  let conflicts = null
  let currentBackupId = null
  let mergeSession = null
  let errorMessage = ''
  let successMessage = ''

  // Import options
  let importOptions = {
    dataTypes: {
      settings: true,
      theme: true,
      archive: true,
      tags: true,
    },
    mergeMode: 'merge', // merge, replace, smart_merge
    autoBackup: true,
    conflictResolution: 'prompt', // prompt, auto_keep_existing, auto_use_imported, auto_merge
  }

  // Progress tracking
  let progressData = {
    stage: '',
    progress: 0,
    total: 0,
    message: '',
    errors: [],
  }

  // Available data types from imported file
  let availableDataTypes = []

  // Enhanced export function with better error handling and progress tracking
  async function exportData() {
    try {
      showProgressModal = true
      progressData = {
        stage: 'preparing',
        progress: 0,
        total: 100,
        message: 'Preparing export data...',
        errors: [],
      }

      // Get all data with progress tracking
      const data = {
        metadata: generateExportMetadata(),
        settings: settings,
        theme: themeSettings,
        archive: archiveStore.archiveList || [],
        tags: tagsCache.tags || [],
      }

      progressData.stage = 'validating'
      progressData.progress = 25
      progressData.message = 'Validating data integrity...'

      // Validate data before export
      const validation = await dataIntegrityService.validateDataStructure({
        summaries: data.archive,
        history: [],
        tags: data.tags,
      })

      if (!validation.isValid) {
        throw new Error(
          `Data validation failed: ${validation.errors.join(', ')}`
        )
      }

      progressData.stage = 'serializing'
      progressData.progress = 50
      progressData.message = 'Serializing data...'

      // Create JSON with proper formatting
      const json = JSON.stringify(data, null, 2)

      progressData.stage = 'creating_file'
      progressData.progress = 75
      progressData.message = 'Creating export file...'

      // Generate and download file
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `summarizerrrr-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      progressData.stage = 'completed'
      progressData.progress = 100
      progressData.message = 'Export completed successfully!'

      setTimeout(() => {
        showProgressModal = false
        successMessage = 'Data exported successfully!'
        setTimeout(() => (successMessage = ''), 3000)
      }, 1500)
    } catch (error) {
      console.error('Export error:', error)
      progressData.errors.push(`Export failed: ${error.message}`)
      progressData.stage = 'error'
      progressData.message = 'Export failed'

      setTimeout(() => {
        showProgressModal = false
        errorMessage = `Export failed: ${error.message}`
        setTimeout(() => (errorMessage = ''), 5000)
      }, 2000)
    }
  }

  // Generate metadata for export
  function generateExportMetadata() {
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: 'Summarizerrrr Extension',
      dataType: 'backup',
      description: 'Complete data backup from Summarizerrrr extension',
      itemCount: {
        settings: Object.keys(settings).length,
        themes: Object.keys(themeSettings).length,
        archive: (archiveStore.archiveList || []).length,
        tags: (tagsCache.tags || []).length,
      },
    }
  }

  // Enhanced file handling with validation
  async function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      showProgressModal = true
      progressData = {
        stage: 'validating',
        progress: 0,
        total: 100,
        message: 'Validating file format...',
        errors: [],
      }

      // Validate file using import validation service
      const validation = await validateImportFile(file)

      if (!validation.valid) {
        const formatted = formatValidationResult(validation)
        console.error('Validation errors:', formatted.errors)
        const errorDetails =
          formatted.errors && formatted.errors.length > 0
            ? formatted.errors.map((e) => e.message).join('; ')
            : formatted.message
        throw new Error(`File validation failed: ${errorDetails}`)
      }

      progressData.stage = 'reading'
      progressData.progress = 25
      progressData.message = 'Reading file content...'

      // Read and parse file
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result)

          progressData.stage = 'processing'
          progressData.progress = 50
          progressData.message = 'Processing imported data...'

          // Store data and update available types
          importData = data
          validationResults = validation
          availableDataTypes = Object.keys(data).filter(
            (key) => key !== 'metadata'
          )

          // Reset import selections based on available data
          importOptions.dataTypes = {
            settings: availableDataTypes.includes('settings'),
            theme:
              availableDataTypes.includes('theme') ||
              availableDataTypes.includes('themes'),
            archive:
              availableDataTypes.includes('archive') ||
              availableDataTypes.includes('summaries'),
            tags: availableDataTypes.includes('tags'),
          }

          progressData.stage = 'completed'
          progressData.progress = 100
          progressData.message = 'File processed successfully'

          setTimeout(() => {
            showProgressModal = false
            showImportModal = true
          }, 1000)
        } catch (parseError) {
          throw new Error(`Failed to parse JSON: ${parseError.message}`)
        }
      }

      reader.onerror = () => {
        throw new Error('Failed to read file')
      }

      reader.readAsText(file)
    } catch (error) {
      console.error('File selection error:', error)
      progressData.errors.push(`File processing failed: ${error.message}`)
      progressData.stage = 'error'
      progressData.message = 'File processing failed'

      setTimeout(() => {
        showProgressModal = false
        errorMessage = `File processing failed: ${error.message}`
        setTimeout(() => (errorMessage = ''), 5000)
      }, 2000)
    }
  }

  // Enhanced import function with validation, backup, and conflict detection
  async function startImport() {
    if (!importData) return

    try {
      showImportModal = false
      showProgressModal = true

      progressData = {
        stage: 'preparing',
        progress: 0,
        total: 100,
        message: 'Preparing import process...',
        errors: [],
      }

      // Create backup if enabled
      if (importOptions.autoBackup) {
        progressData.stage = 'backup'
        progressData.progress = 10
        progressData.message = 'Creating backup...'

        currentBackupId = await dataIntegrityService.createPreImportBackup(
          `Pre-import backup: ${new Date().toISOString()}`
        )
      }

      // Detect conflicts
      progressData.stage = 'detecting_conflicts'
      progressData.progress = 20
      progressData.message = 'Detecting conflicts...'

      const importedData = prepareImportData()
      conflicts = await dataIntegrityService.detectConflicts(importedData)

      if (conflicts.totalConflicts > 0) {
        progressData.stage = 'conflicts_found'
        progressData.progress = 30
        progressData.message = `Found ${conflicts.totalConflicts} conflicts`

        // Initialize smart merge session
        mergeSession = await smartMergeService.initializeMerge(importedData, {
          description: `Import from ${new Date().toISOString()}`,
          mergeMode: importOptions.mergeMode,
        })

        setTimeout(() => {
          showProgressModal = false
          showConflictModal = true
        }, 1000)
      } else {
        // No conflicts, proceed with import
        await executeImport(importedData)
      }
    } catch (error) {
      console.error('Import preparation error:', error)
      progressData.errors.push(`Import preparation failed: ${error.message}`)
      progressData.stage = 'error'
      progressData.message = 'Import preparation failed'

      setTimeout(() => {
        showProgressModal = false
        errorMessage = `Import preparation failed: ${error.message}`
        setTimeout(() => (errorMessage = ''), 5000)
      }, 2000)
    }
  }

  // Prepare import data based on selections
  function prepareImportData() {
    const data = {}

    if (importOptions.dataTypes.settings && importData.settings) {
      data.settings = importData.settings
    }

    if (
      importOptions.dataTypes.theme &&
      (importData.theme || importData.themes)
    ) {
      data.theme = importData.theme || importData.themes
    }

    if (
      importOptions.dataTypes.archive &&
      (importData.archive || importData.summaries)
    ) {
      data.summaries = importData.archive || importData.summaries
    }

    if (importOptions.dataTypes.tags && importData.tags) {
      data.tags = importData.tags
    }

    return data
  }

  // Execute import with different strategies
  async function executeImport(importedData, resolutions = {}) {
    try {
      showProgressModal = true

      if (importOptions.mergeMode === 'smart_merge' && mergeSession) {
        // Use smart merge service
        progressData.stage = 'smart_merge'
        progressData.progress = 40
        progressData.message = 'Executing smart merge...'

        await smartMergeService.applyUserResolutions(resolutions)
        const result = await smartMergeService.executeMergeEnhanced()

        progressData.stage = 'completed'
        progressData.progress = 100
        progressData.message = 'Smart merge completed successfully!'
      } else {
        // Use simple import strategy
        await performSimpleImport(importedData)
      }

      // Refresh stores
      progressData.stage = 'refreshing'
      progressData.progress = 90
      progressData.message = 'Refreshing data...'

      if (importOptions.dataTypes.archive) {
        await archiveStore.loadData()
      }

      if (importOptions.dataTypes.tags) {
        invalidateTagsCache()
        await preloadTagsData()
      }

      progressData.stage = 'completed'
      progressData.progress = 100
      progressData.message = 'Import completed successfully!'

      setTimeout(() => {
        showProgressModal = false
        successMessage = 'Data imported successfully!'
        setTimeout(() => (successMessage = ''), 3000)
        resetImportState()
      }, 1500)
    } catch (error) {
      console.error('Import execution error:', error)
      progressData.errors.push(`Import failed: ${error.message}`)
      progressData.stage = 'error'
      progressData.message = 'Import failed'

      // Offer rollback if backup exists
      if (currentBackupId) {
        setTimeout(() => {
          showProgressModal = false
          errorMessage = `Import failed: ${error.message}. Backup created, you can rollback if needed.`
          setTimeout(() => (errorMessage = ''), 8000)
        }, 2000)
      } else {
        setTimeout(() => {
          showProgressModal = false
          errorMessage = `Import failed: ${error.message}`
          setTimeout(() => (errorMessage = ''), 5000)
        }, 2000)
      }
    }
  }

  // Simple import logic (backward compatibility)
  async function performSimpleImport(importedData) {
    progressData.stage = 'importing'
    progressData.progress = 50
    progressData.message = 'Importing data...'

    if (importedData.settings) {
      if (importOptions.mergeMode === 'replace') {
        await updateSettings(importedData.settings)
      } else {
        const mergedSettings = { ...settings, ...importedData.settings }
        await updateSettings(mergedSettings)
      }
    }

    if (importedData.theme) {
      if (importOptions.mergeMode === 'replace') {
        await updateThemeSettings(importedData.theme)
      } else {
        const mergedTheme = { ...themeSettings, ...importedData.theme }
        await updateThemeSettings(mergedTheme)
      }
    }

    if (importedData.summaries) {
      await addMultipleSummaries(importedData.summaries)
    }

    if (importedData.tags) {
      await addMultipleTags(importedData.tags)
    }
  }

  // Handle conflict resolution
  async function handleConflictResolution(event) {
    const { resolutions } = event.detail
    showConflictModal = false

    const importedData = prepareImportData()
    await executeImport(importedData, resolutions)
  }

  // Handle conflict cancellation
  function handleConflictCancel() {
    showConflictModal = false
    // Optional: rollback backup if it was created
    if (currentBackupId && importOptions.autoBackup) {
      // Keep backup for manual rollback
    }
    resetImportState()
  }

  // Rollback to previous backup
  async function rollbackImport() {
    if (!currentBackupId) {
      errorMessage = 'No backup available for rollback'
      setTimeout(() => (errorMessage = ''), 3000)
      return
    }

    try {
      showProgressModal = true
      progressData = {
        stage: 'rolling_back',
        progress: 0,
        total: 100,
        message: 'Rolling back to previous backup...',
        errors: [],
      }

      const success =
        await dataIntegrityService.rollbackToBackup(currentBackupId)

      if (success) {
        progressData.stage = 'refreshing'
        progressData.progress = 80
        progressData.message = 'Refreshing data after rollback...'

        // Refresh all stores
        await archiveStore.loadData()
        invalidateTagsCache()
        await preloadTagsData()

        progressData.stage = 'completed'
        progressData.progress = 100
        progressData.message = 'Rollback completed successfully!'

        setTimeout(() => {
          showProgressModal = false
          successMessage = 'Rollback completed successfully!'
          setTimeout(() => (successMessage = ''), 3000)
        }, 1500)
      } else {
        throw new Error('Rollback operation failed')
      }
    } catch (error) {
      console.error('Rollback error:', error)
      progressData.errors.push(`Rollback failed: ${error.message}`)
      progressData.stage = 'error'
      progressData.message = 'Rollback failed'

      setTimeout(() => {
        showProgressModal = false
        errorMessage = `Rollback failed: ${error.message}`
        setTimeout(() => (errorMessage = ''), 5000)
      }, 2000)
    }
  }

  // Reset import state
  function resetImportState() {
    importData = null
    validationResults = null
    conflicts = null
    currentBackupId = null
    mergeSession = null
    availableDataTypes = []

    // Reset file input
    const fileInput = document.querySelector('input[type="file"]')
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Cancel import process
  function cancelImport() {
    showImportModal = false
    resetImportState()
  }
</script>

<div class="p-4 border-t border-gray-200 dark:border-gray-700">
  <h3 class="text-lg font-medium text-gray-900 dark:text-white">
    Export/Import Data
  </h3>

  <!-- Success/Error Messages -->
  {#if successMessage}
    <div
      class="mt-2 p-3 bg-green-100 border border-green-400 text-green-700 rounded"
    >
      {successMessage}
    </div>
  {/if}

  {#if errorMessage}
    <div class="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {errorMessage}
      {#if currentBackupId}
        <button
          on:click={rollbackImport}
          class="ml-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Rollback
        </button>
      {/if}
    </div>
  {/if}

  <div class="mt-4 flex gap-4">
    <button on:click={exportData} class="btn btn-primary">Export Data</button>
    <label class="btn btn-secondary">
      Import Data
      <input
        type="file"
        class="hidden"
        accept=".json"
        on:change={handleFileSelect}
      />
    </label>
  </div>
</div>

<!-- Import Options Modal -->
{#if showImportModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto"
    >
      <h2 class="text-xl font-bold mb-4">Import Options</h2>

      <!-- Data Type Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-medium mb-3">Select Data Types to Import</h3>
        <div class="space-y-2">
          {#if availableDataTypes.includes('settings')}
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={importOptions.dataTypes.settings}
                class="form-checkbox"
              />
              <span class="ml-2">Settings</span>
            </label>
          {/if}
          {#if availableDataTypes.includes('theme') || availableDataTypes.includes('themes')}
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={importOptions.dataTypes.theme}
                class="form-checkbox"
              />
              <span class="ml-2">Theme Settings</span>
            </label>
          {/if}
          {#if availableDataTypes.includes('archive') || availableDataTypes.includes('summaries')}
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={importOptions.dataTypes.archive}
                class="form-checkbox"
              />
              <span class="ml-2">Archive/Summaries</span>
            </label>
          {/if}
          {#if availableDataTypes.includes('tags')}
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={importOptions.dataTypes.tags}
                class="form-checkbox"
              />
              <span class="ml-2">Tags</span>
            </label>
          {/if}
        </div>
      </div>

      <!-- Merge Mode Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-medium mb-3">Import Mode</h3>
        <select
          bind:value={importOptions.mergeMode}
          class="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
        >
          <option value="merge">Merge with existing data</option>
          <option value="replace">Replace existing data</option>
          <option value="smart_merge"
            >Smart merge (with conflict resolution)</option
          >
        </select>
      </div>

      <!-- Auto Backup Option -->
      <div class="mb-6">
        <label class="flex items-center">
          <input
            type="checkbox"
            bind:checked={importOptions.autoBackup}
            class="form-checkbox"
          />
          <span class="ml-2">Create backup before import</span>
        </label>
      </div>

      <!-- File Information -->
      {#if importData && importData.metadata}
        <div class="mb-6 p-3 bg-gray-100 dark:bg-gray-700 rounded">
          <h3 class="text-sm font-medium mb-2">File Information</h3>
          <div class="text-xs space-y-1">
            <div>Version: {importData.metadata.version || 'Unknown'}</div>
            <div>
              Exported: {importData.metadata.exportedAt
                ? new Date(importData.metadata.exportedAt).toLocaleString()
                : 'Unknown'}
            </div>
            {#if importData.metadata.description}
              <div>Description: {importData.metadata.description}</div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="flex justify-end gap-4">
        <button on:click={cancelImport} class="btn btn-ghost">Cancel</button>
        <button
          on:click={startImport}
          class="btn btn-primary"
          disabled={!Object.values(importOptions.dataTypes).some(Boolean)}
        >
          Start Import
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Conflict Resolution Modal -->
<ConflictResolution
  {conflicts}
  isOpen={showConflictModal}
  on:confirm={handleConflictResolution}
  on:cancel={handleConflictCancel}
/>

<!-- Import Progress Modal -->
<ImportProgress isOpen={showProgressModal} {progressData} />
