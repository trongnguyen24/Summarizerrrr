# Kế hoạch triển khai hàm đếm dữ liệu

## 1. Tạo các hàm đếm trong indexedDBService.js

### 1.1. Hàm getHistoryCount()

```javascript
async function getHistoryCount() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(HISTORY_STORE_NAME)
    const request = objectStore.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = (event) => reject(event.target.error)
  })
}
```

### 1.2. Hàm getTagsCount()

```javascript
async function getTagsCount() {
  if (!db) db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([TAGS_STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(TAGS_STORE_NAME)
    const request = objectStore.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = (event) => reject(event.target.error)
  })
}
```

### 1.3. Hàm getDataCounts() để lấy tất cả số liệu cùng lúc

```javascript
async function getDataCounts() {
  try {
    const [summariesCount, historyCount, tagsCount] = await Promise.all([
      getSummaryCount(),
      getHistoryCount(),
      getTagsCount(),
    ])

    return {
      summaries: summariesCount,
      history: historyCount,
      tags: tagsCount,
    }
  } catch (error) {
    console.error('Error getting data counts:', error)
    return {
      summaries: 0,
      history: 0,
      tags: 0,
    }
  }
}
```

### 1.4. Cập nhật exports

Thêm các hàm mới vào phần export ở cuối file:

```javascript
export {
  // ... existing exports
  getHistoryCount,
  getTagsCount,
  getDataCounts,
}
```

## 2. Cập nhật component ExportImport.svelte

### 2.1. Import các hàm mới

```javascript
import {
  // ... existing imports
  getSummaryCount,
  getHistoryCount,
  getTagsCount,
  getDataCounts,
} from '../../lib/db/indexedDBService.js'
```

### 2.2. Thêm state cho số liệu hiện tại

```javascript
let dataCounts = $state({
  history: 0,
  archives: 0,
  tags: 0,
  isLoading: true,
})
```

### 2.3. Tạo hàm để tải số liệu

```javascript
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
```

### 2.4. Cập nhật UI để hiển thị số liệu động

Thay thế các giá trị hardcode trong phần preview:

```html
<div class="flex justify-between">
  <div class="text-text-secondary text-xs">History</div>
  <div class="text-text-primary font-medium">
    {dataCounts.isLoading ? '...' : dataCounts.history}
  </div>
</div>
<div class="flex justify-between">
  <div class="text-text-secondary text-xs">Archives</div>
  <div class="text-text-primary font-medium">
    {dataCounts.isLoading ? '...' : dataCounts.archives}
  </div>
</div>
<div class="flex justify-between">
  <div class="text-text-secondary text-xs">Tags</div>
  <div class="text-text-primary font-medium">
    {dataCounts.isLoading ? '...' : dataCounts.tags}
  </div>
</div>
```

### 2.5. Thêm effect để tải dữ liệu khi component mount

```javascript
$effect(() => {
  loadDataCounts()
})
```

### 2.6. Cập nhật số liệu sau khi import/export

Thêm gọi `loadDataCounts()` trong các hàm:

- Sau khi `exportData()` thành công
- Sau khi `executeImport()` thành công

## 3. Tối ưu hiệu năng

### 3.1. Sử dụng cache

- Thêm timestamp để tránh gọi database quá nhiều lần
- Chỉ tải lại khi cần thiết (sau khi import/export)

### 3.2. Sử dụng Promise.all()

- Đã triển khai trong `getDataCounts()` để gọi các hàm đếm song song

## 4. Xử lý lỗi

### 4.1. Xử lý lỗi khi database không khả dụng

- Hiển thị giá trị mặc định (0) khi có lỗi
- Log lỗi để debug

### 4.2. Xử lý loading state

- Hiển thị "..." hoặc spinner khi đang tải
- Tránh giật UI khi dữ liệu đang tải

## 5. Testing

### 5.1. Test cases

- Component hiển thị đúng số liệu khi có dữ liệu
- Component hiển thị 0 khi không có dữ liệu
- Component hiển thị loading state khi đang tải
- Số liệu cập nhật sau khi import/export
- Xử lý lỗi khi database không khả dụng

### 5.2. Manual testing

- Mở component ExportImport
- Kiểm tra số liệu hiển thị
- Import/export dữ liệu
- Kiểm tra số liệu cập nhật
