<!-- @ts-nocheck -->
<script>
  import TabNavigation from '../TabNavigation.svelte'
  import YouTubeVideoSummary from './YouTubeVideoSummary.svelte'
  import YouTubeChapterSummary from './YouTubeChapterSummary.svelte'
  import {
    summaryState,
    updateActiveYouTubeTab,
  } from '../../stores/summaryStore.svelte.js'

  let { activeYouTubeTab } = $props()

  function selectYouTubeTab(tabName) {
    updateActiveYouTubeTab(tabName)
  }

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

<div class="youtube-summary-container">
  <TabNavigation
    tabs={youtubeTabs}
    activeTab={activeYouTubeTab}
    onSelectTab={selectYouTubeTab}
  />

  <div class="youtube-content mt-6">
    {#if activeYouTubeTab === 'videoSummary'}
      <YouTubeVideoSummary
        summary={summaryState.summary}
        isLoading={summaryState.isLoading}
        error={summaryState.error}
      />
    {:else if activeYouTubeTab === 'chapterSummary'}
      <YouTubeChapterSummary
        chapterSummary={summaryState.chapterSummary}
        isChapterLoading={summaryState.isChapterLoading}
        chapterError={summaryState.chapterError}
      />
    {/if}
  </div>
</div>
