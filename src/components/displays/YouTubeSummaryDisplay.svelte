<script>
  // @ts-nocheck
  import TabbedSummaryDisplay from './TabbedSummaryDisplay.svelte'
  import GenericSummaryDisplay from './GenericSummaryDisplay.svelte'
  import TOC from '../TOC.svelte'
  import {
    summaryState,
    updateActiveYouTubeTab,
  } from '../../stores/summaryStore.svelte.js'

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
</script>

<TabbedSummaryDisplay
  tabs={youtubeTabs}
  activeTab={activeYouTubeTab}
  onSelectTab={updateActiveYouTubeTab}
>
  <div hidden={activeYouTubeTab !== 'videoSummary'}>
    <GenericSummaryDisplay
      summary={summaryState.summary}
      isLoading={summaryState.isLoading}
      loadingText="Processing main YouTube summary..."
      targetId="youtube-video-summary-display"
    />
    {#if activeYouTubeTab === 'videoSummary' && summaryState.summary}
      <TOC targetDivId="youtube-video-summary-display" />
    {/if}
  </div>
  <div hidden={activeYouTubeTab !== 'chapterSummary'}>
    <GenericSummaryDisplay
      summary={summaryState.chapterSummary}
      isLoading={summaryState.isChapterLoading}
      loadingText="Generating chapter summary..."
      targetId="youtube-chapter-summary-display"
    />
    {#if activeYouTubeTab === 'chapterSummary' && summaryState.chapterSummary}
      <TOC targetDivId="youtube-chapter-summary-display" />
    {/if}
  </div>
</TabbedSummaryDisplay>
