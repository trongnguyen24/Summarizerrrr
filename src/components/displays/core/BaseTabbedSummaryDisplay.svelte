<script>
  // @ts-nocheck
  import TabbedSummaryDisplay from './TabbedSummaryDisplay.svelte'
  import GenericSummaryDisplay from './GenericSummaryDisplay.svelte'
  import TOC from '@/components/navigation/TOC.svelte'

  let {
    tabs,
    activeTab,
    onSelectTab,
    summaryData,
    noDataContent = null,
  } = $props()
</script>

<TabbedSummaryDisplay {tabs} {activeTab} {onSelectTab}>
  {#each tabs as tab}
    <div hidden={activeTab !== tab.id}>
      <GenericSummaryDisplay
        summary={summaryData[tab.id]?.summary}
        isLoading={summaryData[tab.id]?.isLoading}
        loadingText={summaryData[tab.id]?.loadingText}
        targetId={summaryData[tab.id]?.targetId}
        {noDataContent}
      />
      {#if activeTab === tab.id && !summaryData[tab.id]?.isLoading && summaryData[tab.id]?.summary}
        <TOC targetDivId={summaryData[tab.id]?.targetId} />
      {/if}
    </div>
  {/each}
</TabbedSummaryDisplay>
