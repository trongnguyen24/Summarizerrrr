<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import 'overlayscrollbars/overlayscrollbars.css'
  import Dialog from './Dialog.svelte'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { slideScaleFade } from '@/lib/utils/slideScaleFade.js'

  import {
    deleteSummary,
    deleteHistory,
    updateSummary,
    updateHistory,
    getSummaryById,
    getHistoryById,
    softDeleteSummary,
    softDeleteHistory,
    removeFromArchiveByHistoryId,
  } from '@/lib/db/indexedDBService'
  import TabArchive from '@/entrypoints/archive/components/TabArchive.svelte'
  import TagManagement from '@/entrypoints/archive/components/displays/TagManagement.svelte'
  import HistoryTagFilter from '@/entrypoints/archive/components/displays/HistoryTagFilter.svelte'
  import KindFilter from '@/entrypoints/archive/components/displays/KindFilter.svelte'
  import AssignTagsModal from '@/entrypoints/archive/components/AssignTagsModal.svelte' // Import the new modal
  import ArchiveListItem from '@/entrypoints/archive/components/ArchiveListItem.svelte'
  import {
    archiveFilterStore,
    refreshTagCounts,
    clearAllTagFilters,
  } from '@/stores/archiveFilterStore.svelte.js'
  import {
    historyFilterStore,
    clearContentTypeFilter,
  } from '@/stores/historyFilterStore.svelte.js'
  import {
    kindFilterStore,
    clearKindFilter,
  } from '@/stores/kindFilterStore.svelte.js'
  import { preloadTagsData } from '@/stores/tagsCacheStore.svelte.js'
  import { itemKey } from '@/stores/archiveStore.svelte.js'
  import {
    renameArchivedConversation,
    setArchivedConversationState,
    deleteArchivedConversation,
    resumeArchivedConversation,
  } from '@/stores/conversationArchiveStore.svelte.js'

  const {
    list, // Merged rows: { kind, id, title, timestamp, raw }
    selectedKey, // `${kind}:${id}` of the current selection
    selectItem,
    activeTab,
    selectTab,
    onRefresh,
  } = $props()

  // State management
  let isOpen = $state(false)
  let newSummaryName = $state('')
  let itemToRename = $state(null)

  let deleteCandidateId = $state(null)
  let deleteTimeoutId = $state(null)
  let isConfirmingDelete = $state(false)
  let isTouchScreen = $state(false)

  // Use effect to compute categorized list instead of filtered list
  let categorizedList = $state({ matchedItems: [], unmatchedItems: [] })
  let filteredList = $state([]) // Keep for backward compatibility

  $effect(() => {
    // The kind filter HIDES non-matching rows; the content-type and tag
    // filters below only partition them (matched first, rest dimmed).
    const selectedKind = kindFilterStore.selectedKind
    const scoped = (list || []).filter(
      (item) => !selectedKind || item.kind === selectedKind,
    )

    // For history tab with content type filter
    if (activeTab === 'history') {
      if (historyFilterStore.selectedContentType === null) {
        // No filter, return original list
        filteredList = scoped
        categorizedList = { matchedItems: scoped, unmatchedItems: [] }
        return
      }

      // Filter by content type (chats carry none, so they land in unmatched)
      const matched = []
      const unmatched = []

      scoped.forEach((item) => {
        if (item.raw.contentType === historyFilterStore.selectedContentType) {
          matched.push(item)
        } else {
          unmatched.push(item)
        }
      })

      categorizedList = { matchedItems: matched, unmatchedItems: unmatched }
      filteredList = [...matched, ...unmatched] // Keep backward compatibility
      return
    }

    // For archive tab with no filter, return original list
    if (archiveFilterStore.selectedTagIds.length === 0) {
      filteredList = scoped
      categorizedList = { matchedItems: scoped, unmatchedItems: [] }
      return
    }

    // Categorize items for archive tab with selected tags
    const matched = []
    const unmatched = []

    scoped.forEach((item) => {
      const tags = item.raw.tags
      if (!tags || !Array.isArray(tags)) {
        unmatched.push(item)
      } else {
        const isMatched = archiveFilterStore.selectedTagIds.every((tagId) =>
          tags.includes(tagId),
        )

        if (isMatched) {
          matched.push(item)
        } else {
          unmatched.push(item)
        }
      }
    })

    categorizedList = { matchedItems: matched, unmatchedItems: unmatched }
    filteredList = [...matched, ...unmatched] // Keep backward compatibility
  })

  // State for AssignTagsModal
  let isAssigningTags = $state(false)
  let summaryToEditTags = $state(null)

  // Utility functions
  function resetDialogState() {
    isOpen = false
    newSummaryName = ''
    itemToRename = null
  }

  function openAssignTagsModal(item) {
    // AssignTagsModal works on the raw summary record, not the merged row
    summaryToEditTags = item.raw
    isAssigningTags = true
  }

  function closeAssignTagsModal() {
    isAssigningTags = false
    summaryToEditTags = null
  }

  // Single place that resets every filter on tab change (App's selectTab
  // callback used to clear tags a second time).
  function handleTabChange(tabName) {
    clearAllTagFilters() // Reset archive filter when changing tabs
    clearContentTypeFilter() // Reset history filter when changing tabs
    clearKindFilter() // Reset summary/chat filter when changing tabs
    selectTab(tabName)
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') handleRename()
  }

  // Event handlers
  async function refreshSummaries() {
    if (onRefresh) await onRefresh()

    // Invalidate tags cache để refresh tag counts
    const { invalidateTagsCache } = await import(
      '@/stores/tagsCacheStore.svelte.js'
    )
    invalidateTagsCache()
  }

  // Create a wrapper function that calls both refreshSummaries and refreshTagCounts
  async function handleRefreshWithTags() {
    await refreshSummaries()
    refreshTagCounts()
    // Also invalidate tags cache để refresh tags
    const { invalidateTagsCache } = await import(
      '@/stores/tagsCacheStore.svelte.js'
    )
    invalidateTagsCache()
  }

  function openRenameDialog(item) {
    itemToRename = item
    newSummaryName = item.title
    isOpen = true
  }

  async function handleRename() {
    if (!itemToRename || !newSummaryName.trim()) return

    try {
      const title = newSummaryName.trim()

      if (itemToRename.kind === 'chat') {
        await renameArchivedConversation(itemToRename.id, title)
        await refreshSummaries()
        resetDialogState()
        return
      }

      const item =
        activeTab === 'archive'
          ? await getSummaryById(itemToRename.id)
          : await getHistoryById(itemToRename.id)

      if (item) {
        item.title = title
        activeTab === 'archive'
          ? await updateSummary(item)
          : await updateHistory(item)

        // Trigger cloud sync after updating summary/history
        try {
          const { triggerSync } = await import(
            '@/services/cloudSync/cloudSyncService.svelte.js'
          )
          triggerSync()
        } catch (syncError) {
          console.warn('Failed to trigger sync after rename:', syncError)
        }
      }
      await refreshSummaries()
      resetDialogState()
    } catch (error) {
      console.error('Error renaming summary:', error)
    }
  }

  async function handleDelete(item) {
    try {
      if (item.kind === 'chat') {
        // Conversations are not covered by cloud sync
        await deleteArchivedConversation(item.id)
        await refreshSummaries()
        deleteCandidateId = null
        isConfirmingDelete = false
        return
      }

      // Use soft delete for cloud sync compatibility
      activeTab === 'archive'
        ? await softDeleteSummary(item.id)
        : await softDeleteHistory(item.id)

      // Trigger cloud sync after delete
      try {
        const { triggerSync } = await import(
          '@/services/cloudSync/cloudSyncService.svelte.js'
        )
        triggerSync()
      } catch (syncError) {
        console.warn('Failed to trigger sync after delete:', syncError)
      }

      await refreshSummaries()

      // Invalidate tags cache khi xóa item để cập nhật tag counts
      const { invalidateTagsCache } = await import(
        '@/stores/tagsCacheStore.svelte.js'
      )
      invalidateTagsCache()

      deleteCandidateId = null
      isConfirmingDelete = false
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  async function handleResumeChat(item) {
    await resumeArchivedConversation(item.id)
  }

  async function handleToggleChatArchive(item) {
    await setArchivedConversationState(item.id, !item.raw.archived)
    await refreshSummaries()
  }

  async function handleAddToArchive(item) {
    try {
      // Import hàm từ indexedDBService
      const { moveHistoryItemToArchive } = await import(
        '@/lib/db/indexedDBService.js'
      )

      // Chuyển item từ history sang archive
      await moveHistoryItemToArchive(item.id)

      // Trigger cloud sync after moving to archive
      try {
        const { triggerSync } = await import(
          '@/services/cloudSync/cloudSyncService.svelte.js'
        )
        triggerSync()
      } catch (syncError) {
        console.warn(
          'Failed to trigger sync after moving to archive:',
          syncError,
        )
      }

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

  async function handleRemoveFromArchive(item) {
    try {
      // Xóa item khỏi archive
      await removeFromArchiveByHistoryId(item.id)

      // Trigger cloud sync after removing from archive
      try {
        const { triggerSync } = await import(
          '@/services/cloudSync/cloudSyncService.svelte.js'
        )
        triggerSync()
      } catch (syncError) {
        console.warn(
          'Failed to trigger sync after removing from archive:',
          syncError,
        )
      }

      // Làm mới danh sách
      await refreshSummaries()

      // Invalidate tags cache
      const { invalidateTagsCache } = await import(
        '@/stores/tagsCacheStore.svelte.js'
      )
      invalidateTagsCache()

      console.log('Item removed from archive successfully')
    } catch (error) {
      console.error('Error removing item from archive:', error)
    }
  }

  function handleDeleteClick(item) {
    if (isConfirmingDelete && deleteCandidateId === item.id) {
      clearTimeout(deleteTimeoutId)
      handleDelete(item)
    } else {
      deleteCandidateId = item.id
      isConfirmingDelete = true
      deleteTimeoutId = setTimeout(() => {
        isConfirmingDelete = false
        deleteCandidateId = null
      }, 3000)
    }
  }

  // Scrollbar configuration
  const scrollOptions = {
    scrollbars: {
      visibility: 'auto',
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initializeScrollbars] = useOverlayScrollbars({
    options: scrollOptions,
    defer: true,
  })

  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  $effect(() => {
    isTouchScreen = isTouchDevice()
    if (!isTouchDevice()) {
      initializeScrollbars(document.getElementById('scroll-side'))
    }
  })

  // Preload tags data ngay khi component mount để tránh layout shift
  $effect(() => {
    preloadTagsData()
  })
</script>

<div
  transition:slideScaleFade={{
    duration: 800,
    slideDistance: '0rem',
    startScale: 1,
    slideFrom: 'left',
  }}
  class="w-80 relative flex flex-col h-lvh"
>
  <h2 class="text-lg pl-12 pt-4.5 pb-2 font-bold">Summarizerrrr</h2>

  <TabArchive {activeTab} onSelectTab={handleTabChange} />

  <div
    id="scroll-side"
    class="text-text-secondary flex-1 relative gap-0.5 overflow-y-auto"
  >
    <div
      class="sticky bg-linear-to-b from-background to-background/40 mask-b-from-50% left-0 top-0 w-78 h-4 backdrop-blur-[2px] z-30 pointer-events-none"
    ></div>

    <div
      class="flex text-xs md:text-sm absolute inset-0 px-2 py-4 h-full flex-col {isTouchScreen
        ? 'gap-1 !text-sm'
        : 'gap-0.5'}"
    >
      <KindFilter />

      <!-- Tag / content-type filters only apply to summaries -->
      {#if activeTab === 'archive' && kindFilterStore.selectedKind !== 'chat'}
        <TagManagement />
      {/if}

      {#if activeTab === 'history' && kindFilterStore.selectedKind !== 'chat'}
        <HistoryTagFilter />
      {/if}

      <!-- Render matched items -->
      {#each categorizedList.matchedItems as item (itemKey(item))}
        <ArchiveListItem
          {item}
          {activeTab}
          {isTouchScreen}
          {isConfirmingDelete}
          {deleteCandidateId}
          isSelected={selectedKey === itemKey(item)}
          onSelect={(row) => selectItem(row, activeTab)}
          onAssignTags={openAssignTagsModal}
          onRename={openRenameDialog}
          onDeleteClick={handleDeleteClick}
          onAddToArchive={handleAddToArchive}
          onRemoveFromArchive={handleRemoveFromArchive}
          onResume={handleResumeChat}
          onToggleChatArchive={handleToggleChatArchive}
        />
      {/each}

      <!-- Render unmatched items dimmed -->
      {#each categorizedList.unmatchedItems as item (itemKey(item))}
        <ArchiveListItem
          dimmed
          {item}
          {activeTab}
          {isTouchScreen}
          {isConfirmingDelete}
          {deleteCandidateId}
          isSelected={selectedKey === itemKey(item)}
          onSelect={(row) => selectItem(row, activeTab)}
          onAssignTags={openAssignTagsModal}
          onRename={openRenameDialog}
          onDeleteClick={handleDeleteClick}
          onAddToArchive={handleAddToArchive}
          onRemoveFromArchive={handleRemoveFromArchive}
          onResume={handleResumeChat}
          onToggleChatArchive={handleToggleChatArchive}
        />
      {/each}

      {#if (filteredList?.length || 0) === 0}
        <div class="px-2 py-4 text-text-muted text-xs">
          {#if kindFilterStore.selectedKind === 'chat'}
            {$t('archive.no_chats')}
          {:else if activeTab === 'archive'}
            {$t('tags.no_archived')}
          {:else}
            {$t('tags.no_history')}
          {/if}
        </div>
      {/if}

      <div class="">&nbsp;</div>
    </div>
  </div>

  <div
    class="absolute bg-linear-to-t from-background to-background/40 mask-t-from-50% left-0 right-2 bottom-0 h-4 backdrop-blur-[2px] z-30 pointer-events-none"
  ></div>
</div>

<!-- Rename Dialog -->
<Dialog bind:open={isOpen}>
  <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="block size-3.5 bg-error rounded-full"
      onclick={() => (isOpen = false)}
    >
      <Icon
        class="text-red-800 transition-opacity duration-150"
        width={14}
        icon="heroicons:x-mark-16-solid"
      />
    </button>
  </div>

  <div
    class="relative font-mono rounded-lg text-text-primary dark:text-text-secondary text-sm bg-background dark:bg-surface-1 overflow-hidden border border-border w-full flex-shrink-0 flex flex-col"
  >
    <div
      class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
    >
      <p class="!text-center select-none">Rename summary</p>
    </div>

    <div class="flex relative p-px gap-4 flex-col">
      <div class="p-4 flex justify-end gap-2">
        <div class="lang flex-1 overflow-hidden relative">
          <div
            class="overflow-hidden relative w-full h-10 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus-within:!border-blackwhite/30 dark:border-blackwhite/10 dark:focus-within:!border-blackwhite/20 transition-colors duration-150"
          >
            <input
              type="text"
              class="absolute top-0 left-0 w-[133.33%] h-[133.33%] pl-4 pr-12 text-base text-text-primary bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted origin-top-left scale-75"
              bind:value={newSummaryName}
              onkeydown={handleKeyDown}
            />
          </div>
        </div>

        <button class="relative overflow-hidden group" onclick={handleRename}>
          <div
            class="font-medium flex justify-center items-center h-10 px-4 border transition-colors duration-200 bg-surface-2 group-hover:bg-surface-2/95 dark:group-hover:surface-2/90 text-text-secondary border-border hover:border-gray-500/50 hover:text-blackwhite"
          >
            Save
          </div>
          <span
            class="size-4 absolute z-10 -left-2 -bottom-2 border bg-background dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border group-hover:border-gray-500/50"
          ></span>
        </button>
      </div>
    </div>
  </div>
</Dialog>

<!-- Assign Tags Modal -->
<Dialog
  closeOnOutsideClick={true}
  bind:open={isAssigningTags}
  contentClass="outline-hidden fixed flex justify-center left-3 sm:left-8 top-37 w-[calc(100vw-32px)] max-w-xs z-[100] "
>
  <AssignTagsModal
    summary={summaryToEditTags}
    close={closeAssignTagsModal}
    onUpdate={handleRefreshWithTags}
  />
</Dialog>

<style>
  /* .list-button styles now live in ArchiveListItem.svelte */

  .lang::after {
    display: block;
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    height: 8px;
    width: 8px;
    background-color: var(--color-text-primary);
    transform: rotate(45deg) translate(-50%, -50%);
    transition: transform 0.3s ease-out;
    transform-origin: top right;
  }

  .lang::after {
    transform: rotate(45deg) translate(50%, -50%);
  }

  .lang::before {
    display: block;
    content: '';
    z-index: -1;
    position: absolute;
    bottom: 0;
    left: 0;
    height: 28px;
    width: 100%;
    background-color: rgba(124, 124, 124, 0.025);
    transform: translateY(100%);
    transition: transform 0.3s ease-out;
  }

  .lang::before {
    transform: translateY(0);
  }

  /* Additional styles for smooth transitions */
</style>
