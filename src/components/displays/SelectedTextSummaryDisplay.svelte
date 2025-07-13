<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TOC from '../TOC.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'
  import SaveToArchiveButton from '@/components/buttons/SaveToArchiveButton.svelte'

  let { selectedTextSummary, isSelectedTextLoading, selectedTextError } =
    $props()

  $effect(() => {
    if (selectedTextSummary && !isSelectedTextLoading) {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
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
  <div id="selected-text-summary-display">
    {@html marked.parse(selectedTextSummary)}
    {#if summaryState.selectedTextSummary && summaryState.lastSummaryTypeDisplayed === 'selectedText'}
      <SaveToArchiveButton />
    {/if}
  </div>

  <TOC targetDivId="selected-text-summary-display" />
{:else if !isSelectedTextLoading && !selectedTextError}
  <!-- Optional: Add a placeholder if no selected text summary and no error -->
  <!-- <p class="text-text-secondary text-center italic">No selected text summary available.</p> -->
{/if}
