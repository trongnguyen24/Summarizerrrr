<script>
  // @ts-nocheck
  import GenericSummaryDisplayFP from './GenericSummaryDisplayFP.svelte'

  let {
    summary = '',
    chapterSummary = '',
    isLoading = false,
    isChapterLoading = false,
    summarization,
  } = $props()
</script>

<!-- Video Summary -->
{#if summary || isLoading}
  <GenericSummaryDisplayFP
    {summary}
    {isLoading}
    loadingText="Processing YouTube summary..."
    targetId="fp-youtube-summary-display"
    {summarization}
  />
{/if}

<!-- Chapter Summary - Display separately when available -->
{#if chapterSummary || isChapterLoading}
  <div class="mt-8">
    <GenericSummaryDisplayFP
      summary={chapterSummary}
      isLoading={isChapterLoading}
      loadingText="Generating chapter summary..."
      targetId="fp-youtube-chapter-summary-display"
      {summarization}
    />
  </div>
{/if}
