<script>
  // Props received from App.svelte
  let {
    activeTab,
    isYouTubeVideoActive,
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

{#if isYouTubeVideoActive}
  <div class="flex w-fit gap-2 p-0.5 mb-4 bg-surface-1 rounded-full">
    <button
      class="px-4 py-1 rounded-full text-sm transition-colors duration-150"
      class:bg-background={activeTab === 'summary'}
      class:text-text-primary={activeTab === 'summary'}
      class:text-text-secondary={activeTab !== 'summary'}
      class:hover:bg-surface-1={activeTab !== 'summary'}
      onclick={() => setTab('summary')}
    >
      Summary
    </button>

    <button
      class="px-4 py-1 rounded-full text-sm transition-colors duration-150"
      class:bg-background={activeTab === 'chapters'}
      class:text-text-primary={activeTab === 'chapters'}
      class:text-text-secondary={activeTab !== 'chapters'}
      class:hover:bg-surface-1={activeTab !== 'chapters'}
      onclick={() => setTab('chapters')}
      disabled={!chapterSummary && !isChapterLoading && !chapterError}
      title={!chapterSummary && !isChapterLoading && !chapterError
        ? 'Waiting for chapter processing...'
        : 'View chapter summary'}
    >
      Chapters
    </button>
  </div>
{/if}
