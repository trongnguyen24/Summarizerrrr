<script>
  import { marked } from 'marked'
  import TOC from './TOC.svelte'

  // Props received from App.svelte (or directly from summaryStore if desired)
  let {
    chapterSummary,
    isChapterLoading,
    chapterError,
    isYouTubeVideoActive,
    currentLoadingType,
  } = $props()
</script>

{#if isYouTubeVideoActive && currentLoadingType !== 'selectedText'}
  {#if isChapterLoading}
    <div class="text-center p-4 text-text-secondary animate-pulse">
      Generating chapter summary...
    </div>
  {/if}

  {#if chapterError}
    <div
      class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
    >
      <p class="text-sm">
        <span class="font-bold block">Chapter summary error</span>
        {chapterError}
      </p>
      <div class="plus-icon red-plus-icon top-left"></div>
      <div class="plus-icon red-plus-icon bottom-right"></div>
    </div>
  {/if}

  {#if chapterSummary && !isChapterLoading}
    <div id="chaptersummary">
      {@html marked.parse(chapterSummary)}
    </div>

    <TOC targetDivId="chaptersummary" />
  {:else if !isChapterLoading && !chapterError}
    <!-- Optional: Add a placeholder if no chapter summary and no error -->
    <!-- <p class="text-text-secondary text-center italic">No chapter summary available.</p> -->
  {/if}
{/if}
