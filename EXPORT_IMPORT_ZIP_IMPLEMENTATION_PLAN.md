# Export/Import ZIP + JSONL Implementation Plan

## 📋 Overview

Fix bug export/import archive và tags bị rỗng bằng cách:

1. Load dữ liệu trực tiếp từ IndexedDB (không dựa vào stores)
2. Export sang format mới: ZIP chứa settings.json + summaries.jsonl + tags.jsonl
3. Hỗ trợ backward compatibility với JSON format cũ

## 🎯 Problem Statement

### Current Issues:

- ❌ Export ra file JSON với `archive: []` và `tags: []` rỗng
- ❌ Export dựa vào `archiveStore.archiveList` và `tagsCache.tags` chưa được load
- ❌ Format JSON đơn giản không tối ưu cho large datasets

### Root Cause:

```javascript
// File: src/components/settings/ExportImport.svelte line 87-88
const data = {
  archive: archiveStore.archiveList || [], // ❌ Store chưa load!
  tags: tagsCache.tags || [], // ❌ Store chưa load!
}
```

## 🏗️ Solution Architecture

### New Export Structure

```
summarizerrrr-backup-2025-10-20.zip
├─ settings.json          # Settings + theme + metadata
├─ summaries.jsonl        # All archive summaries (JSONL format)
└─ tags.jsonl            # All tags (JSONL format)
```

### File Formats

#### 1. settings.json

```json
{
  "metadata": {
    "version": "2.0.0",
    "format": "zip-jsonl",
    "exportedAt": "2025-10-20T14:30:00.000Z",
    "exportedBy": "Summarizerrrr Extension v2.2.9",
    "counts": {
      "summaries": 50,
      "tags": 10
    }
  },
  "settings": {
    "selectedProvider": "gemini",
    "geminiApiKey": "...",
    ...
  },
  "theme": {
    "theme": "system"
  }
}
```

#### 2. summaries.jsonl (JSON Lines)

```jsonl
{"id":"abc123","title":"Video 1","url":"https://youtube.com/...","summary":"Content with \"quotes\" and\nnewlines","date":"2025-01-01T00:00:00.000Z","tags":["tag1","tag2"],...}
{"id":"def456","title":"Video 2","url":"https://youtube.com/...","summary":"Another summary","date":"2025-01-02T00:00:00.000Z","tags":["tag1"],...}
```

#### 3. tags.jsonl

```jsonl
{"id":"tag1","name":"Work","createdAt":"2025-01-01T00:00:00.000Z"}
{"id":"tag2","name":"Study","createdAt":"2025-01-02T00:00:00.000Z"}
```

### Why JSONL?

- ✅ Each line = 1 complete JSON object
- ✅ `JSON.stringify()` automatically escapes special characters, quotes, newlines
- ✅ Streaming-friendly for large datasets
- ✅ If 1 record fails → only lose 1 record, not entire file
- ✅ No additional dependencies needed

## 📂 File Structure

```
src/
└── lib/
    └── exportImport/
        ├── jsonlService.js       # JSONL encoding/decoding
        ├── zipService.js         # ZIP creation/extraction
        └── exportService.js      # Main orchestrator
```

## 🔧 Implementation Steps

### Phase 1: Create Utility Services

#### Step 1.1: JSONL Service (`src/lib/exportImport/jsonlService.js`)

```javascript
// @ts-nocheck
/**
 * JSONL (JSON Lines) format service
 * Each line is a complete JSON object
 */

/**
 * Convert array of objects to JSONL string
 * @param {Array<Object>} data - Array of objects to export
 * @returns {string} - JSONL formatted string
 */
export function exportToJsonl(data) {
  if (!Array.isArray(data)) {
    throw new Error('Data must be an array')
  }

  return data.map((item) => JSON.stringify(item)).join('\n')
}

/**
 * Parse JSONL string to array of objects
 * @param {string} text - JSONL formatted string
 * @returns {Array<Object>} - Parsed array of objects
 */
export function importFromJsonl(text) {
  if (!text || text.trim() === '') {
    return []
  }

  const lines = text.split('\n').filter((line) => line.trim() !== '')
  const results = []
  const errors = []

  lines.forEach((line, index) => {
    try {
      results.push(JSON.parse(line))
    } catch (error) {
      errors.push({
        line: index + 1,
        content: line.substring(0, 100),
        error: error.message,
      })
    }
  })

  return {
    data: results,
    errors: errors.length > 0 ? errors : null,
    totalLines: lines.length,
    successCount: results.length,
    errorCount: errors.length,
  }
}

/**
 * Validate JSONL format
 * @param {string} text - Text to validate
 * @returns {Object} - Validation result
 */
export function validateJsonl(text) {
  const result = importFromJsonl(text)

  return {
    valid: result.errors === null,
    errors: result.errors,
    lineCount: result.totalLines,
    validLineCount: result.successCount,
  }
}
```

#### Step 1.2: ZIP Service (`src/lib/exportImport/zipService.js`)

```javascript
// @ts-nocheck
import JSZip from 'jszip'

/**
 * Create ZIP file from multiple files
 * @param {Object} files - Object with filename as key and content as value
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Blob>} - ZIP file as Blob
 */
export async function createZipFromFiles(files, onProgress) {
  const zip = new JSZip()

  // Add files to ZIP
  const fileNames = Object.keys(files)
  fileNames.forEach((filename, index) => {
    zip.file(filename, files[filename])

    if (onProgress) {
      onProgress({
        stage: 'adding_files',
        current: index + 1,
        total: fileNames.length,
        filename,
      })
    }
  })

  // Generate ZIP blob
  const blob = await zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => {
      if (onProgress) {
        onProgress({
          stage: 'compressing',
          percent: metadata.percent.toFixed(2),
        })
      }
    }
  )

  return blob
}

/**
 * Extract files from ZIP
 * @param {Blob|ArrayBuffer} zipData - ZIP file data
 * @returns {Promise<Object>} - Extracted files
 */
export async function extractFilesFromZip(zipData) {
  const zip = new JSZip()
  await zip.loadAsync(zipData)

  const files = {}
  const filePromises = []

  zip.forEach((relativePath, zipEntry) => {
    filePromises.push(
      zipEntry.async('string').then((content) => {
        files[relativePath] = content
      })
    )
  })

  await Promise.all(filePromises)

  return files
}

/**
 * Check if file is a ZIP
 * @param {Blob} file - File to check
 * @returns {Promise<boolean>} - True if ZIP file
 */
export async function isZipFile(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Check ZIP signature (PK\x03\x04 or PK\x05\x06)
    return (
      uint8Array.length >= 4 &&
      uint8Array[0] === 0x50 &&
      uint8Array[1] === 0x4b &&
      (uint8Array[2] === 0x03 || uint8Array[2] === 0x05) &&
      (uint8Array[3] === 0x04 || uint8Array[3] === 0x06)
    )
  } catch (error) {
    return false
  }
}
```

#### Step 1.3: Export Service (`src/lib/exportImport/exportService.js`)

```javascript
// @ts-nocheck
import { getAllSummaries, getAllTags } from '@/lib/db/indexedDBService'
import { exportToJsonl } from './jsonlService'
import { createZipFromFiles } from './zipService'

/**
 * Export all data to ZIP format
 * @param {Object} settings - Settings object
 * @param {Object} theme - Theme object
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Blob>} - ZIP blob
 */
export async function exportDataToZip(settings, theme, onProgress) {
  try {
    // Step 1: Load data từ IndexedDB
    if (onProgress) {
      onProgress({
        stage: 'loading_data',
        message: 'Loading data from IndexedDB...',
        progress: 10,
      })
    }

    const summaries = await getAllSummaries()
    const tags = await getAllTags()

    console.log('[ExportService] Loaded:', {
      summariesCount: summaries.length,
      tagsCount: tags.length,
    })

    // Step 2: Create settings.json
    if (onProgress) {
      onProgress({
        stage: 'creating_settings',
        message: 'Creating settings file...',
        progress: 30,
      })
    }

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
          tags: tags.length,
        },
      },
      settings,
      theme,
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
    console.error('[ExportService] Export failed:', error)
    throw error
  }
}

/**
 * Generate filename for export
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
```

### Phase 2: Update ExportImport Component

#### Step 2.1: Update `exportData()` function

File: [`src/components/settings/ExportImport.svelte`](src/components/settings/ExportImport.svelte:71)

```javascript
// Import services
import {
  exportDataToZip,
  generateExportFilename,
  downloadBlob,
} from '../../lib/exportImport/exportService.js'

// Update exportData function
async function exportData() {
  try {
    showProgressModal = true
    progressData = {
      stage: 'preparing',
      progress: 0,
      total: 100,
      message: 'Preparing export...',
      errors: [],
    }

    // Export to ZIP with progress tracking
    const zipBlob = await exportDataToZip(
      settings,
      themeSettings,
      (progress) => {
        progressData.stage = progress.stage
        progressData.progress = progress.progress
        progressData.message = progress.message
      }
    )

    // Download file
    const filename = generateExportFilename()
    downloadBlob(zipBlob, filename)

    progressData.stage = 'completed'
    progressData.progress = 100
    progressData.message = 'Export completed successfully!'

    setTimeout(() => {
      showProgressModal = false
      successMessage = `Data exported to ${filename}`
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
```

#### Step 2.2: Update `handleFileSelect()` and Import Logic

```javascript
import {
  isZipFile,
  extractFilesFromZip,
} from '../../lib/exportImport/zipService.js'
import { importFromJsonl } from '../../lib/exportImport/jsonlService.js'

async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    showProgressModal = true
    progressData = {
      stage: 'detecting',
      progress: 10,
      total: 100,
      message: 'Detecting file format...',
      errors: [],
    }

    // Check if ZIP or legacy JSON
    const isZip = await isZipFile(file)

    if (isZip) {
      await handleZipImport(file)
    } else {
      await handleLegacyJsonImport(file)
    }
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

async function handleZipImport(file) {
  progressData.stage = 'extracting'
  progressData.progress = 30
  progressData.message = 'Extracting ZIP archive...'

  // Extract files
  const files = await extractFilesFromZip(file)

  progressData.stage = 'parsing'
  progressData.progress = 50
  progressData.message = 'Parsing files...'

  // Parse settings
  const settingsData = JSON.parse(files['settings.json'])

  // Parse summaries
  const summariesResult = importFromJsonl(files['summaries.jsonl'] || '')

  // Parse tags
  const tagsResult = importFromJsonl(files['tags.jsonl'] || '')

  // Store for import
  importData = {
    metadata: settingsData.metadata,
    settings: settingsData.settings,
    theme: settingsData.theme,
    archive: summariesResult.data,
    tags: tagsResult.data,
  }

  // Check for parse errors
  if (summariesResult.errors || tagsResult.errors) {
    console.warn('Parse errors:', {
      summaries: summariesResult.errors,
      tags: tagsResult.errors,
    })
  }

  progressData.stage = 'completed'
  progressData.progress = 100
  progressData.message = 'File processed successfully'

  setTimeout(() => {
    showProgressModal = false
    showImportModal = true
  }, 1000)
}

async function handleLegacyJsonImport(file) {
  progressData.stage = 'reading'
  progressData.progress = 30
  progressData.message = 'Reading legacy JSON file...'

  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)

      importData = data
      validationResults = { valid: true }
      availableDataTypes = Object.keys(data).filter((key) => key !== 'metadata')

      progressData.stage = 'completed'
      progressData.progress = 100
      progressData.message = 'Legacy file processed successfully'

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
}
```

### Phase 3: Testing Plan

#### Test Cases

1. **Empty Data Export**

   - Export khi không có summaries/tags
   - Verify ZIP structure và empty JSONL files

2. **Complex Content Export**

   - Summary với quotes: `"This is a \"quote\""`
   - Summary với newlines và special characters
   - Emoji và Unicode characters
   - Verify JSON escaping hoạt động đúng

3. **Large Dataset Export**

   - 1000+ summaries
   - 100+ tags
   - Verify performance và file size

4. **Import Testing**

   - Import ZIP file mới
   - Import legacy JSON file
   - Import corrupted files
   - Import with parse errors

5. **Backward Compatibility**
   - Export từ v2.2.9
   - Import vào v2.3.0
   - Verify data integrity

## 📝 Progress Tracking

### Export Progress Stages:

1. `loading_data` - Loading from IndexedDB (10%)
2. `creating_settings` - Creating settings.json (30%)
3. `creating_jsonl` - Creating JSONL files (50%)
4. `creating_zip` - Creating ZIP archive (70-100%)
5. `completed` - Export completed

### Import Progress Stages:

1. `detecting` - Detecting file format (10%)
2. `extracting` - Extracting ZIP (30%)
3. `parsing` - Parsing files (50%)
4. `validating` - Validating data (70%)
5. `importing` - Importing to IndexedDB (90%)
6. `completed` - Import completed

## 🔄 Migration Notes

### For Users:

- Old JSON exports will still work (backward compatible)
- New exports use ZIP format
- File size may be smaller with compression
- Large exports will be faster

### For Developers:

- New format version: `2.0.0`
- Format identifier: `zip-jsonl`
- Always load from IndexedDB directly, not stores
- Use progress callbacks for better UX

## ✅ Acceptance Criteria

- [ ] Export không còn bị rỗng (archive và tags được load đúng)
- [ ] Export ra file ZIP với 3 files: settings.json, summaries.jsonl, tags.jsonl
- [ ] JSONL format handle được special characters, quotes, newlines
- [ ] Import hỗ trợ cả ZIP mới và JSON cũ
- [ ] Progress tracking hiển thị đúng cho từng stage
- [ ] Performance OK với 1000+ summaries
- [ ] Error handling robust (corrupted files, parse errors)
- [ ] UI messages clear và helpful

## 🚀 Implementation Order

1. ✅ Cài JSZip dependency
2. ⏳ Tạo JSONL service
3. ⏳ Tạo ZIP service
4. ⏳ Tạo Export service
5. ⏳ Update ExportImport component
6. ⏳ Testing với various scenarios
7. ⏳ Documentation và release notes

## 📌 Notes

- Sử dụng `JSON.stringify()` built-in → tự động escape mọi ký tự đặc biệt
- JSONL: 1 line = 1 record → dễ streaming và error recovery
- ZIP compression level 6 → balance giữa speed và size
- Backward compatibility: detect format và handle accordingly
- Always validate data sau khi import

---

**Created:** 2025-10-20  
**Author:** Kilo Code (Architect Mode)  
**Status:** Ready for Implementation
