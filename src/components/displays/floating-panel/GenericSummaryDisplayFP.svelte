<script>
  // @ts-nocheck
  import SummaryWrapper from '@/components/displays/core/SummaryWrapper.svelte'
  import SummaryContent from '@/components/displays/core/SummaryContent.svelte'
  import FloatingPanelFooter from './FloatingPanelFooter.svelte'

  let {
    summary,
    isLoading,
    loadingText = 'Generating summary...',
    targetId = 'fp-generic-summary',
    showTOC = false,
    noDataContent = null,
    summarization,
  } = $props()
</script>

<SummaryWrapper {isLoading} data={summary} {loadingText}>
  <SummaryContent {summary} {isLoading} {targetId} {showTOC} />
  {#if !isLoading && summary}
    <FloatingPanelFooter
      localSummaryState={summarization.localSummaryState()}
      onSave={summarization.manualSaveToArchive}
      summaryContent={summary}
      summaryTitle={summarization.localSummaryState().pageTitle || 'Summary'}
      {targetId}
    />
  {/if}
  <svelte:fragment slot="no-data">
    {#if noDataContent}
      {@render noDataContent()}
    {/if}
  </svelte:fragment>
</SummaryWrapper>
