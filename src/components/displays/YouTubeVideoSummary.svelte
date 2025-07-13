<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TOC from '../TOC.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'
  import SaveToArchiveButton from '@/components/buttons/SaveToArchiveButton.svelte'

  let { summary, isLoading, error } = $props()

  $effect(() => {
    if (summary && !isLoading) {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
</script>

{#if isLoading}
  <div class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse">
    Processing main YouTube summary...
  </div>
{/if}

{#if error}
  <div
    class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20 mb-4"
  >
    <p class="text-sm">
      <span class="font-bold block">Main YouTube summary error</span>
      {error}
    </p>
    <div class="plus-icon red-plus-icon top-left"></div>
    <div class="plus-icon red-plus-icon bottom-right"></div>
  </div>
{/if}

{#if summary && !isLoading}
  <div id="youtube-video-summary-display">
    {@html marked.parse(summary)}
    {#if summaryState.summary && summaryState.lastSummaryTypeDisplayed === 'youtube'}
      <SaveToArchiveButton />
    {/if}
  </div>
  <TOC targetDivId="youtube-video-summary-display" />
{:else if !isLoading && !error}
  <!-- Optional: Placeholder for main YouTube summary -->
  <!-- <p class="text-text-secondary text-center italic">No main YouTube summary available.</p> -->
{/if}
