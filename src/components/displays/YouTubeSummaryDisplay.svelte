<!-- @ts-nocheck -->
<script>
  import TabNavigation from '../TabNavigation.svelte' // TabNavigation is in src/components
  import YouTubeVideoSummary from './YouTubeVideoSummary.svelte'
  import YouTubeChapterSummary from './YouTubeChapterSummary.svelte'
  import { summaryStore } from '../../stores/summaryStore.svelte.js' // Import summaryStore

  let {
    summary,
    chapterSummary,
    isLoading,
    isChapterLoading,
    error,
    chapterError,
  } = $props()

  let activeYouTubeTab = $derived(summaryStore.activeYouTubeTab) // Lấy từ summaryStore

  function selectYouTubeTab(tabName) {
    summaryStore.updateActiveYouTubeTab(tabName) // Cập nhật trong summaryStore
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
