# Phân tích và Giải pháp Xử lý Ký tự Đặc biệt trong Summarizer Extension

## Table of Contents

1. [Tổng quan](#tổng-quan)
2. [Phân tích hiện tại](#phân-tích-hiện-tại)
3. [Các ký tự đặc biệt nguy hiểm](#các-ký-tự-đặc-biệt-nguy-hiểm)
4. [Vấn đề tiềm tàng](#vấn-đề-tiem-tàng)
5. [Giải pháp đề xuất](#giải-pháp-đề-xuất)
6. [Kế hoạch triển khai](#kế-hoạch-triển-khai)
7. [Code examples](#code-examples)
8. [Testing strategy](#testing-strategy)
9. [Risk mitigation](#risk-mitigation)

## Tổng quan

Document này phân tích cách xử lý ký tự đặc biệt trong Summarizer extension, xác định các rủi ro tiềm tàng và đề xuất giải pháp để bảo vệ tính toàn vẹn của dữ liệu khi lưu trữ trong IndexedDB và WXT Storage.

## Phân tích hiện tại

### Cấu trúc lưu trữ dữ liệu

#### 1. IndexedDB Storage

Dữ liệu được lưu trữ trong 3 object stores chính:

- **`summaries`**: Lưu trữ các bản tóm tắt đã lưu

  ```javascript
  {
    id: string,
    title: string,
    url: string,
    date: string,
    summaries: Array<{title: string, content: string}>,
    tags: string[],
    historySourceId?: string
  }
  ```

- **`history`**: Lưu trữ lịch sử các bản tóm tắt

  ```javascript
  {
    id: string,
    title: string,
    url: string,
    date: string,
    summaries: Array<{title: string, content: string}>,
    isArchived: boolean
  }
  ```

- **`tags`**: Lưu trữ các thẻ tag
  ```javascript
  {
    id: string,
    name: string,
    createdAt: string
  }
  ```

#### 2. WXT Storage (Browser Storage)

Sử dụng WXT storage wrapper cho browser storage API:

- **`local:settings`**: Lưu trữ cài đặt ứng dụng
- **`local:theme`**: Lưu trữ cài đặt giao diện
- **`local:appState`**: Lưu trữ trạng thái ứng dụng

### Cơ chế xử lý dữ liệu hiện tại

#### Trong IndexedDB:

- Dữ liệu được lưu trữ trực tiếp mà không có encoding hoặc escape đặc biệt
- JSON serialization/deserialization được thực hiện tự động bởi IndexedDB
- Không có validation cho ký tự đặc biệt trong hầu hết các trường

#### Trong WXT Storage:

- Sử dụng JSON.stringify/parse để chuyển đổi dữ liệu:
  ```javascript
  // Trong settingsStore.svelte.js
  await settingsStorage.setValue(JSON.parse(JSON.stringify(updatedSettings)))
  ```
- Conversion từ Svelte Proxy sang plain object để tránh DataCloneError

#### Validation hiện tại:

- Chỉ có validation cho tag names trong `TagManagement.svelte`:
  ```javascript
  if (/[<>]/.test(trimmedName)) {
    return {
      valid: false,
      error: 'Tag name cannot contain < or > characters',
    }
  }
  ```
- Không có validation cho nội dung summaries, titles, hoặc URLs

## Các ký tự đặc biệt nguy hiểm

### 1. Trong tên tags:

- **HTML tags**: `<`, `>` - Có thể gây ra XSS hoặc phá vỡ cấu trúc HTML
- **Quotes**: `"`, `'` - Có thể gây ra vấn đề khi lưu trữ JSON
- **Backslash**: `\` - Có thể gây ra vấn đề với escape sequences
- **Control characters**: Newline (`\n`), Tab (`\t`), Carriage return (`\r`)
- **Unicode special characters**: Các ký tự có thể gây ra vấn đề với encoding
- **Null character**: `\0` - Có thể gây ra vấn đề với chuỗi trong JavaScript

### 2. Trong nội dung summaries:

- **HTML entities**: `&`, `<`, `>`, etc.
- **Markdown special characters**: `*`, `_`, `#`, `` ` ``, `[]`, `()`
- **Mathematical symbols**: Các ký tự toán học đặc biệt
- **Emoji và các ký tự Unicode phức tạp**

### 3. Trong URLs và titles:

- **URL-encoded characters**: `%20`, `%2F`, etc.
- **Special URL characters**: `?`, `&`, `=`, `#`, `/`, `\`
- **International domain names**: Punycode encoding

## Vấn đề tiềm tàng

### 1. Control characters

Có thể làm hỏng JSON structure và gây ra lỗi khi serialize/deserialize:

```javascript
// Ví dụ: Null byte trong string
const problematicString = 'Hello\0World'
JSON.stringify(problematicString) // Có thể gây ra vấn đề
```

### 2. HTML injection

Nếu không được escape properly, có thể gây ra XSS attacks:

```javascript
// Ví dụ: Tag name chứa HTML
const maliciousTag = "<script>alert('xss')</script>"
```

### 3. Data corruption

Các ký tự đặc biệt có thể làm hỏng cấu trúc dữ liệu:

```javascript
// Ví dụ: Unmatched quotes trong JSON
const problematicData = {
  title: 'Unclosed quote,
  content: 'Some content'
};
```

### 4. Encoding issues

Unicode characters có thể gây ra vấn đề với encoding/decoding:

```javascript
// Ví dụ: Complex Unicode characters
const complexUnicode = '🔥🚀✨'
```

## Giải pháp đề xuất

### 1. Tạo utility functions cho việc sanitize và validate dữ liệu

#### File: `src/lib/utils/dataSanitizer.js`

```javascript
/**
 * Sanitize string để loại bỏ các ký tự nguy hiểm
 */
export function sanitizeString(input, options = {}) {
  if (typeof input !== 'string') return input

  const {
    allowHTML = false,
    allowControlChars = false,
    allowNullBytes = false,
    maxLength = null,
  } = options

  let sanitized = input

  // Remove null bytes
  if (!allowNullBytes) {
    sanitized = sanitized.replace(/\0/g, '')
  }

  // Remove/replace control characters except newlines and tabs
  if (!allowControlChars) {
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  }

  // Escape HTML characters if needed
  if (!allowHTML) {
    sanitized = sanitized
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;')
  }

  // Trim to max length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  return sanitized
}

/**
 * Validate và sanitize tag names
 */
export function sanitizeTagName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Tag name must be a string' }
  }

  const trimmedName = name.trim()

  if (trimmedName.length === 0) {
    return { valid: false, error: 'Tag name cannot be empty' }
  }

  if (trimmedName.length > 50) {
    return { valid: false, error: 'Tag name must be 50 characters or less' }
  }

  // Check for dangerous characters
  if (/[<>]/.test(trimmedName)) {
    return { valid: false, error: 'Tag name cannot contain < or > characters' }
  }

  // Additional checks for control characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmedName)) {
    return { valid: false, error: 'Tag name contains invalid characters' }
  }

  return {
    valid: true,
    name: sanitizeString(trimmedName, {
      allowHTML: false,
      allowControlChars: false,
      allowNullBytes: false,
    }),
  }
}

/**
 * Sanitize URLs
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return url

  try {
    // Decode URL components first
    const decoded = decodeURIComponent(url)

    // Re-encode to ensure proper encoding
    return encodeURI(decoded)
  } catch (error) {
    // If decoding fails, return original
    return url
  }
}

/**
 * Safe JSON stringify that handles special characters
 */
export function safeJSONStringify(obj) {
  try {
    // Replace control characters before stringifying
    const jsonString = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'string') {
        return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      }
      return value
    })

    return jsonString
  } catch (error) {
    console.error('Error stringifying object:', error)
    return '{}'
  }
}

/**
 * Safe JSON parse that handles special characters
 */
export function safeJSONParse(jsonString) {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return null
  }
}

/**
 * Validate text input with common rules
 */
export function validateTextInput(value, options = {}) {
  const {
    required = true,
    maxLength = null,
    allowHTML = false,
    fieldName = 'Field',
  } = options

  if (required && (!value || value.trim() === '')) {
    return { valid: false, error: `${fieldName} is required` }
  }

  if (maxLength && value.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must be ${maxLength} characters or less`,
    }
  }

  if (!allowHTML && /[<>]/.test(value)) {
    return {
      valid: false,
      error: `${fieldName} cannot contain < or > characters`,
    }
  }

  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
    return { valid: false, error: `${fieldName} contains invalid characters` }
  }

  return { valid: true, value: sanitizeString(value, options) }
}
```

### 2. Cập nhật IndexedDB service

#### Trong `src/lib/db/indexedDBService.js`:

```javascript
import {
  sanitizeString,
  safeJSONStringify,
  sanitizeTagName,
  sanitizeUrl,
} from '@/lib/utils/dataSanitizer.js'

// Cập nhật hàm addTag
async function addTag(name) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)

    // Validate and sanitize tag name
    const validation = sanitizeTagName(name)
    if (!validation.valid) {
      reject(new Error(validation.error))
      return
    }

    const newTag = {
      id: generateUUID(),
      name: validation.name,
      createdAt: new Date().toISOString(),
    }
    const request = objectStore.add(newTag)
    request.onsuccess = () => resolve(newTag)
    request.onerror = (event) => {
      console.error('Error adding tag:', event.target.error)
      reject(event.target.error)
    }
  })
}

// Cập nhật hàm addSummary
async function addSummary(summaryData) {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)

    // Sanitize data
    const sanitizedData = {
      ...summaryData,
      title: sanitizeString(summaryData.title, {
        allowHTML: false,
        maxLength: 500,
      }),
      url: sanitizeUrl(summaryData.url),
      summaries:
        summaryData.summaries?.map((s) => ({
          ...s,
          title: sanitizeString(s.title, { allowHTML: false, maxLength: 100 }),
          content: sanitizeString(s.content, {
            allowHTML: true,
            maxLength: 100000,
          }),
        })) || [],
    }

    const newSummary = {
      ...sanitizedData,
      id: generateUUID(),
      tags: sanitizedData.tags || [],
    }

    const request = objectStore.add(newSummary)
    request.onsuccess = () => resolve(newSummary.id)
    request.onerror = (event) => reject(event.target.error)
  })
}

// Tương tự cho addHistory, updateSummary, updateHistory
```

### 3. Cập nhật Settings Store

#### Trong `src/stores/settingsStore.svelte.js`:

```javascript
import { safeJSONStringify, safeJSONParse } from '@/lib/utils/dataSanitizer.js'

// Cập nhật hàm updateSettings
export async function updateSettings(newSettings) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  const updatedSettings = { ...settings, ...newSettings }
  Object.assign(settings, updatedSettings)

  if (newSettings.uiLang) {
    locale.set(newSettings.uiLang)
  }

  try {
    // Sử dụng safe JSON stringify
    const serializedSettings = safeJSONStringify(updatedSettings)
    await settingsStorage.setValue(safeJSONParse(serializedSettings))
  } catch (error) {
    console.error('[settingsStore] Error saving settings:', error)
  }
}
```

### 4. Cập nhật Tag Management Component

#### Trong `src/components/displays/archive/TagManagement.svelte`:

```javascript
import { sanitizeTagName } from '@/lib/utils/dataSanitizer.js'

// Thay thế hàm validateTagName hiện tại
function validateTagName(name) {
  return sanitizeTagName(name)
}
```

## Kế hoạch triển khai

### Phase 1: Foundation (Priority: High)

1. **Tạo utility module cho data sanitization**

   - File: `src/lib/utils/dataSanitizer.js`
   - Implement các hàm sanitize và validate cơ bản
   - Add unit tests cho các hàm này

2. **Cập nhật Tag Management**
   - Cập nhật `TagManagement.svelte` để sử dụng sanitizer
   - Cập nhật `indexedDBService.js` hàm `addTag` và `updateTag`
   - Test với các ký tự đặc biệt trong tag names

### Phase 2: Core Data Protection (Priority: High)

1. **Cập nhật IndexedDB operations**

   - Modify `addSummary`, `addHistory` functions
   - Add sanitization cho titles, URLs, và content
   - Implement error handling cho invalid data

2. **Cập nhật Settings Storage**
   - Modify `settingsStore.svelte.js` để sử dụng safe JSON operations
   - Add validation cho các setting values
   - Test với các ký tự đặc biệt trong settings

### Phase 3: Input Validation (Priority: Medium)

1. **Update các input components**

   - Add validation cho `TextInput.svelte`
   - Create validation utilities cho forms
   - Implement real-time validation feedback

2. **Update modal components**
   - Add validation cho `AssignTagsModal.svelte`
   - Update các modal khác nếu cần

### Phase 4: Enhanced Protection (Priority: Medium)

1. **Implement data migration**

   - Script để clean existing data trong IndexedDB
   - Validate existing tags và summaries
   - Handle migration gracefully

2. **Add error reporting**
   - Implement logging cho validation errors
   - Add user feedback cho invalid inputs
   - Create error recovery mechanisms

### Phase 5: Testing & Documentation (Priority: Low)

1. **Comprehensive testing**

   - Test với variety của special characters
   - Test edge cases (very long strings, null bytes, etc.)
   - Performance testing cho sanitization operations

2. **Documentation**
   - Document các rules validation
   - Create developer guidelines cho data handling
   - Update code comments

## Code examples

### Example 1: Sanitizing tag names

```javascript
// Before (vulnerable)
function addTag(name) {
  const newTag = {
    id: generateUUID(),
    name: name.trim(), // Chỉ trim, không có validation
    createdAt: new Date().toISOString(),
  }
  // ... save to DB
}

// After (secure)
import { sanitizeTagName } from '@/lib/utils/dataSanitizer.js'

function addTag(name) {
  const validation = sanitizeTagName(name)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const newTag = {
    id: generateUUID(),
    name: validation.name, // Đã được sanitize
    createdAt: new Date().toISOString(),
  }
  // ... save to DB
}
```

### Example 2: Safe JSON operations

```javascript
// Before (vulnerable)
async function updateSettings(newSettings) {
  const updatedSettings = { ...settings, ...newSettings }
  await settingsStorage.setValue(JSON.parse(JSON.stringify(updatedSettings)))
}

// After (secure)
import { safeJSONStringify, safeJSONParse } from '@/lib/utils/dataSanitizer.js'

async function updateSettings(newSettings) {
  const updatedSettings = { ...settings, ...newSettings }
  const serializedSettings = safeJSONStringify(updatedSettings)
  await settingsStorage.setValue(safeJSONParse(serializedSettings))
}
```

### Example 3: Validating text input

```javascript
// Before (no validation)
function handleTextInput(value) {
  // Directly use value without validation
  updateData({ title: value })
}

// After (with validation)
import { validateTextInput } from '@/lib/utils/dataSanitizer.js'

function handleTextInput(value) {
  const validation = validateTextInput(value, {
    required: true,
    maxLength: 100,
    allowHTML: false,
    fieldName: 'Title',
  })

  if (!validation.valid) {
    setError(validation.error)
    return
  }

  updateData({ title: validation.value })
}
```

## Testing strategy

### 1. Unit tests cho sanitizer functions

```javascript
// src/lib/utils/__tests__/dataSanitizer.test.js
import {
  sanitizeString,
  sanitizeTagName,
  sanitizeUrl,
} from '../dataSanitizer.js'

describe('sanitizeString', () => {
  test('removes null bytes', () => {
    expect(sanitizeString('test\0string')).toBe('teststring')
  })

  test('escapes HTML characters', () => {
    expect(
      sanitizeString('<script>alert("xss")</script>', { allowHTML: false })
    ).toBe('<script>alert("xss")</script>')
  })

  test('removes control characters', () => {
    expect(sanitizeString('test\x01string')).toBe('teststring')
  })
})

describe('sanitizeTagName', () => {
  test('validates tag names correctly', () => {
    expect(sanitizeTagName('valid-tag').valid).toBe(true)
    expect(sanitizeTagName('<invalid>').valid).toBe(false)
    expect(sanitizeTagName('').valid).toBe(false)
  })
})
```

### 2. Integration tests cho database operations

```javascript
// src/lib/db/__tests__/indexedDB.test.js
import { addTag, addSummary } from '../indexedDBService.js'

describe('IndexedDB operations with special characters', () => {
  test('addTag rejects invalid characters', async () => {
    await expect(addTag('<script>')).rejects.toThrow()
  })

  test('addSummary sanitizes content', async () => {
    const summary = {
      title: '<script>alert("xss")</script>',
      url: 'https://example.com',
      summaries: [{ title: 'Test', content: 'Content with null\0byte' }],
    }

    const id = await addSummary(summary)
    const saved = await getSummaryById(id)

    expect(saved.title).not.toContain('<script>')
    expect(saved.summaries[0].content).not.toContain('\0')
  })
})
```

### 3. End-to-end tests

```javascript
// e2e/special-characters.spec.js
import { test, expect } from '@playwright/test'

test('handles special characters in tag names', async ({ page }) => {
  await page.goto('/')

  // Try to create tag with special characters
  await page.fill('[data-testid="tag-input"]', '<script>alert("xss")</script>')
  await page.click('[data-testid="create-tag"]')

  // Should show error message
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible()

  // Try with valid tag
  await page.fill('[data-testid="tag-input"]', 'valid-tag')
  await page.click('[data-testid="create-tag"]')

  // Should create successfully
  await expect(page.locator('[data-testid="tag-list"]')).toContainText(
    'valid-tag'
  )
})
```

## Risk mitigation

### 1. Backward compatibility

- Ensure existing data remains accessible
- Implement graceful degradation for invalid existing data
- Provide migration path for corrupted data

### 2. Performance considerations

- Sanitization operations should be optimized
- Cache sanitized results when appropriate
- Avoid unnecessary sanitization for trusted data

### 3. Data integrity

- Ensure sanitization doesn't corrupt legitimate content
- Preserve original meaning where possible
- Provide preview before sanitization changes

### 4. User experience

- Clear error messages for invalid inputs
- Helpful suggestions for fixing validation errors
- Non-blocking validation where possible

### 5. Security considerations

- Defense in depth approach
- Multiple layers of validation
- Regular security updates for known vulnerabilities

## Success criteria

1. **No data corruption** from special characters
2. **Clear error messages** for invalid inputs
3. **Existing data continues** to work
4. **No performance degradation**
5. **Comprehensive test coverage**
6. **Documentation updated**
7. **Security vulnerabilities** addressed

## Conclusion

Việc implement proper sanitization và validation cho special characters là crucial cho:

- Bảo vệ tính toàn vẹn của dữ liệu
- Ngăn chận security vulnerabilities
- Cải thiện stability của ứng dụng
- Đảm bảo user experience tốt

Kế hoạch triển khai này cung cấp một approach có cấu trúc để address vấn đề một cách thorough mà không disrupt existing functionality.
