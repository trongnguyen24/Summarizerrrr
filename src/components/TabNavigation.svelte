<script>
  import GroupVisual from './GroupVisual.svelte'
  // Props received from App.svelte
  let {
    activeTab,
    showTabNavigation, // Use the new prop
    chapterSummary,
    isChapterLoading,
    chapterError,
  } = $props()

  // Event dispatcher to notify when the tab changes
  const dispatch = (event, detail) => {
    const customEvent = new CustomEvent(event, { detail })
    document.dispatchEvent(customEvent) // Dispatch to document or a specific element
  }

  function setTab(tabName) {
    // activeTab = tabName; // Update local state if needed, but App.svelte will manage the source of truth
    dispatch('tabChange', tabName) // Notify parent (App.svelte)
  }
</script>

{#if showTabNavigation}
  <div
    class="flex relative font-mono text-base text-text-secondary w-fit gap-2 p-0.5 border border-border"
  >
    <GroupVisual>
      <button
        class="px-6 py-1 rounded-full transition-colors duration-150"
        class:text-text-primary={activeTab === 'summary'}
        class:active={activeTab === 'summary'}
        onclick={() => setTab('summary')}
      >
        Summary
      </button>

      <button
        class="px-4 py-1 rounded-full transition-colors duration-150"
        class:text-text-primary={activeTab === 'chapters'}
        class:active={activeTab === 'chapters'}
        onclick={() => setTab('chapters')}
        disabled={!chapterSummary && !isChapterLoading && !chapterError}
        title={!chapterSummary && !isChapterLoading && !chapterError
          ? 'Waiting for chapter processing...'
          : 'View chapter summary'}
      >
        Chapters
      </button>
    </GroupVisual>
  </div>
{/if}
