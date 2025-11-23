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

<div id="summary-content" class="text-text-secondary">
  {#if currentSummary}
    <div id="copy-cat">{@html marked.parse(currentSummary.content)}</div>
  {/if}
</div>
