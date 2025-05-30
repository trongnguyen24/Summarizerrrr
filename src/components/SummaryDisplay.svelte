<!-- @ts-nocheck -->
<script>
  import { summaryStore } from '../stores/summaryStore.svelte.js'
  import WebSummaryDisplay from './displays/WebSummaryDisplay.svelte'
  import YouTubeSummaryDisplay from './displays/YouTubeSummaryDisplay.svelte'
  import SelectedTextSummaryDisplay from './displays/SelectedTextSummaryDisplay.svelte'

  // Lấy trạng thái từ summaryStore dưới dạng reactive variables
  let summary = $derived(summaryStore.summary)
  let chapterSummary = $derived(summaryStore.chapterSummary)
  let selectedTextSummary = $derived(summaryStore.selectedTextSummary)
  let isLoading = $derived(summaryStore.isLoading)
  let isChapterLoading = $derived(summaryStore.isChapterLoading)
  let isSelectedTextLoading = $derived(summaryStore.isSelectedTextLoading)
  let error = $derived(summaryStore.error)
  let chapterError = $derived(summaryStore.chapterError)
  let selectedTextError = $derived(summaryStore.selectedTextError)
  let isYouTubeVideoActive = $derived(summaryStore.isYouTubeVideoActive)
  let currentContentSource = $derived(summaryStore.currentContentSource)

  // Quản lý tab đang hoạt động (activeTab sẽ được quản lý bởi các component con nếu cần)
  // activeTab, selectTab, và tabs không còn cần thiết ở đây.
</script>

<div class="summary-display-container">
  <div class="summary-content mt-4">
    <!-- <SelectedTextSummaryDisplay
        {selectedTextSummary}
        {isSelectedTextLoading}
        {selectedTextError}
      /> -->
    <YouTubeSummaryDisplay
      {summary}
      {chapterSummary}
      {isLoading}
      {isChapterLoading}
      {error}
      {chapterError}
    />

    <!-- ---

    <WebSummaryDisplay {summary} {isLoading} {error} /> -->
  </div>
</div>
