<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import TOC from '../TOC.svelte'

  let { selectedTextSummary, isSelectedTextLoading, selectedTextError } =
    $props()
</script>

{#if isSelectedTextLoading}
  <div class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse">
    Summarizing selected text...
  </div>
{/if}

{#if selectedTextError}
  <div
    class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
  >
    <p class="text-sm">
      <span class="font-bold block">Selected text summary error</span>
      {selectedTextError}
    </p>
    <div class="plus-icon red-plus-icon top-left"></div>
    <div class="plus-icon red-plus-icon bottom-right"></div>
  </div>
{/if}

{#if selectedTextSummary && !isSelectedTextLoading}
  <div id="selected-text-summary">
    {@html marked.parse(selectedTextSummary)}
  </div>

  <TOC targetDivId="selected-text-summary" />
{:else if !isSelectedTextLoading && !selectedTextError}
  <!-- Optional: Add a placeholder if no selected text summary and no error -->
  <!-- <p class="text-text-secondary text-center italic">No selected text summary available.</p> -->
{/if}
