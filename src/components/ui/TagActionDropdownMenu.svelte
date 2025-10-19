<script>
  // @ts-nocheck
  import { DropdownMenu } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'

  // Props từ component cha
  let {
    tag, // Tag object với id và name
    isConfirmingDelete, // Trạng thái xác nhận xóa
    deleteCandidateId, // ID của tag đang chờ xóa
    onRename, // Hàm xử lý khi chọn Rename
    onDeleteClick, // Hàm xử lý khi chọn Delete
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
      <DropdownMenu.Item
        class="px-4 py-2.5 text-left hover:bg-surface-2 dark:hover:bg-surface-3 flex items-center gap-2 text-sm"
        onSelect={() => onRename(tag)}
      >
        <Icon icon="tabler:pencil" width="18" height="18" />
        <span>Rename</span>
      </DropdownMenu.Item>

      <DropdownMenu.Item
        class="w-full px-4 py-2.5 text-left hover:bg-error/10 hover:text-error flex items-center gap-2 text-sm relative"
        closeOnSelect={false}
        onSelect={() => onDeleteClick(tag.id)}
      >
        <Icon
          icon="heroicons:trash"
          width="18"
          height="18"
          class="relative z-10"
        />
        <span class="relative z-10">Delete</span>
        {#if isConfirmingDelete && deleteCandidateId === tag.id}
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
