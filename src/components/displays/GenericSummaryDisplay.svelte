<script>
  // @ts-nocheck
  import SummaryWrapper from './SummaryWrapper.svelte';
  import SummaryContent from './SummaryContent.svelte';

  let {
    summary,
    isLoading,
    error,
    loadingText,
    errorTitle,
    targetId,
    showTOC = false,
    noDataContent = null
  } = $props();
</script>

<SummaryWrapper
  {isLoading}
  data={summary}
  {error}
  {loadingText}
  {errorTitle}
>
  <SummaryContent {summary} {isLoading} {targetId} {showTOC} />
  <svelte:fragment slot="no-data">
    {#if noDataContent}
      {@render noDataContent()}
    {/if}
  </svelte:fragment>
</SummaryWrapper>