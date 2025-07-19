<!-- @ts-nocheck -->
<script>
  import { Tooltip } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/slideScaleFade'
  import { moveHistoryItemToArchive } from '@/lib/indexedDBService'
  import { setStorage } from '@/services/chromeService'

  let { selectedSummary } = $props()
  let isItemArchived = $state(selectedSummary.isArchived || false)

  // Effect để cập nhật isItemArchived khi selectedSummary thay đổi
  $effect(() => {
    isItemArchived = selectedSummary.isArchived || false
  })

  async function handleSave() {
    if (isItemArchived) return
    try {
      await moveHistoryItemToArchive(selectedSummary.id)
      isItemArchived = true // Cập nhật trạng thái cục bộ
      // Thông báo cho các component khác rằng dữ liệu đã được cập nhật
      await setStorage({ data_updated_at: new Date().getTime() })
    } catch (error) {
      console.error('Error saving to archive from history:', error)
      // Có thể thêm thông báo lỗi cho người dùng ở đây
    }
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root disableCloseOnTriggerClick delayDuration={200}>
    <Tooltip.Trigger
      onclick={handleSave}
      class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={isItemArchived}
    >
      {#if isItemArchived}
        <span
          class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
          transition:slideScaleFade={{
            duration: 300,
            slideFrom: 'bottom',
            startScale: 0.4,
            slideDistance: '0rem',
          }}
        >
          <Icon icon="heroicons:archive-box-solid" width="20" height="20" />
        </span>
      {:else}
        <span
          class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
          transition:slideScaleFade={{
            duration: 300,
            slideFrom: 'bottom',
            startScale: 0.4,
            slideDistance: '0rem',
          }}
        >
          <Icon icon="heroicons:archive-box" width="20" height="20" />
        </span>
      {/if}
    </Tooltip.Trigger>
    <Tooltip.Content forceMount sideOffset={6}>
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div
              class="py-1.5 px-2 font-mono text-xs bg-surface-2 rounded-sm dark:bg-surface-1"
              transition:slideScaleFade={{
                duration: 200,
                slideFrom: 'bottom',
                startScale: 0.95,
                slideDistance: '0.25rem',
              }}
              {...props}
            >
              {isItemArchived ? 'Saved!' : 'Save to archive'}
            </div>
          </div>
        {/if}
      {/snippet}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
