<!-- @ts-nocheck -->
<script>
  import StreamingMarkdown from '../StreamingMarkdown.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'
  import FoooterDisplay from './FoooterDisplay.svelte'

  let { summary, isLoading, error } = $props()
</script>

{#if isLoading && !summary}
  <div class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse">
    Processing main Course summary...
  </div>
{/if}

{#if error}
  <div
    class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20 mb-4"
  >
    <p class="text-sm">
      <span class="font-bold block">Main Course summary error</span>
      {error}
    </p>
    <div class="plus-icon red-plus-icon top-left"></div>
    <div class="plus-icon red-plus-icon bottom-right"></div>
  </div>
{/if}

{#if summary}
  <div id="course-video-summary-display">
    <StreamingMarkdown sourceMarkdown={summary} speed={1} />
  </div>
  {#if !isLoading}
    <FoooterDisplay
      summaryContent={summary}
      summaryTitle={summaryState.pageTitle}
    />
  {/if}
{/if}
