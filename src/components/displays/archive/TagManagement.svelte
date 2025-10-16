<script>
  // @ts-nocheck
  import {
    getAllTags,
    addTag,
    deleteTag,
    updateTag,
    getTagCounts,
    getAllSummaries,
  } from '@/lib/db/indexedDBService'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import { fade } from 'svelte/transition'
  import {
    archiveFilterStore,
    toggleTagFilter,
    clearAllTagFilters,
    isTagSelected,
    getSelectedTagCount,
    tagRefreshStore,
  } from '@/stores/archiveFilterStore.svelte.js'
  import Dialog from '@/entrypoints/archive/Dialog.svelte'

  let tags = $state([])
  let tagCounts = $state({})
  let totalCount = $state(0)
  let newTagName = $state('')
  let isLoading = $state(false)

  // Delete confirmation states
  let deleteCandidateId = $state(null)
  let deleteTimeoutId = $state(null)
  let isConfirmingDelete = $state(false)
  let isTouchScreen = $state(false)

  // Create tag dialog states
  let isCreateTagOpen = $state(false)
  let newTagInputName = $state('')

  // Rename tag dialog states
  let isRenameTagOpen = $state(false)
  let renamingTag = $state(null)
  let renameTagInputName = $state('')

  async function loadTags() {
    // Prevent multiple simultaneous loads
    if (isLoading) return

    isLoading = true
    try {
      const [tagsResult, tagCountsResult, allSummariesResult] =
        await Promise.all([
          getAllTags().catch(() => []), // Fallback to empty array
          getTagCounts().catch(() => ({})), // Fallback to empty object
          getAllSummaries().catch(() => []), // Fallback to empty array
        ])

      tags = tagsResult || []
      tagCounts = tagCountsResult || {}
      totalCount = allSummariesResult?.length || 0
    } catch (error) {
      console.error('Error loading tags:', error)
      // Set fallback values
      tags = []
      tagCounts = {}
      totalCount = 0
    } finally {
      isLoading = false
    }
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return
    try {
      await addTag(newTagName)
      newTagName = ''
      await loadTags() // Refresh the list
    } catch (error) {
      console.error('Error adding tag:', error)
    }
  }

  // Create tag dialog functions
  function openCreateTagDialog() {
    isCreateTagOpen = true
    newTagInputName = ''
  }

  function closeCreateTagDialog() {
    isCreateTagOpen = false
    newTagInputName = ''
  }

  function handleCreateTagKeyDown(event) {
    if (event.key === 'Enter') handleCreateTag()
  }

  async function handleCreateTag() {
    if (!newTagInputName.trim()) return

    try {
      await addTag(newTagInputName.trim())
      closeCreateTagDialog()
      await loadTags() // Refresh the list
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  // Rename tag dialog functions
  function openRenameDialog(tag) {
    isRenameTagOpen = true
    renamingTag = tag
    renameTagInputName = tag.name
  }

  function closeRenameDialog() {
    isRenameTagOpen = false
    renamingTag = null
    renameTagInputName = ''
  }

  function handleRenameTagKeyDown(event) {
    if (event.key === 'Enter') handleRenameTag()
  }

  async function handleRenameTag() {
    if (!renameTagInputName.trim() || !renamingTag) return

    // Check if new name is the same as current name
    if (renameTagInputName.trim() === renamingTag.name) {
      closeRenameDialog()
      return
    }

    // Check if new name already exists
    const existingTag = tags.find(
      (tag) =>
        tag.name.toLowerCase() === renameTagInputName.trim().toLowerCase() &&
        tag.id !== renamingTag.id
    )

    if (existingTag) {
      alert('A tag with this name already exists!')
      return
    }

    try {
      const updatedTag = {
        ...renamingTag,
        name: renameTagInputName.trim(),
      }
      await updateTag(updatedTag)
      closeRenameDialog()
      await loadTags() // Refresh the list
    } catch (error) {
      console.error('Error renaming tag:', error)
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTag(id)
      await loadTags() // Refresh the list
      // If the deleted tag was in the active filters, remove it from selection
      if (isTagSelected(id)) {
        toggleTagFilter(id)
      }
      deleteCandidateId = null
      isConfirmingDelete = false
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  function handleClearAllTags() {
    clearAllTagFilters()
  }

  function handleTagClick(tagId) {
    toggleTagFilter(tagId)
  }

  function handleAllClick() {
    clearAllTagFilters()
  }

  function hasAnyTagsSelected() {
    return getSelectedTagCount() > 0
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

  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  // Load tags on component initialization
  loadTags()

  // Check if device is touch screen
  $effect(() => {
    isTouchScreen = isTouchDevice()
  })

  // Reload tags when refresh counter changes
  $effect(() => {
    // Access the counter to create a dependency
    const _ = tagRefreshStore.counter
    loadTags()

    // Cleanup function
    return () => {
      // Any cleanup if needed
    }
  })
</script>

<div class="pt-2 pb-4 mb-2 border-b border-border/50">
  <h3
    class="mb-2 flex relative justify-between items-center px-2 text-xs font-semibold tracking-wider uppercase text-text-muted"
  >
    Tags
    <button
      onclick={openCreateTagDialog}
      class="px-2 absolute right-0 top-1/2 -translate-y-1/2 py-0.5 flex gap-1 items-center rounded-2xl hover:bg-blackwhite-5"
      ><Icon icon="heroicons:plus-20-solid" width="20" height="20" />New tag</button
    >
  </h3>
  <div class="flex flex-col gap-px min-h-6">
    <!-- Smart button: "All archive" when no filters, "Clear All Filters" when filters are active -->
    <div class="relative flex hover:bg-blackwhite/5 rounded-md">
      <button
        onclick={hasAnyTagsSelected() ? handleClearAllTags : handleAllClick}
        class="flex items-center gap-1 text-sm w-full relative p-2 text-left {!hasAnyTagsSelected()
          ? ' text-white'
          : ' text-text-secondary hover:text-text-primary'}"
      >
        <div class="size-5 relative">
          {#if !hasAnyTagsSelected()}
            <span
              transition:fade={{
                duration: 100,
              }}
              class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
            >
              <Icon icon="tabler:tag-filled" width="20" height="20" />
            </span>
          {:else}
            <span
              transition:fade={{
                duration: 100,
              }}
              class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
            >
              <Icon icon="tabler:x" width="20" height="20" />
            </span>
          {/if}
        </div>
        {!hasAnyTagsSelected()
          ? `All archive (${totalCount})`
          : 'Clear All Filters'}
      </button>
    </div>

    {#each tags as tag (tag.id)}
      <div class="relative group">
        <button
          class="flex items-center gap-1 text-sm w-full relative p-2 text-left hover:bg-blackwhite/5 rounded-md {isTagSelected(
            tag.id
          )
            ? ' text-white'
            : ' text-text-secondary'} {isTouchScreen ? 'pr-32' : 'pr-16'}"
          onclick={() => handleTagClick(tag.id)}
        >
          <div class="size-5 relative">
            {#if isTagSelected(tag.id)}
              <span
                transition:fade={{
                  duration: 100,
                }}
                class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
              >
                <Icon icon="tabler:tag-filled" width="20" height="20" />
              </span>
            {:else}
              <span
                transition:fade={{
                  duration: 100,
                }}
                class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
              >
                <Icon icon="tabler:tag" width="20" height="20" />
              </span>
            {/if}
          </div>
          <div
            class="line-clamp-1 transition-colors w-full mask-r-from-85% mask-r-to-100%"
          >
            {tag.name} ({tagCounts[tag.id] || 0})
          </div>
        </button>
        <div
          class="text-text-muted justify-center rounded-r-sm items-center bg-linear-to-l from-surface-1 dark:from-surface-2 from-80% to-surface-1/0 dark:to-surface-2/0 top-0 bottom-0 pl-4 pr-1 right-0 absolute {isTouchScreen
            ? 'flex bg-none'
            : 'hidden group-hover:flex'}"
        >
          <button
            onclick={() => openRenameDialog(tag)}
            class="p-1 hover:text-text-primary {isTouchScreen ? 'p-2' : 'p-1'}"
            title="Rename"
          >
            <Icon icon="tabler:pencil" width="20" height="20" />
          </button>
          <button
            onclick={() => handleDeleteClick(tag.id)}
            class=" relative rounded-3xl transition-colors duration-150 {isConfirmingDelete &&
            deleteCandidateId === tag.id
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
            {#if isConfirmingDelete && deleteCandidateId === tag.id}
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
  </div>
</div>

<!-- Create Tag Dialog -->
<Dialog bind:open={isCreateTagOpen}>
  <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="block size-3.5 bg-error rounded-full"
      onclick={() => (isCreateTagOpen = false)}
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
      <p class="!text-center select-none">Create new tag</p>
    </div>

    <div class="flex relative p-px gap-4 flex-col">
      <div class="p-4 flex justify-end gap-2">
        <div class="lang flex-1 overflow-hidden relative">
          <input
            type="text"
            class="w-full px-3 h-10 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
            bind:value={newTagInputName}
            onkeydown={handleCreateTagKeyDown}
            placeholder="Enter tag name..."
          />
        </div>

        <button
          class="relative overflow-hidden group"
          onclick={handleCreateTag}
        >
          <div
            class="font-medium flex justify-center items-center h-10 px-4 border transition-colors duration-200 bg-surface-2 group-hover:bg-surface-2/95 dark:group-hover:surface-2/90 text-text-secondary border-border hover:border-gray-500/50 hover:text-blackwhite"
          >
            Create
          </div>
          <span
            class="size-4 absolute z-10 -left-2 -bottom-2 border bg-background dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border group-hover:border-gray-500/50"
          ></span>
        </button>
      </div>
    </div>
  </div>
</Dialog>

<!-- Rename Tag Dialog -->
<Dialog bind:open={isRenameTagOpen}>
  <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="block size-3.5 bg-error rounded-full"
      onclick={() => (isRenameTagOpen = false)}
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
      <p class="!text-center select-none">Rename tag</p>
    </div>

    <div class="flex relative p-px gap-4 flex-col">
      <div class="p-4 flex justify-end gap-2">
        <div class="lang flex-1 overflow-hidden relative">
          <input
            type="text"
            class="w-full px-3 h-10 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
            bind:value={renameTagInputName}
            onkeydown={handleRenameTagKeyDown}
            placeholder="Enter new tag name..."
          />
        </div>

        <button
          class="relative overflow-hidden group"
          onclick={handleRenameTag}
        >
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
