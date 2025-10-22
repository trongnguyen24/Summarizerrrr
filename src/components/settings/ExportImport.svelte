<script>
  // @ts-nocheck
  import { get } from 'svelte/store'
  import {
    settings,
    updateSettings,
    forceReloadSettings,
  } from '../../stores/settingsStore.svelte.js'
  import { archiveStore } from '../../stores/archiveStore.svelte.js'
  import {
    tagsCache,
    invalidateTagsCache,
    preloadTagsData,
  } from '../../stores/tagsCacheStore.svelte.js'
  import {
    addMultipleSummaries,
    addMultipleTags,
    addMultipleHistory,
  } from '../../lib/db/indexedDBService.js'

  // Import new services and components
  import {
    validateImportFile,
    formatValidationResult,
  } from '../../lib/utils/importValidation.js'

  // Import export services
  import {
    exportDataToZip,
    generateExportFilename,
    downloadBlob,
  } from '../../lib/exportImport/exportService.js'

  // Import ZIP and JSONL services for import handling
  import {
    isZipFile,
    extractFilesFromZip,
  } from '../../lib/exportImport/zipService.js'
  import { importFromJsonl } from '../../lib/exportImport/jsonlService.js'

  // State management
  let showImportModal = false
  let importData = null
  let validationResults = null
  let errorMessage = ''
  let successMessage = ''

  // Import options
  let importOptions = {
    dataTypes: {
      settings: true,
      history: true,
      archive: true,
      tags: true,
    },
    mergeMode: 'merge', // merge, replace
  }

  // Available data types from imported file
  let availableDataTypes = []

  /**
   * Sanitizes imported settings to remove nested/corrupted data
   * @param {Object} importedSettings - Raw imported settings
   * @returns {Object} - Clean settings object
   */
  function sanitizeImportedSettings(importedSettings) {
    // Valid setting keys (should match DEFAULT_SETTINGS in settingsStore)
    const validSettingKeys = [
      'selectedProvider',
      'floatButton',
      'floatButtonLeft',
      'showFloatingButton',
      'floatingPanelLeft',
      'closePanelOnOutsideClick',
      'geminiApiKey',
      'selectedGeminiModel',
      'geminiAdvancedApiKey',
      'selectedGeminiAdvancedModel',
      'openaiCompatibleApiKey',
      'openaiCompatibleBaseUrl',
      'selectedOpenAICompatibleModel',
      'openrouterApiKey',
      'selectedOpenrouterModel',
      'deepseekApiKey',
      'deepseekBaseUrl',
      'selectedDeepseekModel',
      'chatgptApiKey',
      'chatgptBaseUrl',
      'selectedChatgptModel',
      'ollamaEndpoint',
      'selectedOllamaModel',
      'lmStudioEndpoint',
      'selectedLmStudioModel',
      'groqApiKey',
      'selectedGroqModel',
      'selectedFont',
      'enableStreaming',
      'uiLang',
      'mobileSheetHeight',
      'mobileSheetBackdropOpacity',
      'fontSizeIndex',
      'widthIndex',
      'sidePanelDefaultWidth',
      'oneClickSummarize',
      'iconClickAction',
      'fabDomainControl',
      'firefoxPermissions',
      'hasCompletedOnboarding',
      'onboardingStep',
      'summaryLength',
      'summaryFormat',
      'summaryLang',
      'summaryTone',
      'isSummaryAdvancedMode',
      'youtubePromptSelection',
      'youtubeCustomPromptContent',
      'youtubeCustomSystemInstructionContent',
      'chapterPromptSelection',
      'chapterCustomPromptContent',
      'chapterCustomSystemInstructionContent',
      'webPromptSelection',
      'webCustomPromptContent',
      'webCustomSystemInstructionContent',
      'courseSummaryPromptSelection',
      'courseSummaryCustomPromptContent',
      'courseSummaryCustomSystemInstructionContent',
      'courseConceptsPromptSelection',
      'courseConceptsCustomPromptContent',
      'courseConceptsCustomSystemInstructionContent',
      'selectedTextPromptSelection',
      'selectedTextCustomPromptContent',
      'selectedTextCustomSystemInstructionContent',
      'isAdvancedMode',
      'temperature',
      'topP',
    ]

    // Handle nested structure - extract the deepest valid settings
    let rawSettings = importedSettings

    // If there's nested settings.settings, extract it
    while (rawSettings.settings && typeof rawSettings.settings === 'object') {
      console.log(
        '[ExportImport] Detected nested settings, extracting inner layer'
      )
      rawSettings = rawSettings.settings
    }

    // Remove any metadata or other invalid fields
    const cleanSettings = {}
    validSettingKeys.forEach((key) => {
      if (rawSettings[key] !== undefined) {
        cleanSettings[key] = rawSettings[key]
      }
    })

    console.log('[ExportImport] Sanitized imported settings:', {
      originalKeys: Object.keys(importedSettings),
      finalKeys: Object.keys(cleanSettings),
      removedKeys: Object.keys(rawSettings).filter(
        (key) => !validSettingKeys.includes(key)
      ),
    })

    return cleanSettings
  }

  // Enhanced export function using export service
  async function exportData() {
    try {
      // Use export service to create ZIP file
      const zipBlob = await exportDataToZip(settings)

      // Generate filename and download
      const filename = generateExportFilename()
      downloadBlob(zipBlob, filename)

      successMessage = 'Data exported successfully as ZIP file!'
      setTimeout(() => (successMessage = ''), 3000)
    } catch (error) {
      errorMessage = `Export failed: ${error.message}`
      setTimeout(() => (errorMessage = ''), 5000)
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
      // Detect if file is ZIP or JSON
      const isZip = await isZipFile(file)

      if (isZip) {
        await handleZipImport(file)
      } else {
        await handleLegacyJsonImport(file)
      }
    } catch (error) {
      errorMessage = `File processing failed: ${error.message}`
      setTimeout(() => (errorMessage = ''), 5000)
    }
  }

  // Handle ZIP file import
  async function handleZipImport(file) {
    try {
      // Extract files from ZIP
      const files = await extractFilesFromZip(file)

      // Initialize import data object
      const data = {}

      // Parse settings.json
      if (files['settings.json']) {
        try {
          const parsedSettingsFile = JSON.parse(files['settings.json'])

          // CRITICAL FIX: Extract metadata first
          if (parsedSettingsFile.metadata) {
            data.metadata = parsedSettingsFile.metadata
          }

          // ✅ CRITICAL FIX: Robust settings extraction and sanitization
          if (parsedSettingsFile.settings) {
            data.settings = sanitizeImportedSettings(
              parsedSettingsFile.settings
            )
          }
        } catch (error) {
          console.error(`Failed to parse settings: ${error.message}`)
        }
      }

      // Parse summaries.jsonl
      if (files['summaries.jsonl']) {
        try {
          const result = importFromJsonl(files['summaries.jsonl'])
          data.summaries = result.data
          if (result.errors) {
            console.warn(
              `Some summaries failed to parse: ${result.errorCount} errors`
            )
          }
        } catch (error) {
          console.error(`Failed to parse summaries: ${error.message}`)
        }
      }

      // Parse history.jsonl
      if (files['history.jsonl']) {
        try {
          const result = importFromJsonl(files['history.jsonl'])
          data.history = result.data
          if (result.errors) {
            console.warn(
              `Some history failed to parse: ${result.errorCount} errors`
            )
          }
        } catch (error) {
          console.error(`Failed to parse history: ${error.message}`)
        }
      }

      // Parse tags.jsonl
      if (files['tags.jsonl']) {
        try {
          const result = importFromJsonl(files['tags.jsonl'])
          data.tags = result.data
          if (result.errors) {
            console.warn(
              `Some tags failed to parse: ${result.errorCount} errors`
            )
          }
        } catch (error) {
          console.error(`Failed to parse tags: ${error.message}`)
        }
      }

      // Check if we have any valid data
      if (Object.keys(data).length === 0) {
        throw new Error('No valid data found in ZIP file')
      }

      // Store data and update available types
      importData = data
      availableDataTypes = Object.keys(data).filter((key) => key !== 'metadata')

      // Reset import selections based on available data
      importOptions.dataTypes = {
        settings: availableDataTypes.includes('settings'),
        history: availableDataTypes.includes('history'),
        archive:
          availableDataTypes.includes('archive') ||
          availableDataTypes.includes('summaries'),
        tags: availableDataTypes.includes('tags'),
      }

      showImportModal = true
    } catch (error) {
      throw error
    }
  }

  // Handle legacy JSON file import (backward compatibility)
  async function handleLegacyJsonImport(file) {
    try {
      // Validate file using import validation service
      const validation = await validateImportFile(file)

      if (!validation.valid) {
        const formatted = formatValidationResult(validation)
        const errorDetails =
          formatted.errors && formatted.errors.length > 0
            ? formatted.errors.map((e) => e.message).join('; ')
            : formatted.message
        throw new Error(`File validation failed: ${errorDetails}`)
      }

      // Read and parse file
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result)

          // Store data and update available types
          importData = data
          validationResults = validation
          availableDataTypes = Object.keys(data).filter(
            (key) => key !== 'metadata'
          )

          // Reset import selections based on available data
          importOptions.dataTypes = {
            settings: availableDataTypes.includes('settings'),
            history: availableDataTypes.includes('history'),
            archive:
              availableDataTypes.includes('archive') ||
              availableDataTypes.includes('summaries'),
            tags: availableDataTypes.includes('tags'),
          }

          showImportModal = true
        } catch (parseError) {
          throw new Error(`Failed to parse JSON: ${parseError.message}`)
        }
      }

      reader.onerror = () => {
        throw new Error('Failed to read file')
      }

      reader.readAsText(file)
    } catch (error) {
      throw error
    }
  }

  // Enhanced import function with validation, backup, and conflict detection
  async function startImport() {
    if (!importData) return

    try {
      showImportModal = false

      // Skip conflict detection for simple merge modes
      // TODO: Fix conflict resolution component structure mismatch
      const importedData = prepareImportData()

      if (importOptions.mergeMode === 'smart_merge') {
        // Smart merge mode requires conflict resolution (disabled for now)
        // Fallback to simple merge
        await executeImport(importedData)
      } else {
        // Simple merge or replace - no conflict detection needed
        await executeImport(importedData)
      }
    } catch (error) {
      errorMessage = `Import preparation failed: ${error.message}`
      setTimeout(() => (errorMessage = ''), 5000)
    }
  }

  // Prepare import data based on selections
  function prepareImportData() {
    const data = {}

    if (importOptions.dataTypes.settings && importData.settings) {
      data.settings = importData.settings
    }

    if (importOptions.dataTypes.history && importData.history) {
      data.history = importData.history
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
      // Use simple import strategy
      await performSimpleImport(importedData)

      // Refresh stores
      // Force reload settings and theme stores to apply imported changes
      if (importOptions.dataTypes.settings) {
        try {
          // Add small delay to ensure storage operations complete
          await new Promise((resolve) => setTimeout(resolve, 100))
          await forceReloadSettings()

          // Force a complete UI refresh by triggering a small state change
          setTimeout(() => {
            // This will trigger reactivity in components
            Object.assign(settings, { ...settings })
          }, 200)
        } catch (error) {
          console.error(`Failed to reload settings: ${error.message}`)
        }
      }

      if (importOptions.dataTypes.history) {
        // History data will be handled by the import service
        console.log('History data imported successfully')
      }

      if (importOptions.dataTypes.archive) {
        await archiveStore.loadData()
      }

      if (importOptions.dataTypes.tags) {
        invalidateTagsCache()
        await preloadTagsData()
      }

      successMessage = 'Data imported successfully!'
      setTimeout(() => (successMessage = ''), 3000)
      resetImportState()
    } catch (error) {
      errorMessage = `Import failed: ${error.message}`
      setTimeout(() => (errorMessage = ''), 5000)
    }
  }

  // Simple import logic (backward compatibility)
  async function performSimpleImport(importedData) {
    if (importedData.settings) {
      // ✅ CRITICAL FIX: Sanitize imported settings before merge/replace
      const cleanImportedSettings = sanitizeImportedSettings(
        importedData.settings
      )

      if (importOptions.mergeMode === 'replace') {
        await updateSettings(cleanImportedSettings)
      } else {
        // Only merge clean settings
        const mergedSettings = { ...settings, ...cleanImportedSettings }
        await updateSettings(mergedSettings)
      }
    }

    if (importedData.history) {
      await addMultipleHistory(importedData.history)
    }

    if (importedData.summaries) {
      await addMultipleSummaries(importedData.summaries)
    }

    if (importedData.tags) {
      await addMultipleTags(importedData.tags)
    }
  }

  // Reset import state
  function resetImportState() {
    importData = null
    validationResults = null
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
    </div>
  {/if}

  <div class="mt-4 flex gap-4">
    <button on:click={exportData} class="btn btn-primary">Export Data</button>
    <label class="btn btn-secondary">
      Import Data
      <input
        type="file"
        class="hidden"
        accept=".json,.zip"
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
          {#if availableDataTypes.includes('history')}
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={importOptions.dataTypes.history}
                class="form-checkbox"
              />
              <span class="ml-2">History</span>
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
        </select>
      </div>

      <!-- Version Comparison -->
      <div
        class="mb-6 p-3 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded"
      >
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Version Compatibility
        </h3>

        <div class="space-y-1 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Current:</span>
            <span class="text-gray-900 dark:text-white">
              v{chrome.runtime.getManifest().version}
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Import file:</span>
            <span class="text-gray-900 dark:text-white">
              {importData &&
              importData.metadata &&
              importData.metadata.exportedBy
                ? importData.metadata.exportedBy.replace(
                    'Summarizerrrr Extension v',
                    'v'
                  )
                : 'Unknown'}
            </span>
          </div>
        </div>

        {#if importData && importData.metadata && importData.metadata.exportedBy}
          {@const currentVersion = chrome.runtime.getManifest().version}
          {@const importedVersion = importData.metadata.exportedBy.replace(
            'Summarizerrrr Extension v',
            ''
          )}
          <div class="mt-2 text-xs">
            {#if currentVersion === importedVersion}
              <span class="text-green-600 dark:text-green-400"
                >✓ Compatible</span
              >
            {:else}
              <span class="text-yellow-600 dark:text-yellow-400"
                >⚠ Different versions</span
              >
            {/if}
          </div>
        {/if}
      </div>

      <!-- File Information -->
      <div
        class="mb-6 p-3 bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded"
      >
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          File Information
        </h3>

        {#if importData && importData.metadata}
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">Exported:</span>
              <span class="text-gray-900 dark:text-white">
                {importData.metadata.exportedAt
                  ? new Date(
                      importData.metadata.exportedAt
                    ).toLocaleDateString()
                  : 'Unknown'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">Version:</span>
              <span class="text-gray-900 dark:text-white">
                {importData.metadata.exportedBy || 'Unknown'}
              </span>
            </div>
            {#if importData.metadata.format}
              <div class="flex justify-between">
                <span class="text-gray-500 dark:text-gray-400">Format:</span>
                <span class="text-gray-900 dark:text-white">
                  {importData.metadata.format}
                </span>
              </div>
            {/if}
          </div>
        {:else}
          <div class="text-sm text-gray-500 dark:text-gray-400">
            No file information available.
          </div>
        {/if}
      </div>

      <!-- Data Summary -->
      <div
        class="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
      >
        <h3
          class="text-sm font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center"
        >
          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path>
            <path
              fill-rule="evenodd"
              d="M4 5a2 2 0 012-2 1 1 0 000 2H6a2 2 0 100 4h2a2 2 0 100-4h-.5a1 1 0 000-2H8a2 2 0 012-2h2a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
              clip-rule="evenodd"
            ></path>
          </svg>
          Data Summary
        </h3>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div
            class="text-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
          >
            <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
              {importData.settings
                ? Object.keys(importData.settings).length
                : 0}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Settings</div>
          </div>

          <div
            class="text-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
          >
            <div class="text-lg font-bold text-purple-600 dark:text-purple-400">
              {(importData.history || []).length}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">History</div>
          </div>

          <div
            class="text-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
          >
            <div class="text-lg font-bold text-green-600 dark:text-green-400">
              {(importData.summaries || importData.archive || []).length}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Summaries
            </div>
          </div>

          <div
            class="text-center p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600"
          >
            <div class="text-lg font-bold text-orange-600 dark:text-orange-400">
              {importData.tags ? importData.tags.length : 0}
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">Tags</div>
          </div>
        </div>
      </div>

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
