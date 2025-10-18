<script>
  // @ts-nocheck
  import { DropdownMenu } from 'bits-ui'
  import Icon, { loadIcons } from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'

  // Load icons for archive states
  loadIcons(['heroicons:archive-box', 'heroicons:archive-box-solid'])

  // Props từ component cha
  let {
    item, // Đối tượng summary/history hiện tại
    activeTab, // Tab hiện tại ('archive' hoặc 'history')
    isConfirmingDelete, // Trạng thái xác nhận xóa
    deleteCandidateId, // ID của item đang chờ xóa
    onAssignTags, // Hàm xử lý khi chọn Assign Tags
    onRename, // Hàm xử lý khi chọn Rename
    onDeleteClick, // Hàm xử lý khi chọn Delete
    onAddToArchive, // Hàm xử lý khi chọn Add to Archive
  } = $props()
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    {#snippet children({ builder })}
      <button
        class="p-2 hover:text-text-primary relative"
        title="Actions"
        {...builder}
      >
        <Icon icon="tabler:dots-vertical" width="20" height="20" />
      </button>
    {/snippet}
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

      {#if activeTab === 'history'}
        {#if item.isArchived}
          <DropdownMenu.Item
            class="px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm opacity-50 cursor-not-allowed"
            disabled
          >
            <Icon icon="heroicons:archive-box-solid" width="18" height="18" />
            <span>Already Archived</span>
          </DropdownMenu.Item>
        {:else}
          <DropdownMenu.Item
            class="px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm"
            onSelect={() => onAddToArchive(item)}
          >
            <Icon icon="heroicons:archive-box" width="18" height="18" />
            <span>Add to Archive</span>
          </DropdownMenu.Item>
        {/if}
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
        closeOnSelect={false}
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
