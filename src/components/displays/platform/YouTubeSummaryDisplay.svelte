<script>
  // @ts-nocheck
  import GenericSummaryDisplay from '../core/GenericSummaryDisplay.svelte'
  import { summaryState } from '../../../stores/summaryStore.svelte.js'
</script>

<!-- Video Summary -->
{#if summaryState.summary || summaryState.isLoading}
  <GenericSummaryDisplay
    summary={summaryState.summary}
    isLoading={summaryState.isLoading}
    loadingText="Processing YouTube summary..."
    targetId="youtube-summary-display"
    showTOC={true}
  />
{/if}
