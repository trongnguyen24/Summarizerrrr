<!-- @ts-nocheck -->
<script>
  // Import trực tiếp các biến và hàm từ summaryStore đã refactor
  import { summaryState } from '../stores/summaryStore.svelte.js'

  import WebSummaryDisplay from './displays/WebSummaryDisplay.svelte'
  import YouTubeSummaryDisplay from './displays/YouTubeSummaryDisplay.svelte'
  import SelectedTextSummaryDisplay from './displays/SelectedTextSummaryDisplay.svelte'
</script>

<!-- Loại bỏ summary-display-container và summary-content nếu không có CSS tùy chỉnh -->
<div id="summarydisplay" class="w-full select-text">
  {#if summaryState.lastSummaryTypeDisplayed === 'selectedText'}
    <SelectedTextSummaryDisplay
      selectedTextSummary={summaryState.selectedTextSummary}
      isSelectedTextLoading={summaryState.isSelectedTextLoading}
      selectedTextError={summaryState.selectedTextError}
    />
  {:else if summaryState.isYouTubeVideoActive}
    <YouTubeSummaryDisplay activeYouTubeTab={summaryState.activeYouTubeTab} />
  {:else}
    <WebSummaryDisplay
      summary={summaryState.summary}
      isLoading={summaryState.isLoading}
      error={summaryState.error}
    />
  {/if}
</div>
