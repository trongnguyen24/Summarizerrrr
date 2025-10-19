<script>
  // @ts-nocheck
  import { getAllTags, updateSummaryTags } from '@/lib/db/indexedDBService'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import { fade } from 'svelte/transition'

  let { summary, close, onUpdate } = $props()

  let allTags = $state([])
  let selectedTagIds = $state(new Set(summary.tags || []))

  async function loadAllTags() {
    const tagsResult = await getAllTags()
    allTags =
      tagsResult?.sort((a, b) =>
        a.name.localeCompare(b.name, 'vi', {
          numeric: true,
          sensitivity: 'base',
        })
      ) || []
  }

  async function toggleTag(tagId) {
    if (selectedTagIds.has(tagId)) {
      selectedTagIds.delete(tagId)
    } else {
      selectedTagIds.add(tagId)
    }

    // Trigger reactivity by reassigning
    selectedTagIds = new Set(selectedTagIds)

    // Gọi trực tiếp API ngay lập tức
    try {
      await updateSummaryTags(summary.id, Array.from(selectedTagIds))
      if (onUpdate) onUpdate()
    } catch (error) {
      console.error('Error updating summary tags:', error)
    }
  }

  loadAllTags()
</script>

<div
  transition:slideScaleFade={{
    duration: 300,
    slideFrom: 'bottom',
    slideDistance: '0rem',
    startScale: 0.95,
  }}
  class="relative font-mono rounded-lg text-text-primary dark:text-text-secondary text-sm bg-background dark:bg-surface-1 overflow-hidden border border-border w-full max-w-sm flex-shrink-0 flex flex-col"
>
  <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <span class="block size-3.5 bg-muted/15 rounded-full"></span>
    <!-- svelte-ignore a11y_consider_explicit_label -->
    <button class="block size-3.5 bg-error rounded-full" onclick={close}>
      <Icon
        class="text-red-800 transition-opacity duration-150"
        width={14}
        icon="heroicons:x-mark-16-solid"
      />
    </button>
  </div>

  <div class="px-4 bg-surface-2 py-2 border-b border-border">
    <p class="select-none font-semibold">Assign Tags</p>
  </div>

  <div class="p-2 flex flex-col gap-px max-h-60 overflow-y-auto">
    {#each allTags as tag (tag.id)}
      <label
        class="flex w-full items-center gap-1.5 py-2 px-2 cursor-pointer hover:bg-blackwhite-5 rounded-sm transition-all duration-200"
      >
        <input
          type="checkbox"
          checked={selectedTagIds.has(tag.id)}
          onchange={() => toggleTag(tag.id)}
          class="peer sr-only"
        />
        <div class="size-5 relative">
          {#if selectedTagIds.has(tag.id)}
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

        <span
          class="text-sm text-text-secondary peer-checked:!text-text-primary select-none"
          >{tag.name}</span
        >
      </label>
    {/each}
    {#if allTags.length === 0}
      <p class="text-text-muted text-center text-xs py-4">
        No tags created yet. You can create tags in the main side panel.
      </p>
    {/if}
  </div>
</div>
