<script>
  // @ts-nocheck
  import { getAllTags, addTag, deleteTag } from '@/lib/db/indexedDBService'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import { fade } from 'svelte/transition'
  import {
    archiveFilterStore,
    setTagFilter,
  } from '@/stores/archiveFilterStore.svelte.js'

  let tags = $state([])
  let newTagName = $state('')

  // Delete confirmation states
  let deleteCandidateId = $state(null)
  let deleteTimeoutId = $state(null)
  let isConfirmingDelete = $state(false)
  let isTouchScreen = $state(false)

  async function loadTags() {
    try {
      tags = await getAllTags()
    } catch (error) {
      console.error('Error loading tags:', error)
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

  async function handleDelete(id) {
    try {
      await deleteTag(id)
      await loadTags() // Refresh the list
      // If the deleted tag was the active filter, clear the filter
      if (archiveFilterStore.selectedTagId === id) {
        setTagFilter(null)
      }
      deleteCandidateId = null
      isConfirmingDelete = false
    } catch (error) {
      console.error('Error deleting tag:', error)
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
</script>

<div class="pt-2 pb-4 mb-2 border-b border-border/50">
  <h3
    class="mb-2 flex justify-between items-center px-2 text-xs font-semibold tracking-wider uppercase text-text-muted"
  >
    Tags
  </h3>
  <div class="flex flex-col gap-px min-h-6">
    <!-- "All" button to clear filter -->
    <div class="relative flex hover:bg-blackwhite/5 rounded-md">
      <button
        onclick={() => setTagFilter(null)}
        class="flex items-center gap-1 text-sm w-full relative p-2 text-left {archiveFilterStore.selectedTagId ===
        null
          ? ' text-white'
          : ' text-text-secondary'}"
      >
        <div class="size-5 relative">
          {#if archiveFilterStore.selectedTagId === null}
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
        All archive
      </button>
    </div>
    {#each tags as tag (tag.id)}
      <div class="relative group">
        <button
          class="flex items-center gap-1 text-sm w-full relative p-2 text-left hover:bg-blackwhite/5 rounded-md {archiveFilterStore.selectedTagId ===
          tag.id
            ? ' text-white'
            : ' text-text-secondary'} {isTouchScreen ? 'pr-24' : 'pr-8'}"
          onclick={() => setTagFilter(tag.id)}
        >
          <div class="size-5 relative">
            {#if archiveFilterStore.selectedTagId === tag.id}
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
            {tag.name}
          </div>
        </button>
        <div
          class="text-text-muted justify-center rounded-r-sm items-center bg-linear-to-l from-surface-1 dark:from-surface-2 from-80% to-surface-1/0 dark:to-surface-2/0 top-0 bottom-0 pl-4 pr-1 right-0 absolute {isTouchScreen
            ? 'flex bg-none'
            : 'hidden group-hover:flex'}"
        >
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
  <!-- <div class="px-2 mt-3">
    <input
      type="text"
      placeholder="Create new tag..."
      class="w-full h-8 px-3 text-xs transition-colors duration-150 rounded-md bg-muted/5 dark:bg-muted/5 border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted"
      bind:value={newTagName}
      onkeydown={(e) => e.key === 'Enter' && handleAddTag()}
    />
  </div> -->
</div>
