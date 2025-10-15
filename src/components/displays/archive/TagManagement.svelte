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

  async function handleDeleteTag(e, id) {
    e.stopPropagation() // Prevent the parent button's onFilter from firing
    try {
      await deleteTag(id)
      await loadTags() // Refresh the list
      // If the deleted tag was the active filter, clear the filter
      if (selectedTagId === id) {
        setTagFilter(null)
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  // Load tags on component initialization
  loadTags()
</script>

<div class="pt-2 pb-4 mb-2 border-b border-border/50">
  <h3
    class="mb-2 px-2 text-xs font-semibold tracking-wider uppercase text-text-muted"
  >
    Tags
  </h3>
  <div class="flex flex-col gap-px min-h-6">
    <!-- "All" button to clear filter -->
    <!-- <button
      onclick={() => setTagFilter(null)}
      class="flex items-center gap-1.5 text-sm font-medium py-1 hover:bg-surface-2 transition-colors {archiveFilterStore.selectedTagId ===
      null
        ? ' text-white'
        : ' text-text-secondary'}"
    >
      All
    </button> -->

    {#each tags as tag (tag.id)}
      <div class="relative flex hover:bg-blackwhite/5 rounded-md">
        <button
          class="flex items-center gap-1 text-sm w-full relative p-2 text-left{archiveFilterStore.selectedTagId ===
          tag.id
            ? ' text-white'
            : ' text-text-secondary'}"
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
          {tag.name}
        </button>
        <button
          onclick={(e) => handleDeleteTag(e, tag.id)}
          class="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10"
        >
          <Icon
            icon="heroicons:x-mark-16-solid"
            class={archiveFilterStore.selectedTagId === tag.id
              ? 'text-white/70 hover:text-white'
              : 'text-text-muted hover:text-error'}
          />
        </button>
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
