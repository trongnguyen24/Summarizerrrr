<script>
  // @ts-nocheck
  import SummaryWrapper from '@/components/displays/SummaryWrapper.svelte'
  import SummaryContent from '@/components/displays/SummaryContent.svelte'

  let {
    summary,
    isLoading,
    loadingText = 'Generating summary...',
    targetId = 'fp-generic-summary',
    showTOC = false,
    noDataContent = null,
  } = $props()
</script>

<SummaryWrapper {isLoading} data={summary} {loadingText}>
  <SummaryContent {summary} {isLoading} {targetId} {showTOC} />
  <svelte:fragment slot="no-data">
    {#if noDataContent}
      {@render noDataContent()}
    {/if}
  </svelte:fragment>
</SummaryWrapper>
