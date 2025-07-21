<!-- @ts-nocheck -->
<script>
  import StreamingMarkdown from '../StreamingMarkdown.svelte'
  import TOC from '../TOC.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'
  import FoooterDisplay from './FoooterDisplay.svelte'

  let { selectedTextSummary, isSelectedTextLoading, selectedTextError } =
    $props()

  let isMarkdownRendered = $state(false)

  function handleMarkdownFinishTyping() {
    isMarkdownRendered = true
  }
</script>

{#if isSelectedTextLoading && !selectedTextSummary}
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

{#if selectedTextSummary}
  <div id="selected-text-summary-display">
    <StreamingMarkdown
      sourceMarkdown={selectedTextSummary}
      speed={1}
      class="custom-markdown-style"
      onFinishTyping={handleMarkdownFinishTyping}
    />
  </div>
  {#if !isSelectedTextLoading && isMarkdownRendered}
    <FoooterDisplay
      summaryContent={selectedTextSummary}
      summaryTitle={summaryState.pageTitle}
      targetId="selected-text-summary-display"
    />
    <TOC targetDivId="selected-text-summary-display" />
  {/if}
{/if}
