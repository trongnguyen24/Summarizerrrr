<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TOC from '../TOC.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'
  import SaveToArchiveButton from '@/components/buttons/SaveToArchiveButton.svelte'

  let { chapterSummary, isChapterLoading, chapterError } = $props()

  $effect(() => {
    if (chapterSummary && !isChapterLoading) {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
</script>

{#if isChapterLoading}
  <div class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse">
    Generating chapter summary...
  </div>
{/if}

{#if chapterError}
  <div
    class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
  >
    <p class="text-sm">
      <span class="font-bold block">Chapters summary error</span>
      {chapterError}
    </p>
    <div class="plus-icon red-plus-icon top-left"></div>
    <div class="plus-icon red-plus-icon bottom-right"></div>
  </div>
{/if}

{#if chapterSummary && !isChapterLoading}
  <div id="chaptersummary">
    {@html marked.parse(chapterSummary)}
    {#if summaryState.chapterSummary && summaryState.lastSummaryTypeDisplayed === 'youtube' && summaryState.activeYouTubeTab === 'chapterSummary'}
      <SaveToArchiveButton
        summaryContent={summaryState.chapterSummary}
        summaryType="chapter"
      />
    {/if}
  </div>

  <TOC targetDivId="chaptersummary" />
{:else if !isChapterLoading && !chapterError}
  <!-- Optional: Add a placeholder if no chapter summary and no error -->
  <!-- <p class="text-text-secondary text-center italic">No chapter summary available.</p> -->
{/if}
