// @ts-nocheck
/**
 * Export Service Orchestrator
 * Main service để orchestrate toàn bộ export process
 *
 * CRITICAL FIX: Load data trực tiếp từ IndexedDB thay vì stores
 * để tránh bug export rỗng
 */

import {
  getAllSummaries,
  getAllTags,
  getAllHistory,
} from '@/lib/db/indexedDBService'
import { exportToJsonl } from './jsonlService.js'
import { createZipFromFiles } from './zipService.js'

/**
 * Export all data to ZIP format
 * @param {Object} settings - Settings object
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Blob>} - ZIP blob
 */
/**
 * Sanitizes settings object to only include valid fields from DEFAULT_SETTINGS
 * This prevents nested/corrupted data from being exported
 * @param {Object} rawSettings - Raw settings object
 * @returns {Object} - Clean settings object
 */
function sanitizeSettingsForExport(rawSettings) {
  // Define valid setting keys (from DEFAULT_SETTINGS in settingsStore)
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

  const cleanSettings = {}

  // Only include valid setting keys, skip any nested metadata/settings
  validSettingKeys.forEach((key) => {
    if (rawSettings[key] !== undefined) {
      cleanSettings[key] = rawSettings[key]
    }
  })

  console.log('[exportService] Sanitized settings:', {
    originalKeys: Object.keys(rawSettings),
    cleanKeys: Object.keys(cleanSettings),
    removedKeys: Object.keys(rawSettings).filter(
      (key) => !validSettingKeys.includes(key)
    ),
  })

  return cleanSettings
}

export async function exportDataToZip(settings, onProgress) {
  try {
    // Step 1: Load data từ IndexedDB (CRITICAL FIX)
    if (onProgress) {
      onProgress({
        stage: 'loading_data',
        message: 'Loading data from IndexedDB...',
        progress: 10,
      })
    }

    // ✅ Load trực tiếp từ IndexedDB, KHÔNG dùng stores
    const summaries = await getAllSummaries()
    const history = await getAllHistory()
    const tags = await getAllTags()

    // Step 2: Create settings.json with sanitized settings
    if (onProgress) {
      onProgress({
        stage: 'creating_settings',
        message: 'Creating settings file...',
        progress: 30,
      })
    }

    // ✅ CRITICAL FIX: Sanitize settings trước khi export
    const cleanSettings = sanitizeSettingsForExport(settings)

    const settingsData = {
      metadata: {
        version: '2.0.0',
        format: 'zip-jsonl',
        exportedAt: new Date().toISOString(),
        exportedBy: `Summarizerrrr Extension v${
          chrome.runtime.getManifest().version
        }`,
        counts: {
          summaries: summaries.length,
          history: history.length,
          tags: tags.length,
        },
      },
      settings: cleanSettings, // ✅ Use sanitized settings
    }

    const settingsJson = JSON.stringify(settingsData, null, 2)

    // Step 3: Create JSONL files
    if (onProgress) {
      onProgress({
        stage: 'creating_jsonl',
        message: 'Creating JSONL files...',
        progress: 50,
      })
    }

    const summariesJsonl = exportToJsonl(summaries)
    const historyJsonl = exportToJsonl(history)
    const tagsJsonl = exportToJsonl(tags)

    // Step 4: Create ZIP
    if (onProgress) {
      onProgress({
        stage: 'creating_zip',
        message: 'Creating ZIP archive...',
        progress: 70,
      })
    }

    const zipBlob = await createZipFromFiles(
      {
        'settings.json': settingsJson,
        'summaries.jsonl': summariesJsonl,
        'history.jsonl': historyJsonl,
        'tags.jsonl': tagsJsonl,
      },
      (zipProgress) => {
        if (onProgress) {
          onProgress({
            stage: 'creating_zip',
            message: `Compressing files... ${zipProgress.percent || 0}%`,
            progress: 70 + (zipProgress.percent || 0) * 0.3,
          })
        }
      }
    )

    if (onProgress) {
      onProgress({
        stage: 'completed',
        message: 'Export completed!',
        progress: 100,
      })
    }

    return zipBlob
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`)
  }
}

/**
 * Generate filename for export
 * Format: summarizerrrr-backup-YYYY-MM-DD.zip
 * @returns {string} - Filename with timestamp
 */
export function generateExportFilename() {
  const date = new Date().toISOString().split('T')[0]
  return `summarizerrrr-backup-${date}.zip`
}

/**
 * Download blob as file
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
