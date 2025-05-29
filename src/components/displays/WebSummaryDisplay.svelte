<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import TOC from '../TOC.svelte'

  let { summary, isLoading, error } = $props()
</script>

{#if isLoading}
  <div class="text-center p-4 text-text-secondary animate-pulse">
    Processing web summary...
  </div>
{/if}

{#if error}
  <div
    class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
  >
    <p class="text-sm">
      <span class="font-bold block">Wed summary error</span>
      {error}
    </p>
    <div class="plus-icon red-plus-icon top-left"></div>
    <div class="plus-icon red-plus-icon bottom-right"></div>
  </div>
{/if}

{#if summary && !isLoading}
  <div id="summary">
    {@html marked.parse(summary)}
  </div>

  <TOC targetDivId="summary" />
{:else if !isLoading && !error}
  <!-- Optional: Add a placeholder if no summary and no error -->
  <!-- <p class="text-text-secondary text-center italic">No summary available.</p> -->
{/if}
