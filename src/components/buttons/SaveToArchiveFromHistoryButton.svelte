<!-- @ts-nocheck -->
<script>
  import Icon, { loadIcons } from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import ShadowTooltip from '../../lib/components/ShadowTooltip.svelte'
  import {
    moveHistoryItemToArchive,
    removeFromArchiveByHistoryId,
  } from '@/lib/db/indexedDBService.js'
  import { appStateStorage } from '@/services/wxtStorageService.js'

  let { selectedSummary } = $props()
  let isItemArchived = $state(selectedSummary.isArchived || false)
  let isProcessing = $state(false)
  loadIcons(['heroicons:archive-box', 'heroicons:archive-box-solid'])

  // Effect để cập nhật isItemArchived khi selectedSummary thay đổi
  $effect(() => {
    isItemArchived = selectedSummary.isArchived || false
  })

  async function handleToggleArchive() {
    if (isProcessing) return
    isProcessing = true

    try {
      if (isItemArchived) {
        // Đã archive -> xóa khỏi archive
        await removeFromArchiveByHistoryId(selectedSummary.id)
        isItemArchived = false
      } else {
        // Chưa archive -> thêm vào archive
        await moveHistoryItemToArchive(selectedSummary.id)
        isItemArchived = true
      }
      // Thông báo cho các component khác rằng dữ liệu đã được cập nhật
      await appStateStorage.setValue({ data_updated_at: new Date().getTime() })
    } catch (error) {
      console.error('Error toggling archive status:', error)
    } finally {
      isProcessing = false
    }
  }
</script>

<ShadowTooltip
  content={isItemArchived ? $t('button.saved') : $t('button.save_to_archive')}
>
  <button
    onclick={handleToggleArchive}
    disabled={isProcessing}
    class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
  </button>
</ShadowTooltip>
