<script>
  // @ts-nocheck
  import GenericSummaryDisplayFP from './GenericSummaryDisplayFP.svelte'

  let { summary = '', isLoading = false, summarization } = $props()
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
