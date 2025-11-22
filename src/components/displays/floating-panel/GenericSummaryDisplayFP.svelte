<script>
  // @ts-nocheck
  import SummaryWrapper from '@/components/displays/floating-panel/SummaryWrapper.svelte'
  import SummaryContent from '@/components/displays/floating-panel/SummaryContentFP.svelte'
  import FloatingPanelFooter from './FloatingPanelFooter.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte.js'

  let {
    summary,
    isLoading,
    loadingText = 'Generating summary...',
    targetId = 'fp-generic-summary',
    showTOC = true,
    noDataContent = null,
    summarization,
  } = $props()
</script>

<SummaryWrapper
  {isLoading}
  data={summary}
  {loadingText}
  modelStatus={summaryState.modelStatus}
>
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
</SummaryWrapper>
