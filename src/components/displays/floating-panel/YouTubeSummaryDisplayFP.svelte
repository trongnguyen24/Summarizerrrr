<script>
  // @ts-nocheck
  import GenericSummaryDisplayFP from './GenericSummaryDisplayFP.svelte'

  let {
    summary = '',
    isLoading = false,
    summarization,
    loadingText = 'Processing YouTube summary...',
  } = $props()
</script>

<!-- Video Summary -->
{#if summary || isLoading}
  <GenericSummaryDisplayFP
    {summary}
    {isLoading}
    {loadingText}
    targetId="fp-youtube-summary-display"
    {summarization}
  />
{/if}
