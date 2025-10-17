<script>
  // @ts-nocheck
  import {
    getAllTags,
    addTag,
    deleteTag,
    updateTag,
    getTagCounts,
    getSummaryCount,
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

  // Core data states
  let tags = $state([])
  let tagCounts = $state({})
  let totalCount = $state(0)
  let isLoading = $state(false)

  // Consolidated dialog state
  let dialogState = $state({
    create: { open: false, name: '' },
    rename: { open: false, tag: null, name: '' },
    delete: { candidateId: null, timeoutId: null, confirming: false },
  })

  let isTouchScreen = $state(false)

  // Refs for auto-focusing inputs
  let createInputRef
  let renameInputRef

  // Input validation
  function validateTagName(name) {
    if (!name || !name.trim()) {
      return { valid: false, error: 'Tag name cannot be empty' }
    }

    const trimmedName = name.trim()
    if (trimmedName.length > 50) {
      return { valid: false, error: 'Tag name must be 50 characters or less' }
    }

    if (/[<>]/.test(trimmedName)) {
      return {
        valid: false,
        error: 'Tag name cannot contain < or > characters',
      }
    }

    return { valid: true, name: trimmedName }
  }

  // Simple keydown handler for Enter key only (Escape handled by Bits UI)
  function createEnterHandler(action) {
    return (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        action()
      }
    }
  }

  // Optimized loadTags function
  async function loadTags() {
    if (isLoading) return

    isLoading = true
    try {
      // Load only what we need efficiently
      const [tagsResult, tagCountsResult, totalCountResult] = await Promise.all(
        [
          getAllTags().catch(() => []),
          getTagCounts().catch(() => ({})),
          getSummaryCount().catch(() => 0),
        ]
      )

      tags = tagsResult || []
      tagCounts = tagCountsResult || {}
      totalCount = totalCountResult || 0
    } catch (error) {
      console.error('Error loading tags:', error)
      tags = []
      tagCounts = {}
      totalCount = 0
    } finally {
      isLoading = false
    }
  }

  // Create tag functions
  function openCreateTagDialog() {
    dialogState.create.open = true
    dialogState.create.name = ''

    // Focus input after dialog opens
    setTimeout(() => {
      createInputRef?.focus()
    }, 100)
  }

  function closeCreateTagDialog() {
    dialogState.create.open = false
    dialogState.create.name = ''
  }

  async function handleCreateTag() {
    const validation = validateTagName(dialogState.create.name)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    try {
      await addTag(validation.name)
      closeCreateTagDialog()
      await loadTags()
    } catch (error) {
      console.error('Error creating tag:', error)
      alert('Failed to create tag')
    }
  }

  // Rename tag functions
  function openRenameDialog(tag) {
    dialogState.rename.open = true
    dialogState.rename.tag = tag
    dialogState.rename.name = tag.name

    // Focus input after dialog opens
    setTimeout(() => {
      renameInputRef?.focus()
      renameInputRef?.select()
    }, 100)
  }

  function closeRenameDialog() {
    dialogState.rename.open = false
    dialogState.rename.tag = null
    dialogState.rename.name = ''
  }

  async function handleRenameTag() {
    const validation = validateTagName(dialogState.rename.name)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    const { tag, name } = dialogState.rename

    // Check if new name is the same as current name
    if (validation.name === tag.name) {
      closeRenameDialog()
      return
    }

    // Check if new name already exists
    const existingTag = tags.find(
      (t) =>
        t.name.toLowerCase() === validation.name.toLowerCase() &&
        t.id !== tag.id
    )

    if (existingTag) {
      alert('A tag with this name already exists!')
      return
    }

    try {
      const updatedTag = { ...tag, name: validation.name }
      await updateTag(updatedTag)
      closeRenameDialog()
      await loadTags()
    } catch (error) {
      console.error('Error renaming tag:', error)
      alert('Failed to rename tag')
    }
  }

  // Delete functions with proper cleanup
  function handleDeleteClick(id) {
    const { delete: deleteState } = dialogState

    if (deleteState.confirming && deleteState.candidateId === id) {
      clearTimeout(deleteState.timeoutId)
      performDelete(id)
    } else {
      // Clear any existing timeout
      if (deleteState.timeoutId) {
        clearTimeout(deleteState.timeoutId)
      }

      deleteState.candidateId = id
      deleteState.confirming = true

      deleteState.timeoutId = setTimeout(() => {
        deleteState.confirming = false
        deleteState.candidateId = null
      }, 3000)
    }
  }

  async function performDelete(id) {
    try {
      await deleteTag(id)
      await loadTags()

      // Remove from active filters if selected
      if (isTagSelected(id)) {
        toggleTagFilter(id)
      }

      dialogState.delete.candidateId = null
      dialogState.delete.confirming = false
    } catch (error) {
      console.error('Error deleting tag:', error)
      alert('Failed to delete tag')
    }
  }

  // Filter functions
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

  // Touch detection
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  // Effects
  $effect(() => {
    isTouchScreen = isTouchDevice()
  })

  $effect(() => {
    const _ = tagRefreshStore.counter
    loadTags()

    return () => {
      // Cleanup delete timeout on component unmount
      if (dialogState.delete.timeoutId) {
        clearTimeout(dialogState.delete.timeoutId)
      }
    }
  })

  // Create keydown handlers (only Enter - Escape handled by Bits UI)
  const createTagKeydown = createEnterHandler(handleCreateTag)
  const renameTagKeydown = createEnterHandler(handleRenameTag)
</script>

<div class="pt-2 pb-4 mb-2 border-b border-border/50">
  <h3
    class="mb-2 flex relative justify-between items-center px-2 text-xs font-semibold tracking-wider uppercase text-text-muted"
  >
    Tags
    <button
      onclick={openCreateTagDialog}
      class="px-4 absolute right-0 top-1/2 -translate-y-1/2 py-0.5 flex gap-1 items-center border border-border/40 hover:border-border rounded-2xl bg-blackwhite-5 hover:bg-blackwhite-10"
      aria-label="Create new tag"
      ><Icon icon="heroicons:plus-20-solid" width="20" height="20" /></button
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
        aria-label={hasAnyTagsSelected()
          ? 'Clear all tag filters'
          : 'Show all archive items'}
      >
        <div class="size-5 relative">
          {#if !hasAnyTagsSelected()}
            <span
              transition:fade={{ duration: 100 }}
              class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
            >
              <Icon icon="tabler:tag-filled" width="20" height="20" />
            </span>
          {:else}
            <span
              transition:fade={{ duration: 100 }}
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
          aria-label={`Filter by ${tag.name} tag (${tagCounts[tag.id] || 0} items)`}
          aria-pressed={isTagSelected(tag.id)}
        >
          <div class="size-5 relative">
            {#if isTagSelected(tag.id)}
              <span
                transition:fade={{ duration: 100 }}
                class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
              >
                <Icon icon="tabler:tag-filled" width="20" height="20" />
              </span>
            {:else}
              <span
                transition:fade={{ duration: 100 }}
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
            title="Rename tag"
            aria-label={`Rename tag ${tag.name}`}
          >
            <Icon icon="tabler:pencil" width="20" height="20" />
          </button>
          <button
            onclick={() => handleDeleteClick(tag.id)}
            class=" relative rounded-3xl transition-colors duration-150 {dialogState
              .delete.confirming && dialogState.delete.candidateId === tag.id
              ? 'text-red-50 '
              : 'hover:text-text-primary'}  {isTouchScreen ? 'p-2' : 'p-1'}"
            title="Delete tag"
            aria-label={`Delete tag ${tag.name}`}
          >
            <Icon
              icon="heroicons:trash"
              width="20"
              height="20"
              class=" relative z-10"
            />
            {#if dialogState.delete.confirming && dialogState.delete.candidateId === tag.id}
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
<Dialog bind:open={dialogState.create.open}>
  <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="block size-3.5 bg-error rounded-full"
      onclick={() => (dialogState.create.open = false)}
      aria-label="Close dialog"
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
            bind:value={dialogState.create.name}
            onkeydown={createTagKeydown}
            placeholder="Enter tag name..."
            maxlength="50"
            aria-label="Tag name"
            bind:this={createInputRef}
          />
        </div>

        <button
          class="relative overflow-hidden group"
          onclick={handleCreateTag}
          aria-label="Create tag"
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
<Dialog bind:open={dialogState.rename.open}>
  <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button
      class="block size-3.5 bg-error rounded-full"
      onclick={() => (dialogState.rename.open = false)}
      aria-label="Close dialog"
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
            bind:value={dialogState.rename.name}
            onkeydown={renameTagKeydown}
            placeholder="Enter new tag name..."
            maxlength="50"
            aria-label="New tag name"
            bind:this={renameInputRef}
          />
        </div>

        <button
          class="relative overflow-hidden group"
          onclick={handleRenameTag}
          aria-label="Save tag name"
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
