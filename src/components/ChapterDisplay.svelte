<script>
  import Icon from '@iconify/svelte'
  import { marked } from 'marked'
  import TOC from './TOC.svelte'

  // Props received from App.svelte (or directly from summaryStore if desired)
  let { chapterSummary, isChapterLoading, chapterError } = $props()
</script>

{#if isChapterLoading}
  <div class="text-center p-4 text-text-secondary animate-pulse">
    Generating chapter summary...
  </div>
{/if}

{#if chapterError}
  <div
    class="flex gap-2 w-fit mx-auto text-orange-400 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg"
  >
    <Icon
      class="mt-0.5 flex-shrink-0"
      width={16}
      icon="heroicons:exclamation-triangle-16-solid"
    />
    <p class="text-sm">
      <span class="font-bold">Chapter summary error:</span>
      {chapterError}
    </p>
  </div>
{/if}

{#if chapterSummary && !isChapterLoading}
  <div id="chaptersummary" class="prose-sm sm:prose-base max-w-none">
    {@html marked.parse(chapterSummary)}
  </div>

  <TOC targetDivId="chaptersummary" />
{:else if !isChapterLoading && !chapterError}
  <!-- Optional: Add a placeholder if no chapter summary and no error -->
  <!-- <p class="text-text-secondary text-center italic">No chapter summary available.</p> -->
{/if}
