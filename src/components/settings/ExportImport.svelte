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
    clearAllSummaries,
    clearAllHistory,
    clearAllTags,
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
  import TextScramble from '../../lib/ui/textScramble.js'
  import PreviewData from '../ui/PreviewData.svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'

  const MESSAGE_TIMEOUT = 3000
  const RELOAD_DELAY = 100

  let state = $state({
    showImportModal: false,
    importData: null,
    errorMessage: '',
    successMessage: '',
    isExportingMarkdown: false,
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
  let scrollContainerEl // Reference to the scroll container element

  let animatedRefs = $state({
    exportedLabel: null,
    exportedValue: null,
    historyLabel: null,
    historyValue: null,
    summariesLabel: null,
    summariesValue: null,
    tagsLabel: null,
    tagsValue: null,
  })

  // State to control text visibility for animation
  let displayTexts = $state({
    exportedLabel: '',
    exportedValue: '',
    historyLabel: '',
    historyValue: '',
    summariesLabel: '',
    summariesValue: '',
    tagsLabel: '',
    tagsValue: '',
  })

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
      // Load settings directly from storage to ensure we get the actual saved values
      // (not the reactive proxy which might be stale)
      const { settingsStorage } = await import(
        '../../services/wxtStorageService.js'
      )
      const currentSettings = await settingsStorage.getValue()

      // Use export service to create ZIP file with actual storage values
      const zipBlob = await exportDataToZip(currentSettings || settings)

      // Generate filename and download
      const filename = generateExportFilename()
      downloadBlob(zipBlob, filename)

      setMessage('success', 'Data exported successfully as ZIP file!')
    } catch (error) {
      setMessage('error', `Export failed: ${error.message}`)
    }
  }

  async function exportMarkdown() {
    try {
      state.isExportingMarkdown = true

      // Dynamic import to keep bundle size small
      const { exportMarkdownToZip, generateMarkdownExportFilename } =
        await import('../../lib/exportImport/exportService.js')

      // Export with progress callback
      const zipBlob = await exportMarkdownToZip((progress) => {
        console.log(`[Export Markdown] ${progress.message}`)
      })

      // Download the ZIP file
      const filename = generateMarkdownExportFilename()
      downloadBlob(zipBlob, filename)

      setMessage('success', 'Markdown files exported successfully!')
    } catch (error) {
      console.error('[Export Markdown] Error:', error)
      setMessage('error', `Export failed: ${error.message}`)
    } finally {
      state.isExportingMarkdown = false
    }
  }

  async function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      // Don't reset state here since openImportDialog() already did it
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

    // Show warning for Replace mode
    if (importOptions.mergeMode === 'replace') {
      const selectedTypes = Object.entries(importOptions.dataTypes)
        .filter(([_, checked]) => checked)
        .map(([type, _]) => {
          if (type === 'archive') return 'Archive'
          return type.charAt(0).toUpperCase() + type.slice(1)
        })
        .join(', ')

      const confirmed = confirm(
        `⚠️ WARNING: Replace Mode\n\n` +
          `This will DELETE all existing data for:\n${selectedTypes}\n\n` +
          `Deleted data CANNOT be recovered!\n\n` +
          `Are you sure you want to continue?`
      )

      if (!confirmed) return
    }

    try {
      state.showImportModal = false
      const importedData = prepareImportData()
      await executeImport(importedData)
      // Reset file input after successful import
      if (fileInputRef) {
        fileInputRef.value = ''
      }
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
      // Don't reset state here - it's handled in startImport()
    } catch (error) {
      setMessage('error', `Import failed: ${error.message}`)
    }
  }

  async function performSimpleImport(importedData) {
    // Handle Settings
    if (importedData.settings) {
      const cleanImportedSettings = sanitizeSettings(importedData.settings)

      if (importOptions.mergeMode === 'replace') {
        // Replace: Overwrite all settings
        await updateSettings(cleanImportedSettings)
      } else {
        // Merge: Combine settings
        // ✅ FIX: Sanitize current settings trước khi merge để loại bỏ invalid keys
        const cleanCurrentSettings = sanitizeSettings(settings)
        const mergedSettings = {
          ...cleanCurrentSettings,
          ...cleanImportedSettings,
        }
        await updateSettings(mergedSettings)
      }
    }

    // Handle History
    if (importedData.history) {
      const cleanHistory = JSON.parse(JSON.stringify(importedData.history))

      if (importOptions.mergeMode === 'replace') {
        // Replace: Clear all existing history first
        await clearAllHistory()
      }
      // Then add imported history (both modes)
      await addMultipleHistory(cleanHistory)
    }

    // Handle Summaries (Archive)
    if (importedData.summaries) {
      const cleanSummaries = JSON.parse(JSON.stringify(importedData.summaries))

      if (importOptions.mergeMode === 'replace') {
        // Replace: Clear all existing summaries first
        await clearAllSummaries()
      }
      // Then add imported summaries (both modes)
      await addMultipleSummaries(cleanSummaries)
    }

    // Handle Tags
    if (importedData.tags) {
      const cleanTags = JSON.parse(JSON.stringify(importedData.tags))

      if (importOptions.mergeMode === 'replace') {
        // Replace: Clear all existing tags first
        await clearAllTags()
      }
      // Then add imported tags (both modes)
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

  function openImportDialog() {
    // Reset everything to initial state
    resetImportState(true)
    state.showImportModal = false
    // Clear any existing messages
    state.successMessage = ''
    state.errorMessage = ''
    // Trigger file input click
    if (fileInputRef) {
      fileInputRef.click()
    }
  }

  // Helper functions to get text values
  function getExportedDate() {
    return state.importData?.metadata?.exportedAt
      ? new Date(state.importData.metadata.exportedAt).toLocaleDateString()
      : 'Unknown'
  }

  function getHistoryCount() {
    return String((state.importData?.history || []).length)
  }

  function getSummariesCount() {
    return String(
      (state.importData?.summaries || state.importData?.archive || []).length
    )
  }

  function getTagsCount() {
    return String(state.importData?.tags ? state.importData.tags.length : 0)
  }

  // Reset all display texts to empty
  function resetDisplayTexts() {
    displayTexts.exportedLabel = ''
    displayTexts.exportedValue = ''
    displayTexts.historyLabel = ''
    displayTexts.historyValue = ''
    displayTexts.summariesLabel = ''
    displayTexts.summariesValue = ''
    displayTexts.tagsLabel = ''
    displayTexts.tagsValue = ''
  }

  // Calculate dynamic stagger delay based on text length
  function calculateStaggerDelay(previousText, baseDelay = 50, charDelay = 10) {
    return baseDelay + previousText.length * charDelay
  }

  // Animate import preview with dynamic stagger delay
  function animateImportPreview() {
    // First, reset all texts to empty
    resetDisplayTexts()

    const elements = [
      {
        el: animatedRefs.exportedLabel,
        text: 'Exported:',
        key: 'exportedLabel',
      },
      {
        el: animatedRefs.exportedValue,
        text: getExportedDate(),
        key: 'exportedValue',
      },
      {
        el: animatedRefs.historyLabel,
        text: 'History:',
        key: 'historyLabel',
      },
      {
        el: animatedRefs.historyValue,
        text: getHistoryCount(),
        key: 'historyValue',
      },
      {
        el: animatedRefs.summariesLabel,
        text: 'Summaries:',
        key: 'summariesLabel',
      },
      {
        el: animatedRefs.summariesValue,
        text: getSummariesCount(),
        key: 'summariesValue',
      },
      {
        el: animatedRefs.tagsLabel,
        text: 'Tags:',
        key: 'tagsLabel',
      },
      {
        el: animatedRefs.tagsValue,
        text: getTagsCount(),
        key: 'tagsValue',
      },
    ]

    // Calculate cumulative delay based on previous text lengths
    let cumulativeDelay = 0

    elements.forEach((item, index) => {
      if (item.el) {
        setTimeout(() => {
          const fx = new TextScramble(item.el)
          fx.setText(item.text, { speed: 2.5 })
        }, cumulativeDelay)

        // Calculate delay for next element based on current text length
        cumulativeDelay += calculateStaggerDelay(item.text)
      }
    })
  }

  // Trigger animation when modal opens
  $effect(() => {
    if (state.showImportModal && state.importData) {
      setTimeout(() => {
        animateImportPreview()
      }, 500)
    }
  })

  // Check if any data type is selected for import
  function isImportDataSelected() {
    return Object.values(importOptions.dataTypes).some(Boolean)
  }

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  const options = {
    scrollbars: {
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Use $effect to initialize OverlayScrollbars (only on non-touch devices)
  $effect(() => {
    if (state.showImportModal && scrollContainerEl && !isTouchDevice()) {
      // Use setTimeout to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        initialize(scrollContainerEl)
      }, 50)

      return () => {
        clearTimeout(timer)
        // Cleanup when modal closes
        if (instance()) {
          instance().destroy()
        }
      }
    }
  })
</script>

<div class="px-5 pb-4">
  <h3 class="text-text-primary font-bold">Backup data</h3>
  <p>
    Backup and import your data to another device or save all archives to
    Markdown
  </p>

  <div class="mt-2 grid grid-cols-3 gap-1">
    <button class=" relative overflow-hidden group" onclick={exportData}>
      <div
        class="font-medium py-2 px-4 border transition-colors duration-200 bg-muted/5 text-text-secondary group-hover:border-border border-transparent hover:text-text-primary dark:hover:text-white"
      >
        Export
      </div>

      <span
        class="size-4 absolute z-10 -left-2 -bottom-2 border bg-surface-1 rotate-45 transition-colors duration-200 border-transparent group-hover:border-border"
      ></span>
    </button>

    <!-- Export as Markdown button -->
    <!-- <button
      class=" relative overflow-hidden group"
      onclick={exportMarkdown}
      disabled={state.isExportingMarkdown}
    >
      <div
        class="font-medium py-2 px-4 border transition-colors duration-200 {state.isExportingMarkdown
          ? 'bg-blackwhite-5 text-text-tertiary cursor-not-allowed border-border/20'
          : 'bg-blackwhite-5 text-text-secondary group-hover:border-border border-transparent hover:text-text-primary dark:hover:text-white'}"
      >
        {#if state.isExportingMarkdown}
          Exporting...
        {:else}
          Markdown
        {/if}
      </div>

      <span
        class="size-4 absolute z-10 -left-2 -bottom-2 border bg-surface-1 rotate-45 transition-colors duration-200 {state.isExportingMarkdown
          ? 'border-border/20'
          : 'border-transparent group-hover:border-border'}"
      ></span>
    </button> -->

    <button class=" relative overflow-hidden group" onclick={openImportDialog}>
      <div
        class="font-medium py-2 px-4 border transition-colors duration-200 bg-muted/5 text-text-secondary group-hover:border-border border-transparent hover:text-text-primary dark:hover:text-white"
      >
        Import
      </div>

      <span
        class="size-4 absolute z-10 -left-2 -bottom-2 border bg-surface-1 rotate-45 transition-colors duration-200 border-transparent group-hover:border-border"
      ></span>
    </button>
    <!-- Hidden file input -->
    <input
      bind:this={fileInputRef}
      type="file"
      class="hidden"
      accept=".zip"
      onchange={handleFileSelect}
    />
  </div>
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
      class="outline-hidden flex flex-col font-mono fixed left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-lg z-[150] -translate-y-1/2  rounded-lg overflow-hidden shadow-lg max-h-[80vh] translate-x-[-50%]"
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
            <div class="px-4 text-xs top-0 w-full bg-surface-2 py-2">
              <p class="!text-center text-text-primary select-none">
                Import Options
              </p>
            </div>

            <div
              id="import-modal-scroll"
              class="bg-surface-1 flex flex-col text-xs h-full {isTouchDevice()
                ? 'overflow-y-auto'
                : ''}"
              bind:this={scrollContainerEl}
            >
              <div class="p-4 flex flex-col gap-4">
                <div class="">
                  <PreviewData class="w-full px-6 py-4 mx-auto">
                    <div class="flex items-center">
                      <div class=" w-26">
                        <div class="size-20 shrink-0 overflow-hidden relative">
                          <div
                            class="absolute z-[4] border border-border dark:border-surface-2 inset-0"
                          ></div>
                          <div class="absolute inset-1 bg-surface-2"></div>
                          <span
                            class="absolute z-[2] size-6 rotate-45 bg-surface-1 bottom-px left-px -translate-x-1/2 translate-y-1/2"
                          ></span>
                          <span
                            class="absolute z-[2] size-6 rotate-45 bg-surface-1 top-px right-px translate-x-1/2 -translate-y-1/2"
                          ></span>
                          <span
                            class="absolute z-[5] size-4 rotate-45 bg-surface-1 border border-border dark:border-surface-2 bottom-px left-px -translate-x-1/2 translate-y-1/2"
                          ></span>
                          <span
                            class="absolute z-[5] size-4 rotate-45 border-surface-1 bg-border dark:bg-muted border dark:border-surface-2 top-px right-px translate-x-1/2 -translate-y-1/2"
                          ></span>
                          <Icon
                            icon="heroicons:circle-stack"
                            class="size-10 center-abs text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
                          />
                        </div>
                      </div>
                      <div class="flex flex-col flex-auto gap-1">
                        <div class=" flex justify-between">
                          <div
                            bind:this={animatedRefs.exportedLabel}
                            class="text-text-secondary text-xs"
                          >
                            {displayTexts.exportedLabel}
                          </div>
                          <div
                            bind:this={animatedRefs.exportedValue}
                            class="text-text-primary font-medium"
                          >
                            {displayTexts.exportedValue}
                          </div>
                        </div>
                        <div class=" flex justify-between">
                          <div
                            bind:this={animatedRefs.historyLabel}
                            class="text-text-secondary text-xs"
                          >
                            {displayTexts.historyLabel}
                          </div>
                          <div
                            bind:this={animatedRefs.historyValue}
                            class="text-text-primary font-medium"
                          >
                            {displayTexts.historyValue}
                          </div>
                        </div>
                        <div class=" flex justify-between">
                          <div
                            bind:this={animatedRefs.summariesLabel}
                            class="text-text-secondary text-xs"
                          >
                            {displayTexts.summariesLabel}
                          </div>
                          <div
                            bind:this={animatedRefs.summariesValue}
                            class="text-text-primary font-medium"
                          >
                            {displayTexts.summariesValue}
                          </div>
                        </div>
                        <div class=" flex justify-between">
                          <div
                            bind:this={animatedRefs.tagsLabel}
                            class="text-text-secondary text-xs"
                          >
                            {displayTexts.tagsLabel}
                          </div>
                          <div
                            bind:this={animatedRefs.tagsValue}
                            class="text-text-primary font-medium"
                          >
                            {displayTexts.tagsValue}
                          </div>
                        </div>
                      </div>
                    </div>
                  </PreviewData>
                </div>

                <div class="flex py-1 flex-col gap-2">
                  <h3 class="font-medium text-text-secondary">
                    Select Data Types to Import
                  </h3>
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

                <div class="flex py-1 flex-col gap-2">
                  <h3 class=" font-medium text-text-secondary">Import Mode</h3>
                  <div class="grid w-full grid-cols-2 gap-1">
                    <ButtonSet
                      title="Merge data"
                      class="setting-btn {importOptions.mergeMode === 'merge'
                        ? 'active'
                        : ''}"
                      onclick={() => (importOptions.mergeMode = 'merge')}
                      Description="Combine imported data with existing data"
                    />
                    <ButtonSet
                      title="Replace data"
                      class="setting-btn {importOptions.mergeMode === 'replace'
                        ? 'active'
                        : ''}"
                      onclick={() => (importOptions.mergeMode = 'replace')}
                      Description="Replace all existing data with imported data"
                    />
                  </div>
                </div>

                <div class="">
                  <p class="text-xs text-text-secondary leading-relaxed">
                    {#if importOptions.mergeMode === 'merge'}
                      <strong>Merge Mode:</strong><br />
                      • Imported data is combined with existing data<br />
                      • Duplicates (same ID) will be updated<br />
                      • Settings are merged (imported values override existing)
                    {:else}
                      <strong>⚠️ Replace Mode:</strong><br />
                      • Selected data types are completely deleted first<br />
                      • Then replaced with imported data only<br />
                      • Unselected data types are not affected<br />
                    {/if}
                  </p>
                </div>

                <div class="flex justify-end gap-4">
                  <button onclick={cancelImport} class="btn btn-ghost"
                    >Cancel</button
                  >
                  <button
                    class=" flex relative overflow-hidden group"
                    onclick={startImport}
                    disabled={!Object.values(importOptions.dataTypes).some(
                      Boolean
                    )}
                  >
                    <div
                      class=" font-medium py-2 px-4 border transition-colors duration-200 {isImportDataSelected()
                        ? 'bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white'
                        : ' bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
                    >
                      Start Import
                    </div>
                    <span
                      class="size-4 absolute z-10 -left-2 -bottom-2 border bg-surface-1 rotate-45 transition-colors duration-200 {isImportDataSelected()
                        ? ' border-orange-400 group-hover:border-orange-300/75'
                        : ' border-border/40'}"
                    ></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
