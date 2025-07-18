<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TOC from '../TOC.svelte'
  import FoooterDisplay from './FoooterDisplay.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'

  let { summary, isLoading, error } = $props()

  $effect(() => {
    if (summary && !isLoading) {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
</script>

{#if isLoading && !summary}
  <div class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse">
    Processing web summary...
  </div>
{/if}

{#if error}
  <div
    class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
  >
    <p class="text-sm">
      <span class="font-bold block">Web summary error</span>
      {error}
    </p>
    <div class="plus-icon red-plus-icon top-left"></div>
    <div class="plus-icon red-plus-icon bottom-right"></div>
  </div>
{/if}

{#if summary}
  <div id="web-summary-display">
    <div id="copy-cat">
      {@html marked.parse(summary)}
    </div>
    {#if !isLoading}
      <FoooterDisplay
        summaryContent={summary}
        summaryTitle={summaryState.pageTitle}
      />
      <TOC targetDivId="web-summary-display" />
    {/if}
  </div>
{/if}
