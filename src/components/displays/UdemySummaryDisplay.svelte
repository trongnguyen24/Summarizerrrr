<script>
  // @ts-nocheck
  import TabNavigation from '../TabNavigation.svelte'
  import UdemyVideoSummary from './UdemyVideoSummary.svelte' // New: for Udemy video summary content
  import UdemyConceptsDisplay from './UdemyConceptsDisplay.svelte'
  // Import trực tiếp updateActiveUdemyTab từ summaryStore.svelte.js
  import {
    summaryState,
    updateActiveUdemyTab,
  } from '../../stores/summaryStore.svelte.js'

  let { activeUdemyTab } = $props()

  function selectUdemyTab(tabName) {
    updateActiveUdemyTab(tabName)
  }

  const udemyTabs = $derived([
    {
      id: 'udemySummary',
      label: 'Summary',
      show: true,
      isLoading: summaryState.isUdemySummaryLoading,
    },
    {
      id: 'udemyConcepts',
      label: 'Concepts',
      show: true,
      isLoading: summaryState.isUdemyConceptsLoading, // Sử dụng trạng thái loading riêng cho Concepts
    },
  ])
</script>

<div class="udemy-summary-container">
  <TabNavigation
    tabs={udemyTabs}
    activeTab={activeUdemyTab}
    onSelectTab={selectUdemyTab}
  />

  <div class="udemy-content mt-6">
    {#if activeUdemyTab === 'udemySummary'}
      <UdemyVideoSummary
        summary={summaryState.udemySummary}
        isLoading={summaryState.isUdemySummaryLoading}
        error={summaryState.udemySummaryError}
      />
    {:else if activeUdemyTab === 'udemyConcepts'}
      <UdemyConceptsDisplay
        udemyConcepts={summaryState.udemyConcepts}
        isUdemyLoading={summaryState.isUdemyConceptsLoading}
        udemyConceptsError={summaryState.udemyConceptsError}
      />
    {/if}
  </div>
</div>
