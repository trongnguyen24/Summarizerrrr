<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import 'overlayscrollbars/overlayscrollbars.css'
  import Dialog from './Dialog.svelte'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import {
    deleteSummary,
    deleteHistory,
    updateSummary,
    updateHistory,
    getSummaryById,
    getHistoryById,
  } from '@/lib/db/indexedDBService'
  import TabArchive from '@/components/navigation/TabArchive.svelte'
  import TagManagement from '@/components/displays/archive/TagManagement.svelte';
  import AssignTagsModal from '@/components/modals/AssignTagsModal.svelte'; // Import the new modal

  const {
    list,
    selectedSummary,
    selectSummary,
    selectedSummaryId,
    activeTab,
    selectTab,
    onRefresh,
  } = $props()

  // State management
  let isOpen = $state(false)
  let newSummaryName = $state('')
  let currentSummaryIdToRename = $state(null)

  let deleteCandidateId = $state(null)
  let deleteTimeoutId = $state(null)
  let isConfirmingDelete = $state(false)
  let isTouchScreen = $state(false)

  // State for AssignTagsModal
  let isAssigningTags = $state(false);
  let summaryToEditTags = $state(null);

  // Utility functions
  function resetDialogState() {
    isOpen = false
    newSummaryName = ''
    currentSummaryIdToRename = null
  }

  function openAssignTagsModal(item) {
    summaryToEditTags = item;
    isAssigningTags = true;
  }

  function closeAssignTagsModal() {
    isAssigningTags = false;
    summaryToEditTags = null;
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') handleRename()
  }

  // Event handlers
  async function refreshSummaries() {
    if (onRefresh) await onRefresh()
  }

  function openRenameDialog(item) {
    currentSummaryIdToRename = item.id
    newSummaryName = item.title
    isOpen = true
  }

  async function handleRename() {
    if (!currentSummaryIdToRename || !newSummaryName.trim()) return

    try {
      const item =
        activeTab === 'archive'
          ? await getSummaryById(currentSummaryIdToRename)
          : await getHistoryById(currentSummaryIdToRename)

      if (item) {
        item.title = newSummaryName.trim()
        activeTab === 'archive'
          ? await updateSummary(item)
          : await updateHistory(item)
      }
      await refreshSummaries()
      resetDialogState()
    } catch (error) {
      console.error('Error renaming summary:', error)
    }
  }

  async function handleDelete(id) {
    try {
      activeTab === 'archive'
        ? await deleteSummary(id)
        : await deleteHistory(id)
      await refreshSummaries()
      deleteCandidateId = null
      isConfirmingDelete = false
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  function handleDeleteClick(id) {
    if (isConfirmingDelete && deleteCandidateId === id) {
      clearTimeout(deleteTimeoutId)
      handleDelete(id)
    } else {
      deleteCandidateId = id
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
</script>

<div
  transition:slideScaleFade={{
    duration: 800,
    slideDistance: '0rem',
    startScale: 1,
    slideFrom: 'left',
  }}
  class="w-80 relative flex flex-col h-screen"
>
  <h2 class="text-lg pl-12 pt-4.5 pb-2 font-bold">Summarizerrrr</h2>

  <TabArchive {activeTab} onSelectTab={selectTab} />

  <div
    id="scroll-side"
    class="text-text-secondary flex-1 relative gap-0.5 overflow-y-auto"
  >
    <div
      class="sticky bg-linear-to-b from-background to-background/40 mask-b-from-50% left-0 top-0 w-78 h-4 backdrop-blur-[2px] z-30 pointer-events-none"
    ></div>

    <div
      class="flex text-xs md:text-sm absolute inset-0 px-2 py-4 h-full flex-col {isTouchScreen
        ? 'gap-2 !text-sm'
        : 'gap-0.5'}"
    >
      {#if activeTab === 'archive'}
        <TagManagement />
      {/if}
      {#each list as item (item.id)}
        <div class="relative group">
          <button
            class="list-button w-full relative p-2 text-left hover:bg-blackwhite/5 rounded-md {selectedSummaryId ==
            item.id
              ? 'text-text-primary bg-neutral-100 hover:bg-white/60 dark:hover:bg-white/10 dark:bg-surface-2 active '
              : 'hover:bg-surface-1 dark:hover:bg-surface-2'} {isTouchScreen
              ? 'pr-24'
              : 'pr-8'}"
            onclick={() => selectSummary(item, activeTab)}
            title={item.title}
          >
            <div
              class="line-clamp-1 transition-colors w-full mask-r-from-85% mask-r-to-100%"
            >
              {item.title}
            </div>
          </button>
          <div
            class="text-text-muted justify-center rounded-r-sm items-center bg-linear-to-l from-surface-1 dark:from-surface-2 from-80% to-surface-1/0 dark:to-surface-2/0 top-0 bottom-0 pl-4 pr-1 right-0 absolute {isTouchScreen
              ? 'flex bg-none'
              : 'hidden group-hover:flex'}"
          >
            <button
              onclick={() => openAssignTagsModal(item)}
              class="p-1 hover:text-text-primary {isTouchScreen ? 'p-2' : 'p-1'}"
              title="Assign Tags"
            >
              <Icon icon="tabler:tag" width="20" height="20" />
            </button>
            <button
              onclick={() => openRenameDialog(item)}
              class="p-1 hover:text-text-primary {isTouchScreen ? 'p-2' : 'p-1'}"
              title="Rename"
            >
              <Icon icon="tabler:pencil" width="20" height="20" />
            </button>
            <button
              onclick={() => handleDeleteClick(item.id)}
              class=" relative rounded-3xl transition-colors duration-150 {isConfirmingDelete &&
              deleteCandidateId === item.id
                ? 'text-red-50 '
                : 'hover:text-text-primary'}  {isTouchScreen ? 'p-2' : 'p-1'}"
              title="Delete"
            >
              <Icon
                icon="heroicons:trash"
                width="20"
                height="20"
                class=" relative z-10"
              />
              {#if isConfirmingDelete && deleteCandidateId === item.id}
                <span
                  transition:slideScaleFade={{
                    duration: 150,
                    slideFrom: 'bottom',
                    startScale: 0.4,
                    slideDistance: '0rem',
                  }}
                  class="rounded-sm block bg-error absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 {isTouchScreen
                    ? 'size-9'
                    : 'size-7'}"
                >
                </span>
              {/if}
            </button>
          </div>
        </div>
      {/each}
      <div class="">&nbsp;</div>
    </div>
  </div>

  <div
    class="absolute bg-linear-to-t from-background to-background/40 mask-t-from-50% left-0 right-3 bottom-0 h-4 backdrop-blur-[2px] z-30 pointer-events-none"
  ></div>
</div>

<!-- Rename Dialog -->
<Dialog bind:open={isOpen}>
  <!-- ... content ... -->
</Dialog>

<!-- Assign Tags Modal -->
{#if isAssigningTags}
  <Dialog closeOnOutsideClick={true} bind:open={isAssigningTags}>
    <AssignTagsModal 
      summary={summaryToEditTags} 
      close={closeAssignTagsModal} 
      onUpdate={onRefresh} 
    />
  </Dialog>
{/if}

<style>
  /* ... existing styles ... */
</style>
