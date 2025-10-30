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
import {
  convertTabToMarkdown,
  generateOrganizedPath,
  createReadmeContent,
} from './markdownService.js'

import { createZipFromFiles } from './zipService.js'
import { sanitizeSettings } from '@/lib/config/settingsSchema.js'

/**
 * Export all data to ZIP format
 * @param {Object} settings - Settings object
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Blob>} - ZIP blob
 */

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
    const cleanSettings = sanitizeSettings(settings)

    const settingsData = {
      metadata: {
        version: '2.0.0',
        format: 'zip-jsonl',
        exportedAt: new Date().toISOString(),
        exportedBy: `v${chrome.runtime.getManifest().version}`,
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
 * Download blob as file with save dialog
 * @param {Blob} blob - Blob to download
 * @param {string} filename - Filename
 * @param {string} acceptType - MIME type (default: 'application/zip')
 * @param {string} extension - File extension (default: '.zip')
 */
export async function downloadBlob(
  blob,
  filename,
  acceptType = 'application/zip',
  extension = '.zip'
) {
  // Use File System Access API if available (Chrome/Edge)
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Archive File',
            accept: { [acceptType]: [extension] },
          },
        ],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (err) {
      // User cancelled the save dialog
      if (err.name === 'AbortError') {
        console.log('[downloadBlob] Save cancelled by user')
        return
      }
      throw err
    }
  }

  // Fallback for browsers that don't support File System Access API
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export all archives as markdown files in ZIP format
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Blob>} ZIP blob containing markdown files
 */
export async function exportMarkdownToZip(onProgress) {
  try {
    // Step 1: Load data from IndexedDB
    if (onProgress) {
      onProgress({
        stage: 'loading_data',
        message: 'Loading archives from database...',
        progress: 10,
      })
    }

    const summaries = await getAllSummaries()
    const tags = await getAllTags()

    if (summaries.length === 0) {
      throw new Error('No archives found to export')
    }

    // Step 2: Create tag mapping (id -> name)
    const tagMap = Object.fromEntries(tags.map((t) => [t.id, t.name]))

    if (onProgress) {
      onProgress({
        stage: 'converting',
        message: 'Converting to markdown files...',
        progress: 30,
      })
    }

    // Step 3: Convert each summary to markdown files
    const markdownFiles = {}
    let fileCount = 0

    summaries.forEach((summary, index) => {
      // Handle both multi-tab (array) and single content (string) formats
      const tabs = Array.isArray(summary.summaries)
        ? summary.summaries
        : [
            {
              title: 'Summary',
              content: summary.summary || summary.summaries || '',
            },
          ]

      // Create a markdown file for each tab
      tabs.forEach((tab) => {
        // Skip empty tabs
        if (!tab.content || tab.content.trim() === '') {
          console.warn(
            `[exportMarkdownToZip] Skipping empty tab "${tab.title}" in "${summary.title}"`
          )
          return
        }

        const filepath = generateOrganizedPath(summary, tab.title, index)
        const markdown = convertTabToMarkdown(summary, tab, tagMap)
        markdownFiles[filepath] = markdown
        fileCount++
      })

      if (onProgress) {
        const progressPercent = ((index + 1) / summaries.length) * 40
        onProgress({
          stage: 'converting',
          message: `Converting ${index + 1}/${summaries.length}...`,
          progress: 30 + progressPercent,
        })
      }
    })

    // Step 4: Create README.md
    markdownFiles['README.md'] = createReadmeContent({
      totalSummaries: summaries.length,
      totalFiles: fileCount,
      exportDate: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
    })

    // Step 5: Create ZIP
    if (onProgress) {
      onProgress({
        stage: 'creating_zip',
        message: 'Creating ZIP archive...',
        progress: 70,
      })
    }

    const zipBlob = await createZipFromFiles(markdownFiles, (zipProgress) => {
      if (onProgress) {
        onProgress({
          stage: 'creating_zip',
          message: `Compressing files... ${zipProgress.percent || 0}%`,
          progress: 70 + (zipProgress.percent || 0) * 0.3,
        })
      }
    })

    if (onProgress) {
      onProgress({
        stage: 'completed',
        message: 'Export completed!',
        progress: 100,
      })
    }

    return zipBlob
  } catch (error) {
    console.error('[exportMarkdownToZip] Error:', error)
    throw new Error(`Markdown export failed: ${error.message}`)
  }
}

/**
 * Generate filename for markdown export
 * Format: summarizerrrr-markdown-backup-YYYY-MM-DD.zip
 * @returns {string} Filename with timestamp
 */
export function generateMarkdownExportFilename() {
  const date = new Date().toISOString().split('T')[0]
  return `summarizerrrr-markdown-backup-${date}.zip`
}
