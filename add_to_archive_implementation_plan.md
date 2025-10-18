# Kế hoạch triển khai nút "Add to Archive"

## Mô tả

Thêm nút "Add to Archive" vào menu của item history trong SidePanel.svelte. Nút này sẽ chỉ hiển thị khi activeTab là 'history' và sẽ chuyển item từ history sang archive, đồng thời đánh dấu item trong history là đã archived.

## Các thay đổi cần thực hiện

### 1. Cập nhật ActionDropdownMenu.svelte

- Thêm prop mới `onAddToArchive` vào component
- Thêm nút "Add to Archive" vào menu dropdown khi `activeTab === 'history'`
- Sử dụng icon phù hợp cho nút "Add to Archive"

### 2. Cập nhật SidePanel.svelte

- Tạo hàm `handleAddToArchive` để xử lý việc chuyển item từ history sang archive
- Hàm này sẽ:
  - Gọi hàm `moveHistoryItemToArchive` từ indexedDBService
  - Cập nhật lại danh sách sau khi chuyển
  - Hiển thị thông báo thành công hoặc lỗi
- Truyền hàm `handleAddToArchive` vào ActionDropdownMenu qua prop `onAddToArchive`

### 3. Chi tiết triển khai

#### ActionDropdownMenu.svelte

```javascript
// Thêm prop mới
let {
  item,
  activeTab,
  isConfirmingDelete,
  deleteCandidateId,
  onAssignTags,
  onRename,
  onDeleteClick,
  onAddToArchive, // Prop mới
} = $props()
```

```html
<!-- Thêm nút Add to Archive khi activeTab là history -->
{#if activeTab === 'history'}
  <DropdownMenu.Item
    class="px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm"
    onSelect={() => onAddToArchive(item)}
  >
    <Icon icon="tabler:archive" width="18" height="18" />
    <span>Add to Archive</span>
  </DropdownMenu.Item>
{/if}
```

#### SidePanel.svelte

```javascript
// Thêm hàm xử lý
async function handleAddToArchive(item) {
  try {
    // Import hàm từ indexedDBService
    const { moveHistoryItemToArchive } = await import(
      '@/lib/db/indexedDBService.js'
    )

    // Chuyển item từ history sang archive
    await moveHistoryItemToArchive(item.id)

    // Làm mới danh sách
    await refreshSummaries()

    // Invalidate tags cache
    const { invalidateTagsCache } = await import(
      '@/stores/tagsCacheStore.svelte.js'
    )
    invalidateTagsCache()

    console.log('Item added to archive successfully')
  } catch (error) {
    console.error('Error adding item to archive:', error)
  }
}
```

```html
<!-- Cập nhật ActionDropdownMenu để truyền prop mới -->
<ActionDropdownMenu
  {item}
  {activeTab}
  {isConfirmingDelete}
  {deleteCandidateId}
  onAssignTags="{openAssignTagsModal}"
  onRename="{openRenameDialog}"
  onDeleteClick="{handleDeleteClick}"
  onAddToArchive="{handleAddToArchive}"
  <!--
  Prop
  mới
  --
>
  /></ActionDropdownMenu
>
```

## Lưu ý

- Hàm `moveHistoryItemToArchive` đã có sẵn trong indexedDBService.js
- Hàm này sẽ tự động đánh dấu item trong history là đã archived
- Sau khi chuyển, cần làm mới danh sách để hiển thị thay đổi
- Cần invalidate tags cache để cập nhật số lượng tag nếu cần

## Thứ tự thực hiện

1. Cập nhật ActionDropdownMenu.svelte
2. Cập nhật SidePanel.svelte
3. Kiểm tra chức năng
