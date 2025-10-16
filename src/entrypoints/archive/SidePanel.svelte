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
  import TagManagement from '@/components/displays/archive/TagManagement.svelte'
  import AssignTagsModal from '@/components/modals/AssignTagsModal.svelte' // Import the new modal
  import {
    archiveFilterStore,
    refreshTagCounts,
  } from '@/stores/archiveFilterStore.svelte.js'

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

  // Use effect to compute categorized list instead of filtered list
  let categorizedList = $state({ matchedItems: [], unmatchedItems: [] })
  let filteredList = $state([]) // Keep for backward compatibility

  $effect(() => {
    // For history tab, always return original list
    if (activeTab !== 'archive') {
      filteredList = list || []
      categorizedList = { matchedItems: list || [], unmatchedItems: [] }
      return
    }

    // For archive tab with no filter, return original list
    if (archiveFilterStore.selectedTagIds.length === 0) {
      filteredList = list || []
      categorizedList = { matchedItems: list || [], unmatchedItems: [] }
      return
    }

    // Categorize items for archive tab with selected tags
    const matched = []
    const unmatched = []

    ;(list || []).forEach((item) => {
      if (!item.tags || !Array.isArray(item.tags)) {
        unmatched.push(item)
      } else {
        const isMatched = archiveFilterStore.selectedTagIds.every((tagId) =>
          item.tags.includes(tagId)
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
    currentSummaryIdToRename = null
  }

  function openAssignTagsModal(item) {
    summaryToEditTags = item
    isAssigningTags = true
  }

  function closeAssignTagsModal() {
    isAssigningTags = false
    summaryToEditTags = null
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter') handleRename()
  }

  // Event handlers
  async function refreshSummaries() {
    if (onRefresh) await onRefresh()
  }

  // Create a wrapper function that calls both refreshSummaries and refreshTagCounts
  async function handleRefreshWithTags() {
    await refreshSummaries()
    refreshTagCounts()
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

      <!-- Render matched items -->
      {#each categorizedList.matchedItems as item (item.id)}
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
              class="p-1 hover:text-text-primary {isTouchScreen
                ? 'p-2'
                : 'p-1'}"
              title="Assign Tags"
            >
              <Icon icon="tabler:tag" width="20" height="20" />
            </button>
            <button
              onclick={() => openRenameDialog(item)}
              class="p-1 hover:text-text-primary {isTouchScreen
                ? 'p-2'
                : 'p-1'}"
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

      <!-- Render unmatched items with opacity -->
      {#each categorizedList.unmatchedItems as item (item.id)}
        <div
          class="relative group opacity-50 transition-opacity duration-300 ease-in-out"
        >
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
              class="p-1 hover:text-text-primary {isTouchScreen
                ? 'p-2'
                : 'p-1'}"
              title="Assign Tags"
            >
              <Icon icon="tabler:tag" width="20" height="20" />
            </button>
            <button
              onclick={() => openRenameDialog(item)}
              class="p-1 hover:text-text-primary {isTouchScreen
                ? 'p-2'
                : 'p-1'}"
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

      {#if (filteredList?.length || 0) === 0}
        <div class="px-2 py-4 text-text-muted text-xs">
          {activeTab === 'archive'
            ? 'No archived items found'
            : 'No history items found'}
        </div>
      {/if}

      <div class="">&nbsp;</div>
    </div>
  </div>

  <div
    class="absolute bg-linear-to-t from-background to-background/40 mask-t-from-50% left-0 right-3 bottom-0 h-4 backdrop-blur-[2px] z-30 pointer-events-none"
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
          <input
            type="text"
            class="w-full px-3 h-10 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
            bind:value={newSummaryName}
            onkeydown={handleKeyDown}
          />
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
{#if isAssigningTags}
  <Dialog closeOnOutsideClick={true} bind:open={isAssigningTags}>
    <AssignTagsModal
      summary={summaryToEditTags}
      close={closeAssignTagsModal}
      onUpdate={handleRefreshWithTags}
    />
  </Dialog>
{/if}

<style>
  .list-button::after {
    content: '';
    display: block;
    width: 0px;
    position: absolute;
    background: white;
    top: 50%;
    transform: translateY(-50%) translateX(-0.25rem);
    right: -0.5rem;
    left: -0.5rem;
    height: 1rem;
    border-radius: 0 4px 4px 0;
    transition: all 0.3s ease-in-out;
    box-shadow:
      0 0 2px #ffffff18,
      0 0 0 #ffffff18;
  }

  .list-button.active {
    &::after {
      transform: translateY(-50%) translateX(1px);
      width: 4px;
      box-shadow:
        4px 0 8px 2px #ffffff71,
        0 0 3px 1px #ffffff94;
    }
  }

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
  .unmatched-item {
    transition:
      opacity 0.3s ease-in-out,
      transform 0.3s ease-in-out;
  }

  .unmatched-item:hover {
    opacity: 0.7 !important;
    transform: translateX(2px);
  }
</style>
