<!-- @ts-nocheck -->
<script>
  import TabNavigation from '@/components/navigation/TabNavigation.svelte'
  import MobileGenericSummaryDisplay from './MobileGenericSummaryDisplay.svelte'

  let {
    summary = '',
    chapterSummary = '',
    isLoading = false,
    isChapterLoading = false,
    isYouTube = false,
    error = null,
  } = $props()

  let activeTab = $state('summary')

  const tabs = $derived([
    {
      id: 'summary',
      label: 'Summary',
      show: true,
      isLoading: isLoading,
    },
    {
      id: 'chapters',
      label: 'Chapters',
      show: isYouTube,
      isLoading: isChapterLoading,
    },
  ])

  function onSelectTab(tabId) {
    activeTab = tabId
  }
</script>

<div class="mobile-summary-display">
  <TabNavigation {tabs} {activeTab} {onSelectTab} />

  <div class="mt-4">
    <div hidden={activeTab !== 'summary'}>
      <MobileGenericSummaryDisplay {summary} {isLoading} {error} />
    </div>

    <div hidden={activeTab !== 'chapters'}>
      <MobileGenericSummaryDisplay
        summary={chapterSummary}
        isLoading={isChapterLoading}
        {error}
      />
    </div>
  </div>
</div>

<style>
  .mobile-summary-display {
    /* Add any specific styling for the tabbed container if needed */
  }
</style>
