<!-- @ts-nocheck -->
<script>
  import TabNavigation from '../TabNavigation.svelte'
  import YouTubeVideoSummary from './YouTubeVideoSummary.svelte'
  import YouTubeChapterSummary from './YouTubeChapterSummary.svelte'
  // Import trực tiếp updateActiveYouTubeTab từ summaryStore.svelte.js
  import {
    summaryState,
    updateActiveYouTubeTab,
  } from '../../stores/summaryStore.svelte.js'

  let {
    activeYouTubeTab, // Thêm activeYouTubeTab vào props
  } = $props()

  // Các biến này sẽ được lấy từ summaryState
  const {
    summary,
    chapterSummary,
    isLoading,
    isChapterLoading,
    error,
    chapterError,
  } = summaryState

  function selectYouTubeTab(tabName) {
    updateActiveYouTubeTab(tabName) // Gọi hàm trực tiếp
  }

  const youtubeTabs = $derived([
    { id: 'videoSummary', label: 'Summary', show: true },
    { id: 'chapterSummary', label: 'Chapters', show: true },
  ])
</script>

<div class="youtube-summary-container">
  <TabNavigation
    tabs={youtubeTabs}
    activeTab={activeYouTubeTab}
    on:selectTab={(e) => selectYouTubeTab(e.detail)}
  />

  <div class="youtube-content mt-4">
    {#if activeYouTubeTab === 'videoSummary'}
      <YouTubeVideoSummary {summary} {isLoading} {error} />
    {:else if activeYouTubeTab === 'chapterSummary'}
      <YouTubeChapterSummary
        {chapterSummary}
        {isChapterLoading}
        {chapterError}
      />
    {/if}
  </div>
</div>
