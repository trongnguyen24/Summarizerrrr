# Kế hoạch triển khai ActionDropdownMenu sử dụng Bits UI

## Phân tích menu hiện tại

Menu hiện tại trong SidePanel.svelte (dòng 293-363 và 438-508) có các chức năng:

- Nút trigger với icon `tabler:dots-vertical`
- Menu dropdown với các tùy chọn:
  - Assign Tags (chỉ hiển thị khi `activeTab === 'archive'`)
  - Rename
  - Delete (với xác nhận 2 lần)
- Animation sử dụng `slideScaleFade`
- State management: `openMenuItemId`, `isConfirmingDelete`, `deleteCandidateId`

## Thiết kế component ActionDropdownMenu.svelte

### Props

```javascript
let {
  item, // Đối tượng summary/history hiện tại
  activeTab, // Tab hiện tại ('archive' hoặc 'history')
  isConfirmingDelete, // Trạng thái xác nhận xóa
  deleteCandidateId, // ID của item đang chờ xóa
  onAssignTags, // Hàm xử lý khi chọn Assign Tags
  onRename, // Hàm xử lý khi chọn Rename
  onDeleteClick, // Hàm xử lý khi chọn Delete
} = $props()
```

### Cấu trúc component sử dụng Bits UI

```svelte
<script>
  import { DropdownMenu } from "bits-ui"
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'

  // Props từ component cha
  let { item, activeTab, isConfirmingDelete, deleteCandidateId,
        onAssignTags, onRename, onDeleteClick } = $props()
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild let:builder>
    <button
      class="p-2 hover:text-text-primary relative"
      title="Actions"
      {...builder}
    >
      <Icon icon="tabler:dots-vertical" width="20" height="20" />
    </button>
  </DropdownMenu.Trigger>

  <DropdownMenu.Portal>
    <DropdownMenu.Content
      class="bg-surface-1 dark:bg-surface-2 border border-border rounded-md shadow-lg z-50 min-w-40"
      sideOffset={5}
      align="end"
    >
      {#if activeTab === 'archive'}
        <DropdownMenu.Item
          class="px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm"
          onSelect={() => onAssignTags(item)}
        >
          <Icon icon="tabler:tag" width="18" height="18" />
          <span>Assign Tags</span>
        </DropdownMenu.Item>
      {/if}

      <DropdownMenu.Item
        class="px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm"
        onSelect={() => onRename(item)}
      >
        <Icon icon="tabler:pencil" width="18" height="18" />
        <span>Rename</span>
      </DropdownMenu.Item>

      <DropdownMenu.Item
        class="w-full px-4 py-2.5 text-left hover:bg-error/10 hover:text-error flex items-center gap-2 text-sm relative"
        onSelect={() => onDeleteClick(item.id)}
      >
        <Icon
          icon="heroicons:trash"
          width="18"
          height="18"
          class="relative z-10"
        />
        <span class="relative z-10">Delete</span>
        {#if isConfirmingDelete && deleteCandidateId === item.id}
          <span
            transition:slideScaleFade={{
              duration: 150,
              slideFrom: 'bottom',
              startScale: 0.4,
              slideDistance: '0rem',
            }}
            class="rounded-sm block bg-error/20 absolute inset-0"
          >
          </span>
        {/if}
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

## Các thay đổi cần thiết trong SidePanel.svelte

### 1. Import component mới

```javascript
import ActionDropdownMenu from '@/components/ui/ActionDropdownMenu.svelte'
```

### 2. Thay thế menu hiện tại (dòng 293-363)

Thay thế toàn bộ block menu hiện tại bằng:

```svelte
<ActionDropdownMenu
  {item}
  {activeTab}
  {isConfirmingDelete}
  {deleteCandidateId}
  onAssignTags={openAssignTagsModal}
  onRename={openRenameDialog}
  onDeleteClick={handleDeleteClick}
/>
```

### 3. Thay thế menu trong phần unmatched items (dòng 438-508)

Thực hiện tương tự như trên

### 4. Loại bỏ các state và hàm không cần thiết

Có thể loại bỏ:

- `openMenuItemId` state
- `toggleMenu()` function
- `closeMenu()` function
- Event handlers cho click outside và scroll (vì DropdownMenu của bits-ui đã xử lý)

## Lợi ích của việc chuyển đổi

1. **Accessibility**: Bits UI cung cấp accessibility tốt hơn
2. **Keyboard navigation**: Hỗ trợ điều hướng bằng bàn phím
3. **Focus management**: Quản lý focus tự động
4. **Code cleaner**: Giảm lượng code và logic thủ công
5. **Consistency**: Sử dụng component library đã được kiểm chứng

## Các bước triển khai

1. Tạo file `src/components/ui/ActionDropdownMenu.svelte`
2. Implement component theo thiết kế ở trên
3. Cập nhật `SidePanel.svelte` để import và sử dụng component mới
4. Thay thế menu hiện tại ở cả hai vị trí
5. Loại bỏ các state và hàm không cần thiết
6. Test tất cả chức năng để đảm bảo hoạt động đúng

## Lưu ý quan trọng

- Cần giữ lại animation `slideScaleFade` cho trạng thái xác nhận xóa
- Đảm bảo styles hiện tại được áp dụng đúng
- Kiểm tra cả trên touch screen và desktop
- Giữ nguyên logic xác nhận xóa 2 lần
