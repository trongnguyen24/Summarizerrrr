<script>
  // @ts-nocheck
  import { getAllTags, addTag, deleteTag } from '@/lib/db/indexedDBService';
  import Icon from '@iconify/svelte';
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js';
  import { selectedTagId, setTagFilter } from '@/stores/archiveFilterStore.svelte.js';

  let tags = $state([]);
  let newTagName = $state('');

  async function loadTags() {
    try {
      tags = await getAllTags();
    } catch (error) {
      console.error("Error loading tags:", error);
    }
  }

  async function handleAddTag() {
    if (!newTagName.trim()) return;
    try {
      await addTag(newTagName);
      newTagName = '';
      await loadTags(); // Refresh the list
    } catch (error) {
      console.error("Error adding tag:", error);
    }
  }

  async function handleDeleteTag(e, id) {
    e.stopPropagation(); // Prevent the parent button's onFilter from firing
    try {
      await deleteTag(id);
      await loadTags(); // Refresh the list
      // If the deleted tag was the active filter, clear the filter
      if (selectedTagId === id) {
        setTagFilter(null);
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
    }
  }

  // Load tags on component initialization
  loadTags();
</script>

<div class="px-2 pt-2 pb-4 mb-2 border-b border-border/50">
  <h3 class="px-2 mb-2 text-xs font-semibold tracking-wider uppercase text-text-muted">Tags</h3>
  <div class="flex flex-wrap gap-2 px-2 min-h-6">
    <!-- "All" button to clear filter -->
    <button 
      onclick={() => setTagFilter(null)} 
      class="flex items-center justify-center gap-1.5 text-xs font-medium rounded-full pl-3 pr-3 py-1 transition-colors {
        selectedTagId === null 
          ? 'bg-primary text-white' 
          : 'bg-surface-2 hover:bg-surface-3 text-text-secondary'
      }">
      All
    </button>

    {#each tags as tag (tag.id)}
      <div 
        transition:slideScaleFade={{ duration: 300, startScale: 0.8, slideFrom: 'bottom', slideDistance: '0.2rem' }}
        class="relative"
      >
        <div 
          class="flex items-center justify-center gap-1 text-xs font-medium rounded-full pl-2.5 pr-1.5 py-1 transition-colors {
            selectedTagId === tag.id 
              ? 'bg-primary text-white' 
              : 'bg-surface-2 text-text-secondary'
          }"
        >
          <button onclick={() => setTagFilter(tag.id)} class="hover:underline">
            <span>{tag.name}</span>
          </button>
          <button 
            onclick={(e) => handleDeleteTag(e, tag.id)} 
            class="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10">
            <Icon icon="heroicons:x-mark-16-solid" class="{selectedTagId === tag.id ? 'text-white/70 hover:text-white' : 'text-text-muted hover:text-error'}" />
          </button>
        </div>
      </div>
    {/each}
  </div>
  <div class="px-2 mt-3">
    <input
      type="text"
      placeholder="Create new tag..."
      class="w-full h-8 px-3 text-xs transition-colors duration-150 rounded-md bg-muted/5 dark:bg-muted/5 border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 placeholder:text-muted"
      bind:value={newTagName}
      onkeydown={(e) => e.key === 'Enter' && handleAddTag()}
    />
  </div>
</div>
