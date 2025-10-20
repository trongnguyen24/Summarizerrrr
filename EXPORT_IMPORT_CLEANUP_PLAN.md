# Kế Hoạch Dọn Dẹp Tính Năng Export/Import

> **Mục tiêu:** Dọn dẹp toàn diện code, loại bỏ tính năng smart merge phức tạp, cải thiện performance và maintainability.

**File:** [`src/components/settings/ExportImport.svelte`](src/components/settings/ExportImport.svelte)

**Ngày tạo:** 2025-10-20

---

## 📋 Tổng Quan

### Vấn Đề Hiện Tại

1. **Smart merge feature không hoạt động** và quá phức tạp cho use case hiện tại
2. **Code duplication** trong validation và parsing logic
3. **10+ local state variables** khó quản lý
4. **Performance issues** với large datasets
5. **Unused code và dependencies** làm code khó maintain

### Giải Pháp

- **Loại bỏ hoàn toàn** smart merge, conflict resolution
- **Simplify** chỉ còn 2 merge modes: **merge** và **replace**
- **Consolidate** duplicate code
- **Optimize** cho large datasets với batch processing
- **Clean up** unused code và dependencies

---

## 🎯 Kế Hoạch Thực Hiện (5 Phases)

### **Phase 1: Loại Bỏ Smart Merge & Conflict Resolution** 🗑️

#### **1.1 Remove ConflictResolution Component Usage**

**Files to modify:**

- [`src/components/settings/ExportImport.svelte`](src/components/settings/ExportImport.svelte)

**Changes:**

```javascript
// ❌ REMOVE these state variables (Lines 49, 53-55)
let showConflictModal = false
let conflicts = null
let mergeSession = null

// ❌ REMOVE these imports (Lines 30, 24, 29)
import ConflictResolution from './ConflictResolution.svelte'
import { dataIntegrityService } from '../../services/dataIntegrityService.js'
import { smartMergeService } from '../../services/smartMergeService.js'

// ❌ REMOVE conflict resolution option from importOptions (Line 69)
// Before:
importOptions = {
  conflictResolution: 'prompt', // ❌ REMOVE
  mergeMode: 'merge' // ✅ Keep, but simplify
}

// ❌ REMOVE these functions (Lines 584-601)
function handleConflictResolution(event) { ... }
function handleConflictCancel() { ... }

// ❌ REMOVE ConflictResolution component from template (Lines 842-848)
<ConflictResolution ... />
```

#### **1.2 Simplify Merge Modes**

**Update importOptions:**

```javascript
// Simplified import options
let importOptions = {
  dataTypes: {
    settings: true,
    theme: true,
    archive: true,
    tags: true,
  },
  mergeMode: 'merge', // 'merge' or 'replace' only
  autoBackup: true,
}
```

**Update startImport() function (Lines 390-451):**

```javascript
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

    // ✅ SIMPLIFIED: No conflict detection, direct import
    const importedData = prepareImportData()
    await executeImport(importedData)
  } catch (error) {
    handleImportError(error, 'import_preparation')
  }
}
```

#### **1.3 Simplify executeImport()**

**Update executeImport() (Lines 483-549):**

```javascript
// ✅ SIMPLIFIED: Remove smart merge logic
async function executeImport(importedData) {
  try {
    showProgressModal = true

    // Direct simple import, no smart merge
    await performSimpleImport(importedData)

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
    handleImportError(error, 'import_execution')
  }
}
```

---

### **Phase 2: Consolidate Duplicate Code** 🔄

#### **2.1 Extract Common File Processing Logic**

**Create new helper function:**

```javascript
/**
 * Process imported file regardless of format (ZIP or JSON)
 * @param {File} file - File to process
 * @returns {Promise<Object>} Parsed data
 */
async function processImportFile(file) {
  try {
    progressData.stage = 'detecting'
    progressData.progress = 10
    progressData.message = 'Detecting file format...'

    const isZip = await isZipFile(file)
    const data = isZip
      ? await parseZipFile(file)
      : await parseLegacyJsonFile(file)

    // Common validation
    validateImportedData(data)

    return data
  } catch (error) {
    throw new Error(`Failed to process file: ${error.message}`)
  }
}

/**
 * Parse ZIP file
 */
async function parseZipFile(file) {
  progressData.stage = 'extracting'
  progressData.progress = 20
  progressData.message = 'Extracting ZIP file...'

  const files = await extractFilesFromZip(file)
  const data = {}

  // Parse settings.json
  if (files['settings.json']) {
    data.settings = JSON.parse(files['settings.json'])
  }

  // Parse summaries.jsonl
  if (files['summaries.jsonl']) {
    const result = importFromJsonl(files['summaries.jsonl'])
    data.summaries = result.data
    if (result.errors) {
      console.warn('[ExportImport] JSONL parse errors:', result.errors)
    }
  }

  // Parse tags.jsonl
  if (files['tags.jsonl']) {
    const result = importFromJsonl(files['tags.jsonl'])
    data.tags = result.data
    if (result.errors) {
      console.warn('[ExportImport] JSONL parse errors:', result.errors)
    }
  }

  return data
}

/**
 * Parse legacy JSON file
 */
async function parseLegacyJsonFile(file) {
  progressData.stage = 'validating'
  progressData.progress = 20
  progressData.message = 'Validating file format...'

  const validation = await validateImportFile(file)
  if (!validation.valid) {
    throw new Error('File validation failed')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        resolve(data)
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error.message}`))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Validate imported data structure
 */
function validateImportedData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data structure')
  }

  const hasValidData = [
    'settings',
    'summaries',
    'tags',
    'archive',
    'theme',
    'themes',
  ].some((key) => data[key] !== undefined)

  if (!hasValidData) {
    throw new Error('No valid data found in file')
  }
}
```

**Update handleFileSelect() to use new helper:**

```javascript
async function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    showProgressModal = true
    progressData = {
      stage: 'detecting',
      progress: 0,
      total: 100,
      message: 'Processing file...',
      errors: [],
    }

    // ✅ Use consolidated function
    const data = await processImportFile(file)

    // Store data and update available types
    importData = data
    updateAvailableDataTypes(data)

    progressData.stage = 'completed'
    progressData.progress = 100
    progressData.message = 'File processed successfully'

    setTimeout(() => {
      showProgressModal = false
      showImportModal = true
    }, 1000)
  } catch (error) {
    handleImportError(error, 'file_processing')
  }
}

/**
 * Update available data types based on imported data
 */
function updateAvailableDataTypes(data) {
  importOptions.dataTypes = {
    settings: !!data.settings,
    theme: !!(data.theme || data.themes),
    archive: !!(data.archive || data.summaries),
    tags: !!data.tags,
  }
}
```

#### **2.2 Remove Duplicate Code**

**Delete these duplicate sections:**

```javascript
// ❌ DELETE Lines 204-310: handleZipImport()
// ❌ DELETE Lines 313-387: handleLegacyJsonImport()
// ✅ Both replaced by processImportFile()

// ❌ DELETE duplicate dataTypes mapping logic
// Lines 287-296 and 354-363
// ✅ Replaced by updateAvailableDataTypes()
```

---

### **Phase 3: Refactor State Management** 🏗️

#### **3.1 Group Related States**

**Replace scattered states with grouped objects:**

```javascript
// ✅ Before: 10+ individual states
// ❌ After: 3 grouped states

// Import-related state
let importState = {
  data: null,
  backupId: null,
  availableTypes: [],
  options: {
    dataTypes: {
      settings: true,
      theme: true,
      archive: true,
      tags: true,
    },
    mergeMode: 'merge',
    autoBackup: true,
  },
}

// UI state
let uiState = {
  showImportModal: false,
  showProgressModal: false,
  successMessage: '',
  errorMessage: '',
}

// Progress state
let progressState = {
  stage: '',
  progress: 0,
  total: 100,
  message: '',
  errors: [],
}
```

**Update references throughout component:**

```javascript
// Old: importData
// New: importState.data

// Old: importOptions.mergeMode
// New: importState.options.mergeMode

// Old: showImportModal
// New: uiState.showImportModal

// Old: progressData.stage
// New: progressState.stage
```

#### **3.2 Remove Unused States**

```javascript
// ❌ DELETE these unused variables
// Line 52: let validationResults = null  // Never read
// Line 55: let mergeSession = null       // Assigned but never used
// Line 82: let availableDataTypes = []   // Redundant with importOptions.dataTypes
```

---

### **Phase 4: Performance Optimization** ⚡

#### **4.1 Add Batch Processing for Large Datasets**

**Create batch processing helper:**

```javascript
/**
 * Process items in batches to avoid blocking UI
 * @param {Array} items - Items to process
 * @param {Function} processFn - Processing function
 * @param {number} batchSize - Items per batch
 */
async function processBatch(items, processFn, batchSize = 100) {
  const totalBatches = Math.ceil(items.length / batchSize)

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await processFn(batch)

    // Update progress
    const currentBatch = Math.floor(i / batchSize) + 1
    progressState.progress = 50 + (currentBatch / totalBatches) * 40
    progressState.message = `Processing: ${currentBatch}/${totalBatches} batches`

    // Yield to UI
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}
```

**Update performSimpleImport() to use batching:**

```javascript
async function performSimpleImport(importedData) {
  progressState.stage = 'importing'
  progressState.progress = 50
  progressState.message = 'Importing data...'

  if (importedData.settings) {
    if (importState.options.mergeMode === 'replace') {
      await updateSettings(importedData.settings)
    } else {
      const mergedSettings = { ...settings, ...importedData.settings }
      await updateSettings(mergedSettings)
    }
  }

  if (importedData.theme) {
    if (importState.options.mergeMode === 'replace') {
      await updateThemeSettings(importedData.theme)
    } else {
      const mergedTheme = { ...themeSettings, ...importedData.theme }
      await updateThemeSettings(mergedTheme)
    }
  }

  // ✅ Use batch processing for summaries
  if (importedData.summaries && importedData.summaries.length > 0) {
    await processBatch(
      importedData.summaries,
      async (batch) => await addMultipleSummaries(batch)
    )
  }

  // ✅ Use batch processing for tags
  if (importedData.tags && importedData.tags.length > 0) {
    await processBatch(
      importedData.tags,
      async (batch) => await addMultipleTags(batch)
    )
  }
}
```

#### **4.2 Optimize JSONL Parsing**

**Add streaming JSONL parser:**

```javascript
/**
 * Parse JSONL with progress updates
 * @param {string} text - JSONL text
 * @param {Function} onProgress - Progress callback
 */
function parseJsonlWithProgress(text, onProgress) {
  const lines = text.split('\n').filter((line) => line.trim())
  const results = []
  const errors = []

  lines.forEach((line, index) => {
    try {
      results.push(JSON.parse(line))

      // Update progress every 100 lines
      if (index % 100 === 0 && onProgress) {
        onProgress({
          current: index + 1,
          total: lines.length,
          percentage: ((index + 1) / lines.length) * 100,
        })
      }
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
```

**Update parseZipFile() to use new parser:**

```javascript
// In parseZipFile():
if (files['summaries.jsonl']) {
  const result = parseJsonlWithProgress(
    files['summaries.jsonl'],
    (progress) => {
      progressState.message = `Parsing summaries: ${progress.percentage.toFixed(
        0
      )}%`
    }
  )
  data.summaries = result.data
  // ...
}
```

---

### **Phase 5: Error Handling & Cleanup** 🧹

#### **5.1 Unified Error Handling**

**Create centralized error handler:**

```javascript
/**
 * Handle import/export errors consistently
 * @param {Error} error - Error object
 * @param {string} context - Error context
 */
function handleImportError(error, context) {
  console.error(`[ExportImport:${context}]`, error)

  progressState.errors.push({
    context,
    message: error.message,
    timestamp: new Date().toISOString(),
  })

  progressState.stage = 'error'
  progressState.message = 'Operation failed'

  // Show error with rollback option if backup exists
  const errorMsg = `${getContextualErrorMessage(context)}: ${error.message}`

  setTimeout(() => {
    showProgressModal = false

    if (importState.backupId && context.startsWith('import')) {
      uiState.errorMessage = `${errorMsg}. Backup created, you can rollback if needed.`
    } else {
      uiState.errorMessage = errorMsg
    }

    setTimeout(() => (uiState.errorMessage = ''), 5000)
  }, 2000)
}

/**
 * Get user-friendly error message based on context
 */
function getContextualErrorMessage(context) {
  const messages = {
    file_processing: 'Failed to process file',
    import_preparation: 'Failed to prepare import',
    import_execution: 'Import failed',
    export_preparation: 'Failed to prepare export',
    export_execution: 'Export failed',
  }
  return messages[context] || 'Operation failed'
}
```

**Replace all try-catch blocks to use handleImportError():**

```javascript
// Example: Update exportData()
async function exportData() {
  try {
    // ... export logic
  } catch (error) {
    handleImportError(error, 'export_execution')
  }
}
```

#### **5.2 Remove Unused Code**

**Delete these unused functions and variables:**

```javascript
// ❌ DELETE Line 150-164: generateExportMetadata()
//    ✅ Metadata now handled in exportService.js

// ❌ DELETE Line 52: let validationResults = null
//    ✅ Never used after assignment

// ❌ DELETE Line 55: let mergeSession = null
//    ✅ Smart merge removed

// ❌ DELETE Line 82: let availableDataTypes = []
//    ✅ Replaced by importState.availableTypes

// ❌ DELETE Lines 584-601: handleConflictResolution(), handleConflictCancel()
//    ✅ Conflict resolution removed

// ❌ DELETE Lines 416-438: Smart merge detection logic
//    ✅ Feature removed
```

#### **5.3 Simplify Import Options UI**

**Update modal template (Lines 782-795):**

```html
<!-- Simplified Merge Mode Selection -->
<div class="mb-6">
  <h3 class="text-lg font-medium mb-3">Import Mode</h3>
  <select
    bind:value="{importState.options.mergeMode}"
    class="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600"
  >
    <option value="merge">Merge with existing data</option>
    <option value="replace">Replace existing data</option>
    <!-- ❌ REMOVED: smart_merge option -->
  </select>
  <p class="text-sm text-gray-500 mt-2">
    {#if importState.options.mergeMode === 'merge'} New data will be added,
    existing data with same ID will be updated {:else} All existing data will be
    removed and replaced with imported data {/if}
  </p>
</div>
```

---

## 📊 Files to Modify

### **Modified Files**

| File                                                                                         | Changes        | Lines Affected     |
| -------------------------------------------------------------------------------------------- | -------------- | ------------------ |
| [`src/components/settings/ExportImport.svelte`](src/components/settings/ExportImport.svelte) | Major refactor | ~400 lines changed |

### **Files to Delete (Optional)**

| File                                                                                                     | Reason                              |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| [`src/components/settings/ConflictResolution.svelte`](src/components/settings/ConflictResolution.svelte) | Conflict resolution feature removed |
| [`src/services/smartMergeService.js`](src/services/smartMergeService.js)                                 | Smart merge feature removed         |

**Note:** Có thể giữ các files này nếu muốn preserve cho future use, nhưng sẽ không được import/sử dụng.

### **Dependencies to Keep**

| Dependency                                                     | Used For                      |
| -------------------------------------------------------------- | ----------------------------- |
| [`dataIntegrityService`](src/services/dataIntegrityService.js) | Backup/rollback functionality |
| [`importValidation`](src/lib/utils/importValidation.js)        | File validation               |
| [`exportService`](src/lib/exportImport/exportService.js)       | Export orchestration          |
| [`zipService`](src/lib/exportImport/zipService.js)             | ZIP handling                  |
| [`jsonlService`](src/lib/exportImport/jsonlService.js)         | JSONL parsing                 |

---

## 📈 Expected Results

### **Code Metrics**

| Metric           | Before | After  | Improvement |
| ---------------- | ------ | ------ | ----------- |
| **Total Lines**  | ~851   | ~550   | ↓ 35%       |
| **Local States** | 12     | 3      | ↓ 75%       |
| **Functions**    | 18     | 12     | ↓ 33%       |
| **Imports**      | 17     | 12     | ↓ 29%       |
| **Complexity**   | High   | Medium | Better      |

### **Performance**

- **Small datasets** (<100 items): No noticeable difference
- **Medium datasets** (100-1000 items): ~30% faster
- **Large datasets** (>1000 items): ~50% faster with batch processing

### **Maintainability**

- ✅ **Easier to understand** - Loại bỏ complex smart merge logic
- ✅ **Fewer bugs** - Ít state và logic phức tạp hơn
- ✅ **Better error handling** - Unified error handler
- ✅ **Cleaner code** - Consolidated duplicate logic

---

## ✅ Testing Checklist

### **Import Tests**

- [ ] Import ZIP file với đầy đủ data (settings, summaries, tags)
- [ ] Import ZIP file với partial data
- [ ] Import legacy JSON file
- [ ] Import large dataset (1000+ summaries)
- [ ] Import với merge mode
- [ ] Import với replace mode
- [ ] Import với auto backup enabled
- [ ] Import với auto backup disabled
- [ ] Rollback sau khi import failed
- [ ] Handle corrupted ZIP file
- [ ] Handle invalid JSON file
- [ ] Handle empty file
- [ ] Handle file quá lớn (>50MB)

### **Export Tests**

- [ ] Export với đầy đủ data
- [ ] Export với no data
- [ ] Export large dataset (1000+ summaries)
- [ ] Verify exported ZIP structure
- [ ] Verify JSONL format
- [ ] Re-import exported file

### **UI/UX Tests**

- [ ] Progress bar updates correctly
- [ ] Error messages hiển thị đúng
- [ ] Success messages hiển thị đúng
- [ ] Modal transitions mượt
- [ ] Cancel import works
- [ ] Rollback button appears when có backup

---

## 🚀 Implementation Order

### **Recommended Sequence**

1. **Phase 1 (1-2 hours):** Remove smart merge & conflict resolution
2. **Phase 2 (2-3 hours):** Consolidate duplicate code
3. **Phase 3 (1 hour):** Refactor state management
4. **Phase 4 (2-3 hours):** Performance optimization
5. **Phase 5 (1-2 hours):** Error handling & cleanup
6. **Testing (2-3 hours):** Comprehensive testing

**Total estimated time:** 9-14 hours

### **Milestones**

- ✅ **Milestone 1:** Smart merge removed, code compiles
- ✅ **Milestone 2:** Duplicate code consolidated, tests pass
- ✅ **Milestone 3:** State management refactored, UI responsive
- ✅ **Milestone 4:** Batch processing works, handles large datasets
- ✅ **Milestone 5:** All tests pass, ready for production

---

## 📝 Notes

### **Breaking Changes**

- **Smart merge mode removed** - Users sẽ chỉ có merge và replace options
- **Conflict resolution UI removed** - Không còn manual conflict resolution

### **Migration Guide**

Không cần migration vì:

- Import/export format không thay đổi (vẫn dùng ZIP + JSONL)
- API compatibility maintained
- Chỉ đơn giản hóa internal logic

### **Future Enhancements**

Nếu sau này cần thêm tính năng:

1. **Selective import** - Cho phép user chọn specific items để import
2. **Import preview** - Hiển thị preview trước khi import
3. **Scheduled exports** - Auto export định kỳ
4. **Cloud sync** - Sync với cloud storage
5. **Import from URL** - Import từ remote file

---

## 🔗 Related Documents

- [`EXPORT_IMPORT_ZIP_IMPLEMENTATION_PLAN.md`](EXPORT_IMPORT_ZIP_IMPLEMENTATION_PLAN.md) - Original ZIP implementation
- [`CLAUDE.md`](CLAUDE.md) - Project overview
- Component documentation trong code

---

**Last Updated:** 2025-10-20  
**Author:** Kilo Code (Architect Mode)  
**Status:** 📋 Planning Complete - Ready for Implementation
