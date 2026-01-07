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
    const now = Date.now()

    // Settings file format (matches Cloud Sync)
    const settingsData = {
      version: 2,
      updatedAt: now,
      data: cleanSettings,
      // Metadata for backup info
      _backup: {
        format: 'zip-jsonl-v2',
        exportedAt: new Date().toISOString(),
        exportedBy: `v${chrome.runtime.getManifest().version}`,
        counts: {
          summaries: summaries.length,
          history: history.length,
          tags: tags.length,
        },
      }
    }

    const settingsJson = JSON.stringify(settingsData, null, 2)

    // Step 3: Create JSONL files with metadata (matches Cloud Sync format)
    if (onProgress) {
      onProgress({
        stage: 'creating_jsonl',
        message: 'Creating JSONL files...',
        progress: 50,
      })
    }

    // History JSONL: metadata line + items
    const historyLines = [
      JSON.stringify({ _meta: true, version: 2, updatedAt: now }),
      ...history.map(item => JSON.stringify(item))
    ]
    const historyJsonl = historyLines.join('\n')

    // Library JSONL: metadata line + archives (with _type) + tags (with _type)
    const libraryLines = [
      JSON.stringify({ _meta: true, version: 2, updatedAt: now }),
      ...summaries.map(item => JSON.stringify({ ...item, _type: 'archive' })),
      ...tags.map(item => JSON.stringify({ ...item, _type: 'tag' }))
    ]
    const libraryJsonl = libraryLines.join('\n')

    // Step 4: Create ZIP with Cloud Sync compatible filenames
    if (onProgress) {
      onProgress({
        stage: 'creating_zip',
        message: 'Creating ZIP archive...',
        progress: 70,
      })
    }

    const zipBlob = await createZipFromFiles(
      {
        'summarizerrrr-settings.json': settingsJson,
        'summarizerrrr-history.jsonl': historyJsonl,
        'summarizerrrr-library.jsonl': libraryJsonl,
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
  // Priority 1: navigator.share (Mobile/iOS)
  try {
    const file = new File([blob], filename, { type: acceptType })
    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] }) &&
      // Check if running on mobile/tablet by user agent or simple check
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    ) {
      await navigator.share({
        files: [file],
      })
      return
    }
  } catch (error) {
    console.warn('[downloadBlob] Share failed, falling back:', error)
  }

  // Priority 2: chrome.downloads API (Extension)
  try {
    // @ts-ignore
    const downloadsApi = (typeof browser !== 'undefined' ? browser : chrome)
      .downloads
    if (downloadsApi) {
      const url = URL.createObjectURL(blob)
      await new Promise((resolve, reject) => {
        downloadsApi.download(
          {
            url: url,
            filename: filename,
            saveAs: true, // Prompt user where to save
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError)
            } else {
              resolve(downloadId)
            }
          }
        )
      })
      // Revoke URL after a delay to ensure download started
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      return
    }
  } catch (error) {
    console.warn(
      '[downloadBlob] chrome.downloads failed, falling back to anchor tag:',
      error
    )
  }

  // Priority 3: Fallback to <a> tag (Desktop Web / Legacy)
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
      // Fallthrough to anchor tag if FS API fails
    }
  }

  // Fallback for browsers that don't support File System Access API
  // Use Data URL for small files (< 10MB) to avoid Blob URL revocation issues on iOS
  let url
  const isSmallFile = blob.size < 10 * 1024 * 1024 // 10MB

  if (isSmallFile) {
    const reader = new FileReader()
    url = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } else {
    url = URL.createObjectURL(blob)
  }

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none' // Ensure it's not visible
  document.body.appendChild(a) // Required for Firefox/Safari
  a.click()
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(a)
    if (!isSmallFile) {
      URL.revokeObjectURL(url)
    }
  }, 30000) // 30s timeout for iOS Safari safety
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

/**
 * Export History items as markdown files in ZIP format
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Blob>} ZIP blob containing markdown files
 */
export async function exportHistoryMarkdownToZip(onProgress) {
  try {
    // Step 1: Load data from IndexedDB
    if (onProgress) {
      onProgress({
        stage: 'loading_data',
        message: 'Loading history from database...',
        progress: 10,
      })
    }

    const historyItems = await getAllHistory()

    if (historyItems.length === 0) {
      throw new Error('No history items found to export')
    }

    // History không có tags, dùng empty tagMap
    const tagMap = {}

    if (onProgress) {
      onProgress({
        stage: 'converting',
        message: 'Converting to markdown files...',
        progress: 30,
      })
    }

    // Step 2: Convert each history item to markdown files
    const markdownFiles = {}
    let fileCount = 0

    historyItems.forEach((item, index) => {
      // Handle both multi-tab (array) and single content (string) formats
      const tabs = Array.isArray(item.summaries)
        ? item.summaries
        : [
            {
              title: 'Summary',
              content: item.summary || item.summaries || '',
            },
          ]

      // Create a markdown file for each tab
      tabs.forEach((tab) => {
        // Skip empty tabs
        if (!tab.content || tab.content.trim() === '') {
          console.warn(
            `[exportHistoryMarkdownToZip] Skipping empty tab "${tab.title}" in "${item.title}"`
          )
          return
        }

        const filepath = generateOrganizedPath(item, tab.title, index)
        const markdown = convertTabToMarkdown(item, tab, tagMap)
        markdownFiles[filepath] = markdown
        fileCount++
      })

      if (onProgress) {
        const progressPercent = ((index + 1) / historyItems.length) * 40
        onProgress({
          stage: 'converting',
          message: `Converting ${index + 1}/${historyItems.length}...`,
          progress: 30 + progressPercent,
        })
      }
    })

    // Step 3: Create README.md
    markdownFiles['README.md'] = createReadmeContent({
      totalSummaries: historyItems.length,
      totalFiles: fileCount,
      exportDate: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
    })

    // Step 4: Create ZIP
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
    console.error('[exportHistoryMarkdownToZip] Error:', error)
    throw new Error(`History markdown export failed: ${error.message}`)
  }
}

/**
 * Export Archive summaries as markdown files in ZIP format
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<Blob>} ZIP blob containing markdown files
 */
export async function exportArchiveMarkdownToZip(onProgress) {
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
            `[exportArchiveMarkdownToZip] Skipping empty tab "${tab.title}" in "${summary.title}"`
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
    console.error('[exportArchiveMarkdownToZip] Error:', error)
    throw new Error(`Archive markdown export failed: ${error.message}`)
  }
}

/**
 * Generate filename for history markdown export
 * Format: summarizerrrr-history-markdown-YYYY-MM-DD.zip
 * @returns {string} Filename with timestamp
 */
export function generateHistoryMarkdownExportFilename() {
  const date = new Date().toISOString().split('T')[0]
  return `summarizerrrr-history-markdown-${date}.zip`
}

/**
 * Generate filename for archive markdown export
 * Format: summarizerrrr-archive-markdown-YYYY-MM-DD.zip
 * @returns {string} Filename with timestamp
 */
export function generateArchiveMarkdownExportFilename() {
  const date = new Date().toISOString().split('T')[0]
  return `summarizerrrr-archive-markdown-${date}.zip`
}
