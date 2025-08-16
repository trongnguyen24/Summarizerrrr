<script>
  // @ts-nocheck
  import BaseTabbedSummaryDisplay from '../core/BaseTabbedSummaryDisplay.svelte'
  import {
    summaryState,
    updateActiveYouTubeTab,
  } from '../../../stores/summaryStore.svelte.js'

  let { activeYouTubeTab } = $props()

  const youtubeTabs = $derived([
    {
      id: 'videoSummary',
      label: 'Summary',
      show: true,
      isLoading: summaryState.isLoading,
    },
    {
      id: 'chapterSummary',
      label: 'Chapters',
      show: true,
      isLoading: summaryState.isChapterLoading,
    },
  ])

  const summaryData = $derived({
    videoSummary: {
      summary: summaryState.summary,
      isLoading: summaryState.isLoading,
      loadingText: 'Processing main YouTube summary...',
      targetId: 'youtube-video-summary-display',
    },
    chapterSummary: {
      summary: summaryState.chapterSummary,
      isLoading: summaryState.isChapterLoading,
      loadingText: 'Generating chapter summary...',
      targetId: 'youtube-chapter-summary-display',
    },
  })
</script>

<BaseTabbedSummaryDisplay
  tabs={youtubeTabs}
  activeTab={activeYouTubeTab}
  onSelectTab={updateActiveYouTubeTab}
  {summaryData}
/>
