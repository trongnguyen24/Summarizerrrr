# Kế hoạch thêm i18n cho chức năng Tag

## Các key i18n cần thêm vào en.json

```json
{
  "tags": {
    "title": "Tags",
    "assign": "Assign Tags",
    "create": "Create",
    "rename": "Rename",
    "save": "Save",
    "delete": "Delete",
    "loading": "Loading...",
    "all": "All",
    "clear_filters": "Clear Filters",
    "no_tags": "No tags. Create in side panel.",
    "no_archived": "No archived items",
    "no_history": "No history items",
    "actions": "Actions",
    "archived": "Archived",
    "add_to_archive": "Add to Archive",
    "errors": {
      "empty": "Name required",
      "max_length": "Max 50 characters",
      "invalid_chars": "Invalid characters",
      "exists": "Tag exists",
      "create_failed": "Create failed",
      "rename_failed": "Rename failed",
      "delete_failed": "Delete failed"
    }
  }
}
```

## Các key i18n cần thêm vào vi.json

```json
{
  "tags": {
    "title": "Thẻ",
    "assign": "Gán thẻ",
    "create": "Tạo",
    "rename": "Đổi tên",
    "save": "Lưu",
    "delete": "Xóa",
    "loading": "Đang tải...",
    "all": "Tất cả",
    "clear_filters": "Xóa bộ lọc",
    "no_tags": "Chưa có thẻ. Tạo trong thanh bên.",
    "no_archived": "Không có mục lưu trữ",
    "no_history": "Không có mục lịch sử",
    "actions": "Hành động",
    "archived": "Đã lưu trữ",
    "add_to_archive": "Lưu trữ",
    "errors": {
      "empty": "Tên bắt buộc",
      "max_length": "Tối đa 50 ký tự",
      "invalid_chars": "Ký tự không hợp lệ",
      "exists": "Thẻ đã tồn tại",
      "create_failed": "Tạo thất bại",
      "rename_failed": "Đổi tên thất bại",
      "delete_failed": "Xóa thất bại"
    }
  }
}
```

## Các thay đổi cần thực hiện trên các component

### 1. SidePanel.svelte

- Import `t` từ `svelte-i18n`
- Thay thế các chuỗi text hardcode bằng `{t('tags.key')}`
- Các key cần thay đổi:
  - "Assign Tags" → `{t('tags.assign')}`
  - "Already Archived" → `{t('tags.archived')}`
  - "Add to Archive" → `{t('tags.add_to_archive')}`
  - "Rename" → `{t('tags.rename')}`
  - "Delete" → `{t('tags.delete')}`
  - "No archived items found" → `{t('tags.no_archived')}`
  - "No history items found" → `{t('tags.no_history')}`

### 2. AssignTagsModal.svelte

- Import `t` từ `svelte-i18n`
- Thay thế các chuỗi text hardcode bằng `{t('tags.key')}`
- Các key cần thay đổi:
  - "Assign Tags" → `{t('tags.assign')}`
  - "No tags created yet. You can create tags in the main side panel." → `{t('tags.no_tags')}`

### 3. TagManagement.svelte

- Import `t` từ `svelte-i18n`
- Thay thế các chuỗi text hardcode bằng `{t('tags.key')}`
- Các key cần thay đổi:
  - "Tags" → `{t('tags.title')}`
  - "Create new tag" → `{t('tags.create')}`
  - "Rename tag" → `{t('tags.rename')}`
  - "Create" → `{t('tags.create')}`
  - "Save" → `{t('tags.save')}`
  - "Loading tags..." → `{t('tags.loading')}`
  - "All archive" → `{t('tags.all')}`
  - "Clear All Filters" → `{t('tags.clear_filters')}`
  - "Rename tag" (title) → `{t('tags.rename')}`
  - "Delete tag" (title) → `{t('tags.delete')}`
  - Các thông báo lỗi → `{t('tags.errors.key')}`

### 4. TagActionDropdownMenu.svelte

- Import `t` từ `svelte-i18n`
- Thay thế các chuỗi text hardcode bằng `{t('tags.key')}`
- Các key cần thay đổi:
  - "Actions" → `{t('tags.actions')}`
  - "Rename" → `{t('tags.rename')}`
  - "Delete" → `{t('tags.delete')}`

### 5. ActionDropdownMenu.svelte

- Import `t` từ `svelte-i18n`
- Thay thế các chuỗi text hardcode bằng `{t('tags.key')}`
- Các key cần thay đổi:
  - "Actions" → `{t('tags.actions')}`
  - "Assign Tags" → `{t('tags.assign')}`
  - "Already Archived" → `{t('tags.archived')}`
  - "Add to Archive" → `{t('tags.add_to_archive')}`
  - "Rename" → `{t('tags.rename')}`
  - "Delete" → `{t('tags.delete')}`

## Thứ tự thực hiện

1. Cập nhật file en.json với các key i18n mới
2. Cập nhật file vi.json với các key i18n mới
3. Cập nhật từng component theo thứ tự sau:
   - SidePanel.svelte
   - AssignTagsModal.svelte
   - TagManagement.svelte
   - TagActionDropdownMenu.svelte
   - ActionDropdownMenu.svelte

## Lưu ý

- Đảm bảo import `t` từ `svelte-i18n` ở đầu mỗi component
- Kiểm tra kỹ các chuỗi text đã được thay thế đúng chưa
- Test chức năng với cả hai ngôn ngữ để đảm bảo hoạt động đúng
