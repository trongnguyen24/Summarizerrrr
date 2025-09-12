<script>
  // @ts-nocheck
  import SummaryWrapper from './SummaryWrapper.svelte'
  import SummaryContent from './SummaryContent.svelte'

  let {
    summary,
    isLoading,
    loadingText,
    targetId,
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
