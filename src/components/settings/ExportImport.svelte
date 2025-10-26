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
  import SwitchPermission from '../inputs/SwitchPermission.svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'

  // Import bit-ui Dialog and transitions
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import Icon from '@iconify/svelte'
  import Preview from '../ui/Preview.svelte'

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
      // Reset previous state before processing new file
      resetImportState()

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

      // Reset file input on error
      event.target.value = ''
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

    // Reset import options to default
    importOptions.dataTypes = {
      settings: true,
      history: true,
      archive: true,
      tags: true,
    }
    importOptions.mergeMode = 'merge'
  }

  // Cancel import process
  function cancelImport() {
    showImportModal = false
    resetImportState()

    // Reset file input after dialog closes
    setTimeout(() => {
      const fileInput = document.querySelector('input[type="file"]')
      if (fileInput) {
        fileInput.value = ''
      }
    }, 100)
  }
</script>

<div class="p-4 border-t border-gray-200 dark:border-gray-700">
  <h3 class=" font-medium text-text-secondary">Export/Import Data</h3>

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
    <button onclick={exportData} class="btn btn-primary">Export Data</button>
    <label class="btn btn-secondary">
      Import Data
      <input
        type="file"
        class="hidden"
        accept=".json,.zip"
        onchange={handleFileSelect}
      />
    </label>
  </div>
</div>

<!-- Import Options Modal -->
<Dialog.Root bind:open={showImportModal}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-[99] bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden font-mono fixed left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-2xl z-[150] -translate-y-1/2 translate-x-[-50%]"
      onOpenAutoFocus={(e) => {
        e.preventDefault()
      }}
    >
      {#snippet child({ props, open })}
        {#if open}
          <div
            {...props}
            transition:slideScaleFade={{
              duration: 300,
              slideFrom: 'bottom',
              slideDistance: '0rem',
              startScale: 0.95,
            }}
          >
            <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                class="block size-3.5 bg-error rounded-full"
                onclick={cancelImport}
              >
                <Icon
                  class="text-red-800 transition-opacity duration-150"
                  width={14}
                  icon="heroicons:x-mark-16-solid"
                />
              </button>
            </div>
            <div
              class="bg-surface-1 flex flex-col gap-4 text-xs rounded-lg shadow-lg max-h-[80vh] overflow-y-auto"
            >
              <div
                class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
              >
                <p class="!text-center select-none">Import Options</p>
              </div>

              <div class=" px-6">
                <Preview
                  title="File Information"
                  class=" w-full p-6 pl-48  mx-auto"
                >
                  <div class=" grid grid-cols-2 gap-x-12 gap-y-2">
                    <div class="flex justify-between">
                      <span class=" text-text-primary">Exported:</span>
                      <span class=" text-text-secondary">
                        {importData.metadata.exportedAt
                          ? new Date(
                              importData.metadata.exportedAt
                            ).toLocaleDateString()
                          : 'Unknown'}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class=" text-text-primary">Version:</span>
                      <span class=" text-text-zsecondary">
                        {importData.metadata.exportedBy || 'Unknown'}
                      </span>
                    </div>
                    <div class="flex justify-between">
                      <span class=" text-text-primary">Settings:</span>
                      <span class=" text-text-secondary">
                        {importData.settings
                          ? Object.keys(importData.settings).length
                          : 0}
                      </span>
                    </div>

                    <div class="flex justify-between">
                      <span class=" text-text-primary">History:</span>
                      <span class=" text-text-secondary">
                        {(importData.history || []).length}
                      </span>
                    </div>

                    <div class="flex justify-between">
                      <span class=" text-text-primary">Summaries:</span>
                      <span class=" text-text-secondary">
                        {(importData.summaries || importData.archive || [])
                          .length}
                      </span>
                    </div>

                    <div class="flex justify-between">
                      <span class=" text-text-primary">Tags:</span>
                      <span class=" text-text-secondary">
                        {importData.tags ? importData.tags.length : 0}
                      </span>
                    </div>
                  </div>
                </Preview>
              </div>

              <!-- Data Type Selection -->
              <div class=" flex px-6 py-1 flex-col gap-2">
                <h3 class="font-medium">Select Data Types to Import</h3>
                <div class="grid grid-cols-2 gap-2">
                  <SwitchPermission
                    id="settings-switch"
                    name="Settings"
                    bind:checked={importOptions.dataTypes.settings}
                  />

                  <SwitchPermission
                    id="history-switch"
                    name="History"
                    bind:checked={importOptions.dataTypes.history}
                  />

                  <SwitchPermission
                    id="archive-switch"
                    name="Archive"
                    bind:checked={importOptions.dataTypes.archive}
                  />

                  <SwitchPermission
                    id="tags-switch"
                    name="Tags"
                    bind:checked={importOptions.dataTypes.tags}
                  />
                </div>
              </div>

              <!-- Merge Mode Selection -->
              <div class="flex px-6 py-1 flex-col gap-2">
                <h3 class=" font-medium">Import Mode</h3>
                <div class="grid w-full grid-cols-2 gap-1">
                  <ButtonSet
                    title="Merge with existing data"
                    class="setting-btn {importOptions.mergeMode === 'merge'
                      ? 'active'
                      : ''}"
                    onclick={() => (importOptions.mergeMode = 'merge')}
                    Description="Combine imported data with existing data"
                  />
                  <ButtonSet
                    title="Replace existing data"
                    class="setting-btn {importOptions.mergeMode === 'replace'
                      ? 'active'
                      : ''}"
                    onclick={() => (importOptions.mergeMode = 'replace')}
                    Description="Replace all existing data with imported data"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="flex justify-end gap-4">
                <button onclick={cancelImport} class="btn btn-ghost"
                  >Cancel</button
                >
                <button
                  onclick={startImport}
                  class="btn btn-primary"
                  disabled={!Object.values(importOptions.dataTypes).some(
                    Boolean
                  )}
                >
                  Start Import
                </button>
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
