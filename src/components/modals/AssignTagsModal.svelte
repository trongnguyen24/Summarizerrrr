<script>
  // @ts-nocheck
  import { getAllTags, updateSummaryTags } from '@/lib/db/indexedDBService';
  import Icon from '@iconify/svelte';

  let { summary, close, onUpdate } = $props();

  let allTags = $state([]);
  let selectedTagIds = $state(new Set(summary.tags || []));

  async function loadAllTags() {
    allTags = await getAllTags();
  }

  function toggleTag(tagId) {
    if (selectedTagIds.has(tagId)) {
      selectedTagIds.delete(tagId);
    } else {
      selectedTagIds.add(tagId);
    }
  }

  async function handleSave() {
    try {
      await updateSummaryTags(summary.id, Array.from(selectedTagIds));
      if (onUpdate) {
        onUpdate(); // Call the refresh callback
      }
      close(); // Close the modal
    } catch (error) {
      console.error("Error updating summary tags:", error);
    }
  }

  loadAllTags();
</script>

<div class="relative font-mono rounded-lg text-text-primary dark:text-text-secondary text-sm bg-background dark:bg-surface-1 overflow-hidden border border-border w-full max-w-sm flex-shrink-0 flex flex-col">
  <div class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b border-border flex justify-between items-center">
    <p class="select-none font-semibold">Assign Tags</p>
    <button class="p-1 rounded-full hover:bg-black/10" onclick={close}>
      <Icon icon="heroicons:x-mark-16-solid" />
    </button>
  </div>

  <div class="p-4 flex flex-col gap-3 max-h-60 overflow-y-auto">
    {#each allTags as tag (tag.id)}
      <label class="flex items-center gap-3 cursor-pointer">
        <input 
          type="checkbox" 
          checked={selectedTagIds.has(tag.id)}
          onchange={() => toggleTag(tag.id)}
          class="size-4 rounded text-primary focus:ring-primary/50 border-border"
        />
        <span class="text-sm">{tag.name}</span>
      </label>
    {/each}
    {#if allTags.length === 0}
        <p class="text-text-muted text-center text-xs">No tags created yet. You can create tags in the main side panel.</p>
    {/if}
  </div>

  <div class="p-3 bg-surface-1 dark:bg-surface-2 border-t border-border flex justify-end">
    <button 
      onclick={handleSave}
      class="font-medium flex justify-center items-center h-9 px-4 border rounded-md transition-colors duration-200 bg-primary hover:bg-primary/90 text-white border-transparent"
    >
      Save Changes
    </button>
  </div>
</div>
