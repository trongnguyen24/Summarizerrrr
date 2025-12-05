<script>
  // @ts-nocheck
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TabNavigation from '@/components/navigation/TabNavigation.svelte'

  let { selectedSummary, activeTabId, tabs, onSelectTab } = $props()

  // Effect để highlight code khi content thay đổi
  $effect(() => {
    if (selectedSummary && activeTabId) {
      document
        .querySelectorAll('.summary-content pre code')
        .forEach((block) => {
          hljs.highlightElement(block)
        })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  })

  const currentSummary = $derived(
    selectedSummary.summaries.find(
      (_, index) => `summary-tab-${index}` === activeTabId,
    ),
  )
</script>

<div class="flex justify-center">
  {#if tabs.length > 1}
    <TabNavigation {tabs} activeTab={activeTabId} {onSelectTab} />
  {/if}
</div>

<div id="summary-content" class="text-text-secondary markdown-container-v2">
  {#if currentSummary}
    <div id="copy-cat">{@html marked.parse(currentSummary.content)}</div>
  {/if}
</div>

<style>
  /* === Table Styling - Horizontal Scroll === */
  .markdown-container-v2 :global(table) {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch; /* Smooth scroll trên iOS */
    border: 1px solid var(--color-border);
    border-radius: 0.5em;
    padding: 0.5em 0;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  .markdown-container-v2 :global(table thead),
  .markdown-container-v2 :global(table tbody),
  .markdown-container-v2 :global(table tr) {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .markdown-container-v2 :global(table:hover) {
    scrollbar-color: var(--color-border) transparent;
  }

  /* Webkit scrollbar - ẩn background */
  .markdown-container-v2 :global(table::-webkit-scrollbar) {
    height: 6px;
    background: transparent;
  }

  .markdown-container-v2 :global(table::-webkit-scrollbar-track) {
    background: transparent;
  }

  .markdown-container-v2 :global(table::-webkit-scrollbar-thumb) {
    background: transparent;
    border-radius: 3px;
  }

  .markdown-container-v2 :global(table:hover::-webkit-scrollbar-thumb) {
    background: var(--color-border);
  }

  .markdown-container-v2 :global(th) {
    min-width: 100px;
    white-space: nowrap;
  }

  .markdown-container-v2 :global(td) {
    min-width: 80px;
  }

  /* Padding cho cell đầu và cuối của mỗi row */
  .markdown-container-v2 :global(th:first-child),
  .markdown-container-v2 :global(td:first-child) {
    padding-left: 0.5em;
  }

  .markdown-container-v2 :global(th:last-child),
  .markdown-container-v2 :global(td:last-child) {
    padding-right: 0.5em;
  }
</style>
