<script>
  import Icon from '@iconify/svelte'
  import { marked } from 'marked'
  import TOC from './TOC.svelte'

  // Props received from App.svelte (or directly from summaryStore if desired)
  let { summary, isLoading, error } = $props()
</script>

{#if isLoading}
  <div class="text-center p-4 text-text-secondary animate-pulse">
    Processing main summary...
  </div>
{/if}

{#if error}
  <div
    class="flex gap-2 w-fit mx-auto text-red-400 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
  >
    <Icon
      class="mt-0.5 flex-shrink-0"
      width={16}
      icon="heroicons:exclamation-circle-16-solid"
    />
    <p class="text-sm">
      <span class="font-bold">Main summary error:</span>
      {error}
    </p>
  </div>
{/if}

{#if summary && !isLoading}
  <div id="summary" class="prose-sm sm:prose-base max-w-none">
    {@html marked.parse(summary)}
  </div>

  <TOC targetDivId="summary" />
{:else if !isLoading && !error}
  <!-- Optional: Add a placeholder if no summary and no error -->
  <!-- <p class="text-text-secondary text-center italic">No summary available.</p> -->
{/if}
