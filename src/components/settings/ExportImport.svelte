<script>
  // @ts-nocheck
  import {
    settings,
    updateSettings,
    forceReloadSettings,
  } from '../../stores/settingsStore.svelte.js'
  import { archiveStore } from '../../stores/archiveStore.svelte.js'
  import {
    invalidateTagsCache,
    preloadTagsData,
  } from '../../stores/tagsCacheStore.svelte.js'
  import {
    addMultipleSummaries,
    addMultipleTags,
    addMultipleHistory,
  } from '../../lib/db/indexedDBService.js'

  import {
    exportDataToZip,
    generateExportFilename,
    downloadBlob,
  } from '../../lib/exportImport/exportService.js'

  import {
    isZipFile,
    extractFilesFromZip,
  } from '../../lib/exportImport/zipService.js'
  import { importFromJsonl } from '../../lib/exportImport/jsonlService.js'
  import { sanitizeSettings } from '../../lib/config/settingsSchema.js'

  import SwitchPermission from '../inputs/SwitchPermission.svelte'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import Icon from '@iconify/svelte'
  import Preview from '../ui/Preview.svelte'

  const MESSAGE_TIMEOUT = 3000
  const RELOAD_DELAY = 100

  let state = $state({
    showImportModal: false,
    importData: null,
    errorMessage: '',
    successMessage: '',
  })

  let importOptions = $state({
    dataTypes: {
      settings: true,
      history: true,
      archive: true,
      tags: true,
    },
    mergeMode: 'merge',
  })

  let fileInputRef = $state(null)
  let messageTimeoutId = null

  function setMessage(type, message) {
    if (messageTimeoutId) {
      clearTimeout(messageTimeoutId)
    }

    if (type === 'success') {
      state.successMessage = message
      state.errorMessage = ''
    } else {
      state.errorMessage = message
      state.successMessage = ''
    }

    messageTimeoutId = setTimeout(() => {
      state.successMessage = ''
      state.errorMessage = ''
    }, MESSAGE_TIMEOUT)
  }

  async function exportData() {
    try {
      // Use export service to create ZIP file
      const zipBlob = await exportDataToZip(settings)

      // Generate filename and download
      const filename = generateExportFilename()
      downloadBlob(zipBlob, filename)

      setMessage('success', 'Data exported successfully as ZIP file!')
    } catch (error) {
      setMessage('error', `Export failed: ${error.message}`)
    }
  }

  async function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      resetImportState(false)
      const isZip = await isZipFile(file)

      if (!isZip) {
        throw new Error(
          'Only ZIP format is supported. Please export your data again.'
        )
      }

      await handleZipImport(file)
    } catch (error) {
      setMessage('error', `File processing failed: ${error.message}`)
      if (fileInputRef) {
        fileInputRef.value = ''
      }
    }
  }

  async function handleZipImport(file) {
    try {
      const files = await extractFilesFromZip(file)
      const data = {}
      if (files['settings.json']) {
        try {
          const parsedSettingsFile = JSON.parse(files['settings.json'])

          if (parsedSettingsFile.metadata) {
            data.metadata = parsedSettingsFile.metadata
          }

          if (parsedSettingsFile.settings) {
            data.settings = sanitizeSettings(parsedSettingsFile.settings)
          }
        } catch (error) {
          console.error(`Failed to parse settings: ${error.message}`)
        }
      }

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

      if (Object.keys(data).length === 0) {
        throw new Error('No valid data found in ZIP file')
      }

      state.importData = data
      importOptions.dataTypes = {
        settings: !!data.settings,
        history: !!data.history,
        archive: !!(data.archive || data.summaries),
        tags: !!data.tags,
      }

      state.showImportModal = true
    } catch (error) {
      throw error
    }
  }

  async function startImport() {
    if (!state.importData) return

    try {
      state.showImportModal = false
      const importedData = prepareImportData()
      await executeImport(importedData)
    } catch (error) {
      setMessage('error', `Import preparation failed: ${error.message}`)
    }
  }

  function prepareImportData() {
    const data = {}

    if (importOptions.dataTypes.settings && state.importData.settings) {
      data.settings = state.importData.settings
    }

    if (importOptions.dataTypes.history && state.importData.history) {
      data.history = state.importData.history
    }

    if (
      importOptions.dataTypes.archive &&
      (state.importData.archive || state.importData.summaries)
    ) {
      data.summaries = state.importData.archive || state.importData.summaries
    }

    if (importOptions.dataTypes.tags && state.importData.tags) {
      data.tags = state.importData.tags
    }
    return data
  }

  async function executeImport(importedData) {
    try {
      await performSimpleImport(importedData)
      if (importOptions.dataTypes.settings) {
        try {
          await new Promise((resolve) => setTimeout(resolve, RELOAD_DELAY))
          await forceReloadSettings()
          setTimeout(() => {
            Object.assign(settings, { ...settings })
          }, RELOAD_DELAY)
        } catch (error) {
          console.error(`Failed to reload settings: ${error.message}`)
        }
      }

      if (importOptions.dataTypes.archive) {
        await archiveStore.loadData()
      }

      if (importOptions.dataTypes.tags) {
        invalidateTagsCache()
        await preloadTagsData()
      }

      setMessage('success', 'Data imported successfully!')
      resetImportState()
    } catch (error) {
      setMessage('error', `Import failed: ${error.message}`)
    }
  }

  async function performSimpleImport(importedData) {
    if (importedData.settings) {
      const cleanImportedSettings = sanitizeSettings(importedData.settings)

      if (importOptions.mergeMode === 'replace') {
        await updateSettings(cleanImportedSettings)
      } else {
        const mergedSettings = { ...settings, ...cleanImportedSettings }
        await updateSettings(mergedSettings)
      }
    }

    if (importedData.history) {
      const cleanHistory = JSON.parse(JSON.stringify(importedData.history))
      await addMultipleHistory(cleanHistory)
    }

    if (importedData.summaries) {
      const cleanSummaries = JSON.parse(JSON.stringify(importedData.summaries))
      await addMultipleSummaries(cleanSummaries)
    }

    if (importedData.tags) {
      const cleanTags = JSON.parse(JSON.stringify(importedData.tags))
      await addMultipleTags(cleanTags)
    }
  }

  function resetImportState(resetFileInput = true) {
    state.importData = null
    importOptions.dataTypes = {
      settings: true,
      history: true,
      archive: true,
      tags: true,
    }
    importOptions.mergeMode = 'merge'
    if (resetFileInput && fileInputRef) {
      fileInputRef.value = ''
    }
  }

  function cancelImport() {
    state.showImportModal = false
    resetImportState(true)
  }
</script>

<div class="p-4 border-t border-gray-200 dark:border-gray-700">
  <h3 class=" font-medium text-text-secondary">Export/Import Data</h3>

  <!-- Success/Error Messages -->
  {#if state.successMessage}
    <div
      class="mt-2 p-3 bg-green-100 border border-green-400 text-green-700 rounded"
    >
      {state.successMessage}
    </div>
  {/if}

  {#if state.errorMessage}
    <div class="mt-2 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
      {state.errorMessage}
    </div>
  {/if}

  <div class="mt-4 flex gap-4">
    <button onclick={exportData} class="btn btn-primary">Export Data</button>
    <label class="btn btn-secondary">
      Import Data
      <input
        bind:this={fileInputRef}
        type="file"
        class="hidden"
        accept=".zip"
        onchange={handleFileSelect}
      />
    </label>
  </div>
</div>

<!-- Import Options Modal -->
<Dialog.Root bind:open={state.showImportModal}>
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
                <Preview title="File Information" class="w-full p-6 mx-auto">
                  <div class="grid grid-cols-2 gap-x-8 gap-y-3">
                    <div>
                      <div class="text-text-secondary text-xs">Exported:</div>
                      <div class="text-text-primary font-medium">
                        {state.importData?.metadata?.exportedAt
                          ? new Date(
                              state.importData.metadata.exportedAt
                            ).toLocaleDateString()
                          : 'Unknown'}
                      </div>
                    </div>
                    <div>
                      <div class="text-text-secondary text-xs">History:</div>
                      <div class="text-text-primary font-medium">
                        {(state.importData?.history || []).length}
                      </div>
                    </div>
                    <div>
                      <div class="text-text-secondary text-xs">Summaries:</div>
                      <div class="text-text-primary font-medium">
                        {(
                          state.importData?.summaries ||
                          state.importData?.archive ||
                          []
                        ).length}
                      </div>
                    </div>
                    <div>
                      <div class="text-text-secondary text-xs">Tags:</div>
                      <div class="text-text-primary font-medium">
                        {state.importData?.tags
                          ? state.importData.tags.length
                          : 0}
                      </div>
                    </div>
                  </div>
                </Preview>
              </div>

              <div class="flex px-6 py-1 flex-col gap-2">
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
