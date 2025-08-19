# Floating Panel Storage: Message Passing Solution Plan

## Vấn đề hiện tại

FloatingPanel chạy trong content script (shadow DOM của trang web), dẫn đến IndexedDB được lưu trữ trong context của trang web (ví dụ: youtube.com) thay vì extension. Điều này gây ra:

- **Dữ liệu bị phân tán**: Mỗi trang web có IndexedDB riêng
- **Không thể truy cập**: Archive page không đọc được dữ liệu từ content script
- **Dữ liệu không bền vững**: Có thể bị mất khi xóa dữ liệu trang web

## Giải pháp: Message Passing System

Thay vì tạo lại hệ thống storage, chúng ta sẽ sử dụng message passing để:

1. **FloatingPanel (content script)** → gửi dữ liệu qua message
2. **Background script** → nhận message và gọi các hàm có sẵn trong `indexedDBService.js`
3. **Archive page** → tiếp tục sử dụng `indexedDBService.js` như hiện tại

## Kiến trúc mới

```
FloatingPanel (Content) ──message──> Background Script ──call──> indexedDBService.js ──save──> Extension IndexedDB
                                                                          ↑
Archive Page ──────────────────────────────direct call──────────────────┘
```

## Implementation Plan

### Phase 1: Background Script Message Handlers

**File cần sửa:** `src/entrypoints/background.js`

**Thêm message types mới:**

```javascript
// Storage operations
SAVE_TO_HISTORY: 'SAVE_TO_HISTORY'
SAVE_TO_ARCHIVE: 'SAVE_TO_ARCHIVE'
GET_HISTORY: 'GET_HISTORY'
GET_ARCHIVE: 'GET_ARCHIVE'
UPDATE_HISTORY_ARCHIVED_STATUS: 'UPDATE_HISTORY_ARCHIVED_STATUS'
```

**Message structure:**

```javascript
{
  type: 'SAVE_TO_HISTORY',
  payload: {
    historyData: {
      id: '...',
      title: '...',
      url: '...',
      date: '...',
      summaries: [...],
      isArchived: false
    }
  }
}
```

### Phase 2: Update FloatingPanelStorageService

**File cần sửa:** `src/entrypoints/content/services/FloatingPanelStorageService.js`

**Thay đổi:**

- Xóa import `indexedDBService`
- Thêm function `sendStorageMessage()` để gửi messages
- Cập nhật `saveToHistory()` và `saveToArchive()` để sử dụng message passing

**Ví dụ implementation:**

```javascript
async function sendStorageMessage(type, payload) {
  try {
    const response = await browser.runtime.sendMessage({
      type,
      payload,
    })
    return response
  } catch (error) {
    console.error('[FPStorageService] Message failed:', error)
    throw error
  }
}

export async function saveToHistory(localState, pageInfo) {
  const summaries = prepareSummaries(localState, localState.contentType)

  if (summaries.length === 0) {
    console.warn('[FPStorageService] No summary content to save to history.')
    return null
  }

  const historyEntry = {
    id: generateUUID(),
    title: pageInfo.title,
    url: pageInfo.url,
    date: new Date().toISOString(),
    summaries: summaries,
    isArchived: false,
  }

  try {
    const response = await sendStorageMessage('SAVE_TO_HISTORY', {
      historyData: historyEntry,
    })

    if (response && response.success) {
      console.log('[FPStorageService] Saved to History:', historyEntry)
      return historyEntry.id
    } else {
      throw new Error(response.error || 'Failed to save to history')
    }
  } catch (error) {
    console.error('[FPStorageService] Error saving to History:', error)
    throw error
  }
}
```

### Phase 3: Background Script Implementation

**Thêm vào `browser.runtime.onMessage.addListener`:**

```javascript
// Import indexedDBService at top
import {
  addHistory,
  addSummary,
  updateHistoryArchivedStatus,
  getAllHistory,
  getAllSummaries,
} from '@/lib/db/indexedDBService.js'

// Inside message listener
if (message.type === 'SAVE_TO_HISTORY') {
  try {
    const result = await addHistory(message.payload.historyData)
    sendResponse({ success: true, result })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
  return true
}

if (message.type === 'SAVE_TO_ARCHIVE') {
  try {
    const result = await addSummary(message.payload.summaryData)

    // Update history archived status if needed
    if (message.payload.historySourceId) {
      await updateHistoryArchivedStatus(message.payload.historySourceId, true)
    }

    sendResponse({ success: true, result })
  } catch (error) {
    sendResponse({ success: false, error: error.message })
  }
  return true
}
```

### Phase 4: Error Handling & Validation

**Error scenarios to handle:**

- Background script không available
- Message timeout
- IndexedDB errors
- Invalid data format

**Fallback strategies:**

- Retry mechanism
- Local storage backup (temporary)
- User notification

### Phase 5: Testing Strategy

1. **Unit Tests:**

   - Message formatting
   - Error handling
   - Data validation

2. **Integration Tests:**

   - FloatingPanel → Background → IndexedDB flow
   - Archive page reading data
   - Cross-context data consistency

3. **Manual Testing:**
   - Test trên multiple tabs
   - Test khi background script restart
   - Test khi extension reload

## Files cần thay đổi

1. ✅ **`src/entrypoints/background.js`**

   - Thêm message handlers cho storage operations
   - Import indexedDBService
   - Implement error handling

2. ✅ **`src/entrypoints/content/services/FloatingPanelStorageService.js`**

   - Thay thế IndexedDB calls bằng message passing
   - Thêm error handling và retry logic

3. ⚠️ **`src/lib/db/indexedDBService.js`** (Optional)
   - Có thể cần thêm validation hoặc error handling
   - Không thay đổi API hiện có

## Migration Strategy

Không cần migration phức tạp vì:

- Archive page vẫn sử dụng extension IndexedDB
- FloatingPanel data sẽ bắt đầu lưu vào đúng nơi
- Dữ liệu cũ ở trang web sẽ tự nhiên bị bỏ qua

## Benefits của giải pháp này

✅ **Đơn giản**: Tái sử dụng code hiện có  
✅ **Ít rủi ro**: Ít thay đổi, dễ rollback  
✅ **Tập trung**: Tất cả dữ liệu ở extension IndexedDB  
✅ **Backward compatible**: Archive page không cần thay đổi  
✅ **Maintainable**: Logic storage vẫn ở một nơi

## Timeline ước tính

- **Phase 1**: 30 phút (Background handlers)
- **Phase 2**: 45 phút (Update FloatingPanelStorageService)
- **Phase 3**: 30 phút (Integration & testing)
- **Phase 4**: 15 phút (Error handling refinement)

**Total**: ~2 giờ implementation + testing
