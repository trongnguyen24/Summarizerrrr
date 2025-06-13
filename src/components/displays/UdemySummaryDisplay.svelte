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
      isLoading: summaryState.isUdemyLoading,
    },
    {
      id: 'udemyConcepts',
      label: 'Concepts',
      show: true,
      isLoading: summaryState.isUdemyLoading, // Cả hai tab đều dùng chung trạng thái loading của Udemy
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
        isLoading={summaryState.isUdemyLoading}
        error={summaryState.udemySummaryError}
      />
    {:else if activeUdemyTab === 'udemyConcepts'}
      <UdemyConceptsDisplay
        udemyConcepts={summaryState.udemyConcepts}
        isUdemyLoading={summaryState.isUdemyLoading}
        udemyConceptsError={summaryState.udemyConceptsError}
      />
    {/if}
  </div>
</div>
