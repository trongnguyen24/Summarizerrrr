<!-- @ts-nocheck -->
<script>
  import StreamingMarkdown from '../StreamingMarkdown.svelte'
  import TOC from '../TOC.svelte'
  import FoooterDisplay from './FoooterDisplay.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'

  let { summary, isLoading, error } = $props()

  let isMarkdownRendered = $state(false)

  function handleMarkdownFinishTyping() {
    isMarkdownRendered = true
  }
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
    <StreamingMarkdown
      sourceMarkdown={summary}
      speed={1}
      class="custom-markdown-style"
      onFinishTyping={handleMarkdownFinishTyping}
    />
  </div>
  {#if !isLoading && isMarkdownRendered}
    <FoooterDisplay
      summaryContent={summary}
      summaryTitle={summaryState.pageTitle}
      targetId="web-summary-display"
    />
    <TOC targetDivId="web-summary-display" />
  {/if}
{/if}
