<script>
  // @ts-nocheck
  import {
    getAllTags,
    addTag,
    deleteTag,
    updateTag,
  } from '@/lib/db/indexedDBService'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import { fade } from 'svelte/transition'
  import { t } from 'svelte-i18n'
  import {
    archiveFilterStore,
    toggleTagFilter,
    clearAllTagFilters,
    isTagSelected,
    getSelectedTagCount,
    tagRefreshStore,
  } from '@/stores/archiveFilterStore.svelte.js'
  import {
    tagsCache,
    preloadTagsData,
    invalidateTagsCache,
    refreshTagsCache,
  } from '@/stores/tagsCacheStore.svelte.js'
  import Dialog from '@/entrypoints/archive/Dialog.svelte'
  import TagActionDropdownMenu from '@/components/ui/TagActionDropdownMenu.svelte'

  // Core data states - Sử dụng cache để tránh layout shift
  let tags = $derived(tagsCache.tags)
  let isLoading = $derived(tagsCache.isLoading)

  // Consolidated dialog state
  let dialogState = $state({
    create: { open: false, name: '', error: null },
    rename: { open: false, tag: null, name: '', error: null },
    delete: { candidateId: null, timeoutId: null, confirming: false },
  })

  let isTouchScreen = $state(false)

  // Refs for auto-focusing inputs
  let createInputRef
  let renameInputRef

  // Input validation
  function validateTagName(name) {
    if (!name || !name.trim()) {
      return { valid: false, error: $t('tags.errors.empty') }
    }

    const trimmedName = name.trim()
    if (trimmedName.length > 50) {
      return { valid: false, error: $t('tags.errors.max_length') }
    }

    if (/[<>]/.test(trimmedName)) {
      return {
        valid: false,
        error: $t('tags.errors.invalid_chars'),
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

  // Load tags using cache to prevent layout shift
  async function loadTags() {
    await preloadTagsData()
  }

  // Create tag functions
  function openCreateTagDialog() {
    dialogState.create.open = true
    dialogState.create.name = ''
    dialogState.create.error = null

    // Focus input after dialog opens
    setTimeout(() => {
      createInputRef?.focus()
    }, 100)
  }

  function closeCreateTagDialog() {
    dialogState.create.open = false
    dialogState.create.name = ''
    dialogState.create.error = null
  }

  async function handleCreateTag() {
    const validation = validateTagName(dialogState.create.name)
    if (!validation.valid) {
      dialogState.create.error = validation.error
      return
    }

    try {
      await addTag(validation.name)
      closeCreateTagDialog()
      // Invalidate cache and reload
      await refreshTagsCache()
    } catch (error) {
      console.error('Error creating tag:', error)
      dialogState.create.error = $t('tags.errors.create_failed')
    }
  }

  // Rename tag functions
  function openRenameDialog(tag) {
    dialogState.rename.open = true
    dialogState.rename.tag = tag
    dialogState.rename.name = tag.name
    dialogState.rename.error = null

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
    dialogState.rename.error = null
  }

  async function handleRenameTag() {
    const validation = validateTagName(dialogState.rename.name)
    if (!validation.valid) {
      dialogState.rename.error = validation.error
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
      dialogState.rename.error = $t('tags.errors.exists')
      return
    }

    try {
      const updatedTag = { ...tag, name: validation.name }
      await updateTag(updatedTag)
      closeRenameDialog()
      // Invalidate cache and reload
      await refreshTagsCache()
    } catch (error) {
      console.error('Error renaming tag:', error)
      dialogState.rename.error = $t('tags.errors.rename_failed')
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

      // Remove from active filters if selected
      if (isTagSelected(id)) {
        toggleTagFilter(id)
      }

      // Invalidate cache and reload
      await refreshTagsCache()

      dialogState.delete.candidateId = null
      dialogState.delete.confirming = false
    } catch (error) {
      console.error('Error deleting tag:', error)
      alert($t('tags.errors.delete_failed'))
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

  // Auto-reload tags khi cache bị invalidate (khi xóa/thêm items)
  $effect(() => {
    // Watch for cache changes và reload nếu cần
    if (!tagsCache.isLoaded && !tagsCache.isLoading) {
      loadTags()
    }
  })

  // Create keydown handlers (only Enter - Escape handled by Bits UI)
  const createTagKeydown = createEnterHandler(handleCreateTag)
  const renameTagKeydown = createEnterHandler(handleRenameTag)
</script>

<div class="pt-2 pb-4 mb-2 border-b border-border/50">
  {#if isLoading && tags.length === 0}
    <!-- Simple loading state để tránh layout shift -->
    <div class="h-32 flex items-center justify-center">
      <div class="flex items-center gap-2 text-text-muted">
        <div
          class="animate-spin rounded-full h-4 w-4 border-b-2 border-text-primary"
        ></div>
        <span class="text-sm">{$t('tags.loading')}</span>
      </div>
    </div>
  {:else}
    <h3
      class="mb-2 flex relative justify-between items-center px-2 text-xs font-semibold tracking-wider uppercase text-text-muted"
    >
      {$t('tags.title')}
      <button
        onclick={openCreateTagDialog}
        class="px-4 absolute right-0 top-1/2 -translate-y-1/2 py-0.5 flex gap-1 items-center border border-border/40 hover:border-border rounded-2xl bg-blackwhite-5 hover:bg-blackwhite-10"
        aria-label="Create new tag"
        ><Icon icon="heroicons:plus-20-solid" width="20" height="20" /></button
      >
    </h3>
    <div class="flex flex-col gap-px min-h-6">
      <!-- Smart button: "All archive" when no filters, "Clear All Filters" when filters are active -->
      <div
        class="relative flex hover:bg-surface-1 dark:hover:bg-surface-2 rounded-md"
      >
        <button
          onclick={hasAnyTagsSelected() ? handleClearAllTags : handleAllClick}
          class="flex items-center gap-2 text-sm w-full relative p-2 text-left {!hasAnyTagsSelected()
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
          {!hasAnyTagsSelected() ? $t('tags.all') : $t('tags.clear_filters')}
        </button>
      </div>

      {#each tags as tag (tag.id)}
        <div class="relative group">
          <button
            class="flex items-center gap-1.5 text-sm w-full relative text-left hover:bg-surface-1 dark:hover:bg-surface-2 rounded-md {isTagSelected(
              tag.id
            )
              ? ' text-white'
              : ' text-text-secondary'} {isTouchScreen
              ? 'pr-16 p-2.5'
              : 'pr-16 p-2'}"
            onclick={() => handleTagClick(tag.id)}
            aria-label={`Filter by ${tag.name} tag`}
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
              {tag.name}
            </div>
          </button>
          {#if isTouchScreen}
            <div
              class="action-menu-container text-text-muted justify-center rounded-r-sm items-center bg-none top-0 bottom-0 pr-1 right-0 absolute flex"
            >
              <TagActionDropdownMenu
                {tag}
                isConfirmingDelete={dialogState.delete.confirming}
                deleteCandidateId={dialogState.delete.candidateId}
                onRename={openRenameDialog}
                onDeleteClick={handleDeleteClick}
              />
            </div>
          {:else}
            <div
              class="text-text-muted justify-center rounded-r-sm items-center bg-linear-to-l from-surface-1 dark:from-surface-2 from-80% to-surface-1/0 dark:to-surface-2/0 top-0 bottom-0 pl-4 pr-1 right-0 absolute hidden group-hover:flex"
            >
              <button
                onclick={() => openRenameDialog(tag)}
                class="p-1 hover:text-text-primary"
                title={$t('tags.rename')}
                aria-label={`Rename tag ${tag.name}`}
              >
                <Icon icon="tabler:pencil" width="20" height="20" />
              </button>
              <button
                onclick={() => handleDeleteClick(tag.id)}
                class="relative rounded-3xl transition-colors duration-150 p-1 {dialogState
                  .delete.confirming &&
                dialogState.delete.candidateId === tag.id
                  ? 'text-red-50'
                  : 'hover:text-text-primary'}"
                title={$t('tags.delete')}
                aria-label={`Delete tag ${tag.name}`}
              >
                <Icon
                  icon="heroicons:trash"
                  width="20"
                  height="20"
                  class="relative z-10"
                />
                {#if dialogState.delete.confirming && dialogState.delete.candidateId === tag.id}
                  <span
                    transition:slideScaleFade={{
                      duration: 150,
                      slideFrom: 'bottom',
                      startScale: 0.4,
                      slideDistance: '0rem',
                    }}
                    class="rounded-sm block bg-error absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-7"
                  >
                  </span>
                {/if}
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
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
      <p class="!text-center select-none">{$t('tags.create')}</p>
    </div>

    <div class="flex relative p-px gap-4 flex-col">
      <div class="p-4 flex xs:flex-row flex-col justify-end gap-3 xs:gap-2">
        <div class="lang flex-1 overflow-hidden relative">
          <input
            type="text"
            class="w-full px-3 h-10 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
            bind:value={dialogState.create.name}
            onkeydown={createTagKeydown}
            oninput={() => (dialogState.create.error = null)}
            placeholder="Enter tag name..."
            maxlength="60"
            aria-label="Tag name"
            bind:this={createInputRef}
          />
          {#if dialogState.create.error}
            <p class="text-red-500 text-xs mt-1">{dialogState.create.error}</p>
          {/if}
        </div>

        <button
          class="relative overflow-hidden group"
          onclick={handleCreateTag}
          aria-label="Create tag"
        >
          <div
            class="font-medium flex justify-center items-center h-10 px-4 border transition-colors duration-200 bg-surface-2 group-hover:bg-surface-2/95 dark:group-hover:surface-2/90 text-text-secondary border-border hover:border-gray-500/50 hover:text-blackwhite"
          >
            {$t('tags.create')}
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
      <p class="!text-center select-none">{$t('tags.rename')}</p>
    </div>

    <div class="flex relative p-px gap-4 flex-col">
      <div class="p-4 flex xs:flex-row flex-col justify-end gap-3 xs:gap-2">
        <div class="lang flex-1 overflow-hidden relative">
          <input
            type="text"
            class="w-full px-3 h-10 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted transition-colors duration-150"
            bind:value={dialogState.rename.name}
            onkeydown={renameTagKeydown}
            oninput={() => (dialogState.rename.error = null)}
            placeholder="Enter new tag name..."
            maxlength="50"
            aria-label="New tag name"
            bind:this={renameInputRef}
          />
          {#if dialogState.rename.error}
            <p class="text-red-500 text-xs mt-1">{dialogState.rename.error}</p>
          {/if}
        </div>

        <button
          class="relative overflow-hidden group"
          onclick={handleRenameTag}
          aria-label="Save tag name"
        >
          <div
            class="font-medium flex justify-center items-center h-10 px-4 border transition-colors duration-200 bg-surface-2 group-hover:bg-surface-2/95 dark:group-hover:surface-2/90 text-text-secondary border-border hover:border-gray-500/50 hover:text-blackwhite"
          >
            {$t('tags.save')}
          </div>
          <span
            class="size-4 absolute z-10 -left-2 -bottom-2 border bg-background dark:bg-surface-1 rotate-45 transition-colors duration-200 border-border group-hover:border-gray-500/50"
          ></span>
        </button>
      </div>
    </div>
  </div>
</Dialog>
