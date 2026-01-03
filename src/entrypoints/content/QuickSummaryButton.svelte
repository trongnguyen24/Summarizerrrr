<script>
  // @ts-nocheck
  /**
   * Quick Summary Button Component
   * Displays on YouTube thumbnails for quick background summarization
   */
  import './styles/quick-summary-button.css'

  let { videoId = '' } = $props()

  let isLoading = $state(false)

  async function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()

    console.log('[QuickSummaryButton] Clicked, videoId:', videoId)

    if (!videoId) {
      console.error('[QuickSummaryButton] No videoId!')
      return
    }

    isLoading = true

    try {
      const response = await browser.runtime.sendMessage({
        type: 'QUICK_SUMMARY_OPEN_TAB',
        videoId,
      })
      console.log('[QuickSummaryButton] Response:', response)

      setTimeout(() => {
        isLoading = false
      }, 1000)
    } catch (error) {
      console.error('[QuickSummaryButton] Failed to send message:', error)
      isLoading = false
    }
  }
</script>

<div class="qs-icon-wrapper">
  <button
    class="qs-icon-btn"
    class:qs-loading={isLoading}
    title="Quick Summary"
    onclick={handleClick}
    disabled={isLoading}
  >
    <!-- Lightning bolt icon -->
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none"
      ><circle cx="10" cy="10" r="9.5" stroke="#fff" /><path
        fill="#fff"
        d="m10 17 .483-1.932a6.3 6.3 0 0 1 4.585-4.585L17 10l-1.932-.483a6.3 6.3 0 0 1-4.585-4.585L10 3l-.483 1.932a6.3 6.3 0 0 1-4.583 4.585L3 10l1.934.483a6.3 6.3 0 0 1 4.583 4.585L10 17Z"
      /></svg
    >
  </button>
</div>
