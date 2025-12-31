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
    getDataCounts,
  } from '../../lib/db/indexedDBService.js'
  import { t } from 'svelte-i18n'
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
  import { slideScaleFade, fadeOnly } from '@/lib/ui/slideScaleFade.js'
  import Icon from '@iconify/svelte'
  import TextScramble from '../../lib/ui/textScramble.js'
  import PreviewData from '../ui/PreviewData.svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import Preview from '../ui/Preview.svelte'
  import ConfirmDialog from '../ui/ConfirmDialog.svelte'

  const MESSAGE_TIMEOUT = 3000
  const RELOAD_DELAY = 100

  let state = $state({
    showImportModal: false,
    importData: null,
    errorMessage: '',
    successMessage: '',
    isExportingHistory: false,
    isExportingArchive: false,
    showReplaceConfirmDialog: false,
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
  let scrollContainerEl = $state(null)

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

  // State for current data counts
  let dataCounts = $state({
    history: 0,
    archives: 0,
    tags: 0,
    isLoading: true,
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

  async function loadDataCounts() {
    dataCounts.isLoading = true
    try {
      const counts = await getDataCounts()
      dataCounts.history = counts.history
      dataCounts.archives = counts.summaries
      dataCounts.tags = counts.tags
    } catch (error) {
      console.error('Error loading data counts:', error)
    } finally {
      dataCounts.isLoading = false
    }
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

      setMessage('success', $t('exportImport.messages.export_success'))
      // Refresh data counts after export
      await loadDataCounts()
    } catch (error) {
      setMessage(
        'error',
        $t('exportImport.messages.export_failed', { error: error.message }),
      )
    }
  }

  async function exportHistoryMarkdown() {
    try {
      state.isExportingHistory = true

      // Dynamic import to keep bundle size small
      const {
        exportHistoryMarkdownToZip,
        generateHistoryMarkdownExportFilename,
      } = await import('../../lib/exportImport/exportService.js')

      // Export with progress callback
      const zipBlob = await exportHistoryMarkdownToZip((progress) => {
        console.log(`[Export History Markdown] ${progress.message}`)
      })

      const filename = generateHistoryMarkdownExportFilename()
      await downloadBlob(zipBlob, filename)

      setMessage('success', $t('exportImport.messages.history_export_success'))
      await loadDataCounts()
    } catch (error) {
      console.error('[ExportImport] History markdown export failed:', error)
      setMessage(
        'error',
        $t('exportImport.messages.export_failed', { error: error.message }),
      )
    } finally {
      state.isExportingHistory = false
    }
  }

  async function exportArchiveMarkdown() {
    try {
      state.isExportingArchive = true

      // Dynamic import to keep bundle size small
      const {
        exportArchiveMarkdownToZip,
        generateArchiveMarkdownExportFilename,
      } = await import('../../lib/exportImport/exportService.js')

      // Export with progress callback
      const zipBlob = await exportArchiveMarkdownToZip((progress) => {
        console.log(`[Export Archive Markdown] ${progress.message}`)
      })

      const filename = generateArchiveMarkdownExportFilename()
      await downloadBlob(zipBlob, filename)

      setMessage('success', $t('exportImport.messages.archive_export_success'))
      await loadDataCounts()
    } catch (error) {
      console.error('[ExportImport] Archive markdown export failed:', error)
      setMessage(
        'error',
        $t('exportImport.messages.export_failed', { error: error.message }),
      )
    } finally {
      state.isExportingArchive = false
    }
  }

  async function handleFileSelect(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      // Don't reset state here since openImportDialog() already did it
      const isZip = await isZipFile(file)

      if (!isZip) {
        throw new Error($t('exportImport.messages.zip_only'))
      }

      await handleZipImport(file)
    } catch (error) {
      setMessage(
        'error',
        $t('exportImport.messages.file_processing_failed', {
          error: error.message,
        }),
      )
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
              `Some summaries failed to parse: ${result.errorCount} errors`,
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
              `Some history failed to parse: ${result.errorCount} errors`,
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
              `Some tags failed to parse: ${result.errorCount} errors`,
            )
          }
        } catch (error) {
          console.error(`Failed to parse tags: ${error.message}`)
        }
      }

      if (Object.keys(data).length === 0) {
        throw new Error($t('exportImport.messages.no_valid_data'))
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
      state.showReplaceConfirmDialog = true
      return
    }

    await executeImportProcess()
  }

  async function handleConfirmReplace() {
    await executeImportProcess()
  }

  async function executeImportProcess() {
    try {
      state.showImportModal = false
      const importedData = prepareImportData()
      await executeImport(importedData)
      // Reset file input after successful import
      if (fileInputRef) {
        fileInputRef.value = ''
      }
    } catch (error) {
      setMessage(
        'error',
        $t('exportImport.messages.import_preparation_failed', {
          error: error.message,
        }),
      )
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

      setMessage('success', $t('exportImport.messages.import_success'))
      // Refresh data counts after import
      await loadDataCounts()
      // Don't reset state here - it's handled in startImport()
    } catch (error) {
      setMessage(
        'error',
        $t('exportImport.messages.import_failed', { error: error.message }),
      )
    }
  }

  async function performSimpleImport(importedData) {
    // Handle Settings
    if (importedData.settings) {
      const cleanImportedSettings = sanitizeSettings(importedData.settings)

      // ✅ MIGRATION: Migrate 'alien' tone to 'witty' on import
      if (cleanImportedSettings.summaryTone === 'alien') {
        console.log("[Import] Migration: 'alien' tone -> 'witty'")
        cleanImportedSettings.summaryTone = 'witty'
      }

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

    // ✅ FIX: Handle History - Xóa dựa trên user intent (checkbox), thêm dựa trên data availability
    if (importOptions.dataTypes.history) {
      if (importOptions.mergeMode === 'replace') {
        console.log('[Import Replace] Clearing all history...')
        await clearAllHistory()
      }

      // Chỉ add nếu có data
      if (importedData.history && importedData.history.length > 0) {
        console.log(
          `[Import] Adding ${importedData.history.length} history items...`,
        )
        // ✅ MIGRATION: Thêm các trường soft delete nếu thiếu (cho backup cũ)
        const cleanHistory = importedData.history.map((item) => {
          const cleaned = JSON.parse(JSON.stringify(item))
          if (cleaned.deleted === undefined) cleaned.deleted = false
          if (cleaned.updatedAt === undefined)
            cleaned.updatedAt = cleaned.date || new Date().toISOString()
          return cleaned
        })
        await addMultipleHistory(cleanHistory)
      } else {
        console.log('[Import] No history data to import')
      }
    }

    // ✅ FIX: Handle Summaries (Archive)
    if (importOptions.dataTypes.archive) {
      if (importOptions.mergeMode === 'replace') {
        console.log('[Import Replace] Clearing all summaries...')
        await clearAllSummaries()
      }

      // Chỉ add nếu có data
      if (importedData.summaries && importedData.summaries.length > 0) {
        console.log(
          `[Import] Adding ${importedData.summaries.length} summaries...`,
        )
        // ✅ MIGRATION: Thêm các trường soft delete nếu thiếu (cho backup cũ)
        const cleanSummaries = importedData.summaries.map((item) => {
          const cleaned = JSON.parse(JSON.stringify(item))
          if (cleaned.deleted === undefined) cleaned.deleted = false
          if (cleaned.updatedAt === undefined)
            cleaned.updatedAt = cleaned.date || new Date().toISOString()
          if (cleaned.tags === undefined) cleaned.tags = []
          return cleaned
        })
        await addMultipleSummaries(cleanSummaries)
      } else {
        console.log('[Import] No summaries data to import')
      }
    }

    // ✅ FIX: Handle Tags
    if (importOptions.dataTypes.tags) {
      if (importOptions.mergeMode === 'replace') {
        console.log('[Import Replace] Clearing all tags...')
        await clearAllTags()
      }

      // Chỉ add nếu có data
      if (importedData.tags && importedData.tags.length > 0) {
        console.log(`[Import] Adding ${importedData.tags.length} tags...`)
        // ✅ MIGRATION: Thêm các trường soft delete nếu thiếu (cho backup cũ)
        const cleanTags = importedData.tags.map((tag) => {
          const cleaned = JSON.parse(JSON.stringify(tag))
          if (cleaned.deleted === undefined) cleaned.deleted = false
          if (cleaned.updatedAt === undefined)
            cleaned.updatedAt = cleaned.createdAt || new Date().toISOString()
          return cleaned
        })
        await addMultipleTags(cleanTags)
      } else {
        console.log('[Import] No tags data to import')
      }
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
      : $t('exportImport.unknown')
  }

  function getHistoryCount() {
    return String((state.importData?.history || []).length)
  }

  function getSummariesCount() {
    return String(
      (state.importData?.summaries || state.importData?.archive || []).length,
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
        text: $t('exportImport.exported'),
        key: 'exportedLabel',
      },
      {
        el: animatedRefs.exportedValue,
        text: getExportedDate(),
        key: 'exportedValue',
      },
      {
        el: animatedRefs.historyLabel,
        text: $t('exportImport.history') + ':',
        key: 'historyLabel',
      },
      {
        el: animatedRefs.historyValue,
        text: getHistoryCount(),
        key: 'historyValue',
      },
      {
        el: animatedRefs.summariesLabel,
        text: $t('exportImport.summaries'),
        key: 'summariesLabel',
      },
      {
        el: animatedRefs.summariesValue,
        text: getSummariesCount(),
        key: 'summariesValue',
      },
      {
        el: animatedRefs.tagsLabel,
        text: $t('exportImport.tags') + ':',
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

  // Load data counts when component mounts
  $effect(() => {
    loadDataCounts()
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

<div class="px-5">
  <h3 class="text-text-primary font-bold">{$t('exportImport.title')}</h3>
  <p class="mt-1 text-muted">{$t('exportImport.description')}</p>
  <div class="pt-4 flex flex-col sm:flex-row gap-4">
    <Preview
      title={$t('exportImport.your_data')}
      class=" w-full sm:w-60 h-40 shrink-0 mx-auto"
    >
      <div class=" w-full flex gap-4 flex-col items-center justify-center">
        <div
          class="h-15 w-full justify-center items-end flex gap-4 shrink-0 relative"
        >
          <Icon
            icon="heroicons:cog-6-tooth"
            class="size-6 text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
          />
          <Icon
            icon="heroicons:clock"
            class="size-6 text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
          />
          <Icon
            icon="heroicons:archive-box"
            class="size-6 text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
          />
          <Icon
            icon="tabler:tag"
            class="size-6 text-muted dark:text-text-primary  dark:drop-shadow-md dark:drop-shadow-primary shrink-0"
          />
        </div>
        <div class=" px-8 gap-1 flex flex-col w-full">
          <div class="flex justify-between">
            <div class="text-text-secondary text-xs">
              {$t('exportImport.history')}
            </div>
            <div class="text-text-primary font-medium">
              {dataCounts.isLoading ? '...' : dataCounts.history}
            </div>
          </div>
          <div class="flex justify-between">
            <div class="text-text-secondary text-xs">
              {$t('exportImport.archives')}
            </div>
            <div class="text-text-primary font-medium">
              {dataCounts.isLoading ? '...' : dataCounts.archives}
            </div>
          </div>
          <div class="flex justify-between">
            <div class="text-text-secondary text-xs">
              {$t('exportImport.tags')}
            </div>
            <div class="text-text-primary font-medium">
              {dataCounts.isLoading ? '...' : dataCounts.tags}
            </div>
          </div>
        </div>
      </div></Preview
    >
    <div class="flex-auto">
      <div class="flex flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('exportImport.all_data')}</label
        >
        <div class="grid w-full grid-cols-2 gap-1">
          <button
            onclick={exportData}
            class="relative group"
            title={$t('exportImport.backup')}
          >
            <div
              class=" relative flex items-center font-bold justify-center gap-1 px-3 py-2.25 font-mono text-xs text-red-500 inset-0 overflow-hidden"
            >
              <div
                class="relative z-20 flex text-text-primary justify-center items-center"
              >
                {$t('exportImport.backup')}
              </div>
              <span
                class="absolute z-50 size-4 border border-transparent group-hover:border-blackwhite/15 rotate-45 bg-surface-1 -bottom-px -left-px -translate-x-1/2 translate-y-1/2 duration-150"
              ></span>
              <div
                class="absolute z-40 inset-0 text-text-secondary py-2 font-mono bg-blackwhite/5 dark:bg-blackwhite/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
              ></div>
            </div>
          </button>
          <button
            onclick={openImportDialog}
            class="relative group"
            title={$t('exportImport.import')}
          >
            <div
              class=" relative flex items-center font-bold justify-center gap-1 px-3 py-2.25 font-mono text-xs text-red-500 inset-0 overflow-hidden"
            >
              <div
                class="relative z-20 flex text-text-primary justify-center items-center"
              >
                {$t('exportImport.import')}
              </div>
              <span
                class="absolute z-50 size-4 border border-transparent group-hover:border-blackwhite/15 rotate-45 bg-surface-1 -bottom-px -left-px -translate-x-1/2 translate-y-1/2 duration-150"
              ></span>
              <div
                class="absolute z-40 inset-0 text-text-secondary py-2 font-mono bg-blackwhite/5 dark:bg-blackwhite/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
              ></div>
            </div>
          </button>

          <input
            bind:this={fileInputRef}
            type="file"
            class="hidden"
            accept=".zip"
            onchange={handleFileSelect}
          />
        </div>
      </div>
      <div class="flex flex-col gap-2 pb-4">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-text-secondary"
          >{$t('exportImport.export_to_markdown')}</label
        >
        <div class="grid w-full grid-cols-2 gap-1">
          <button
            onclick={exportHistoryMarkdown}
            disabled={state.isExportingHistory || dataCounts.history === 0}
            class="relative group disabled:opacity-50 disabled:cursor-not-allowed"
            title={$t('exportImport.history')}
          >
            <div
              class=" relative flex items-center font-bold justify-center gap-1 px-3 py-2.25 font-mono text-xs text-red-500 inset-0 overflow-hidden"
            >
              <div
                class="relative z-20 flex text-text-primary justify-center items-center"
              >
                {#if state.isExportingHistory}
                  {$t('exportImport.exporting')}
                {:else}
                  {$t('exportImport.history')}
                {/if}
              </div>
              <span
                class="absolute z-50 size-4 border border-transparent group-hover:border-blackwhite/15 rotate-45 bg-surface-1 -bottom-px -left-px -translate-x-1/2 translate-y-1/2 duration-150"
              ></span>
              <div
                class="absolute z-40 inset-0 text-text-secondary py-2 font-mono bg-blackwhite/5 dark:bg-blackwhite/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
              ></div>
            </div>
          </button>
          <button
            onclick={exportArchiveMarkdown}
            disabled={state.isExportingArchive || dataCounts.archives === 0}
            class="relative group disabled:opacity-50 disabled:cursor-not-allowed"
            title={$t('exportImport.archive')}
          >
            <div
              class=" relative flex items-center font-bold justify-center gap-1 px-3 py-2.25 font-mono text-xs text-red-500 inset-0 overflow-hidden"
            >
              <div
                class="relative z-20 flex text-text-primary justify-center items-center"
              >
                {#if state.isExportingArchive}
                  {$t('exportImport.exporting')}
                {:else}
                  {$t('exportImport.archive')}
                {/if}
              </div>
              <span
                class="absolute z-50 size-4 border border-transparent group-hover:border-blackwhite/15 rotate-45 bg-surface-1 -bottom-px -left-px -translate-x-1/2 translate-y-1/2 duration-150"
              ></span>
              <div
                class="absolute z-40 inset-0 text-text-secondary py-2 font-mono bg-blackwhite/5 dark:bg-blackwhite/5 border border-transparent hover:border-blackwhite/15 focus:border-blackwhite/30 dark:focus:border-blackwhite/10 focus:outline-none focus:ring-0 transition-colors duration-150"
              ></div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
  <!-- Success/Error Messages -->
  <!-- {#if state.successMessage}
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
  {/if} -->
</div>

<!-- Import Options Modal -->
<Dialog.Root bind:open={state.showImportModal}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-[99] bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fadeOnly></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden flex flex-col font-mono fixed left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-lg z-[150] -translate-y-1/2  rounded-lg overflow-hidden shadow-lg max-h-[90svh] translate-x-[-50%]"
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
                {$t('exportImport.import_options')}
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
                    <div
                      class="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center"
                    >
                      <div class="w-20">
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
                      <div class="flex flex-col flex-auto w-full gap-1">
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
                    {$t('exportImport.select_data_types')}
                  </h3>
                  <div class="grid grid-cols-2 gap-2">
                    <SwitchPermission
                      id="settings-switch"
                      name={$t('exportImport.settings')}
                      bind:checked={importOptions.dataTypes.settings}
                    />

                    <SwitchPermission
                      id="history-switch"
                      name={$t('exportImport.history')}
                      bind:checked={importOptions.dataTypes.history}
                    />

                    <SwitchPermission
                      id="archive-switch"
                      name={$t('exportImport.archive')}
                      bind:checked={importOptions.dataTypes.archive}
                    />

                    <SwitchPermission
                      id="tags-switch"
                      name={$t('exportImport.tags')}
                      bind:checked={importOptions.dataTypes.tags}
                    />
                  </div>
                </div>

                <div class="flex py-1 flex-col gap-2">
                  <h3 class=" font-medium text-text-secondary">
                    {$t('exportImport.import_mode')}
                  </h3>
                  <div class="grid w-full grid-cols-2 gap-1">
                    <ButtonSet
                      title={$t('exportImport.merge_data')}
                      class="setting-btn {importOptions.mergeMode === 'merge'
                        ? 'active'
                        : ''}"
                      onclick={() => (importOptions.mergeMode = 'merge')}
                      Description={$t('exportImport.merge_description')}
                    />
                    <ButtonSet
                      title={$t('exportImport.replace_data')}
                      class="setting-btn {importOptions.mergeMode === 'replace'
                        ? 'active'
                        : ''}"
                      onclick={() => (importOptions.mergeMode = 'replace')}
                      Description={$t('exportImport.replace_description')}
                    />
                  </div>
                </div>

                <div class="">
                  <p class="text-xs text-text-secondary leading-relaxed">
                    {#if importOptions.mergeMode === 'merge'}
                      <strong>Merge Mode:</strong><br />
                      {@html $t('exportImport.merge_mode_description')}
                    {:else}
                      <strong>⚠️ Replace Mode:</strong><br />
                      {@html $t('exportImport.replace_mode_description')}
                    {/if}
                  </p>
                </div>

                <div class="flex justify-end gap-4">
                  <button onclick={cancelImport} class="btn btn-ghost"
                    >{$t('exportImport.cancel')}</button
                  >
                  <button
                    class=" flex relative overflow-hidden group"
                    onclick={startImport}
                    disabled={!Object.values(importOptions.dataTypes).some(
                      Boolean,
                    )}
                  >
                    <div
                      class=" font-medium py-2 px-4 border transition-colors duration-200 {isImportDataSelected()
                        ? 'bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white'
                        : ' bg-white dark:bg-surface-1 text-text-secondary border-border/40'}"
                    >
                      {$t('exportImport.start_import')}
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

<ConfirmDialog
  bind:open={state.showReplaceConfirmDialog}
  title={$t('exportImport.replace_warning_title') || 'Warning: Replace Mode'}
  description={$t('exportImport.replace_warning') +
    '<br/><br/>' +
    Object.entries(importOptions.dataTypes)
      .filter(([_, checked]) => checked)
      .map(([type, _]) => {
        return '• ' + $t(`exportImport.${type}`)
      })
      .join('<br/>')}
  confirmText={$t('exportImport.confirm_replace') || 'Yes, Replace'}
  cancelText={$t('exportImport.cancel') || 'Cancel'}
  onConfirm={handleConfirmReplace}
/>
