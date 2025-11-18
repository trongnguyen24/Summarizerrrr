// @ts-nocheck
import { settings } from '@/stores/settingsStore.svelte.js'
import { useSummarization } from './useSummarization.svelte.js'

/**
 * Composable quản lý logic 1-click summarization
 * Kết hợp useSummarization với auto-panel và URL tracking
 */
export function useOneClickSummarization() {
  // Cache để track summary state theo URL để tránh re-summarize
  const summaryCache = new Map()

  // Get summarization composable
  const {
    localSummaryState,
    summaryToDisplay,
    statusToDisplay,
    summarizePageContent,
    summarizeChapters,
    summarizeComments,
    resetLocalSummaryState,
    handleSummarizationError,
    manualSaveToArchive,
  } = useSummarization()

  // State cho one-click behavior
  let oneClickState = $state({
    isOneClickMode: false,
    buttonState: 'idle', // 'idle', 'loading', 'error', 'has-summary'
    currentUrl: '',
    hasSummaryForCurrentUrl: false,
    onPanelOpen: null, // callback để auto-open panel
  })

  /**
   * Reset display state nhưng giữ cache
   * Gọi khi URL thay đổi để clear panel
   */
  function resetDisplayStateOnly() {
    // Reset local summary state (display)
    resetLocalSummaryState()

    // Reset one-click button state
    oneClickState.buttonState = 'idle'
    oneClickState.hasSummaryForCurrentUrl = false

    // NOTE: Không clear cache, giữ summaryCache Map nguyên vẹn
    console.log(
      '[useOneClickSummarization] Display state reset, cache preserved'
    )
  }

  /**
   * Initialize hoặc update one-click state khi URL thay đổi
   * NOTE: Không auto-restore cached summary nữa, user phải click lại
   */
  function initializeForUrl(url, onPanelOpenCallback) {
    oneClickState.currentUrl = url
    oneClickState.onPanelOpen = onPanelOpenCallback
    oneClickState.isOneClickMode = settings.oneClickSummarize || false

    // Check xem URL này đã có summary chưa (chỉ để set button state)
    const cacheKey = getCacheKey(url)
    const cachedSummary = summaryCache.get(cacheKey)

    // Set button state dựa trên cache
    if (cachedSummary) {
      oneClickState.buttonState = 'has-summary'
      oneClickState.hasSummaryForCurrentUrl = true
      // REMOVED: Không restore cached summary vào localSummaryState nữa
      // User phải click lại để load từ cache
    } else {
      oneClickState.buttonState = 'idle'
      oneClickState.hasSummaryForCurrentUrl = false
    }

    // Reset display state để panel hiển thị trống
    resetLocalSummaryState()

    console.log(
      '[useOneClickSummarization] Initialized for URL:',
      url,
      'Has cache:',
      !!cachedSummary
    )
  }

  /**
   * Tạo cache key từ URL (có thể customize logic này)
   */
  function getCacheKey(url) {
    // Loại bỏ hash và query parameters để handle SPA navigation
    try {
      const urlObj = new URL(url)
      return `${urlObj.origin}${urlObj.pathname}`
    } catch (error) {
      return url
    }
  }

  /**
   * Handle click trên FloatingButton
   * Return true nếu đã handle (prevent default toggle), false nếu để toggle bình thường
   */
  async function handleFloatingButtonClick() {
    // Nếu không phải one-click mode, return false để toggle bình thường
    if (!oneClickState.isOneClickMode) {
      return false
    }

    // Nếu đã có summary cho URL hiện tại, toggle panel thay vì re-summarize
    if (oneClickState.hasSummaryForCurrentUrl) {
      return false // Let normal toggle happen
    }

    try {
      // Set loading state
      oneClickState.buttonState = 'loading'

      // Start summarization
      await summarizePageContent()

      // Cache kết quả
      const currentState = localSummaryState()
      const cacheKey = getCacheKey(oneClickState.currentUrl)
      summaryCache.set(cacheKey, {
        summary: currentState.summary,
        chapterSummary: currentState.chapterSummary,
        courseConcepts: currentState.courseConcepts,
        contentType: currentState.contentType,
        pageTitle: currentState.pageTitle,
        pageUrl: currentState.pageUrl,
        timestamp: Date.now(),
      })

      // Update state
      oneClickState.hasSummaryForCurrentUrl = true
      oneClickState.buttonState = 'has-summary'

      // Auto-open panel
      if (oneClickState.onPanelOpen) {
        oneClickState.onPanelOpen()
      }
    } catch (error) {
      console.error(
        '[useOneClickSummarization] One-click summarization failed:',
        error
      )

      // Handle error properly để hiển thị trong panel
      handleSummarizationError(error)

      // Show error state briefly
      oneClickState.buttonState = 'error'

      // Flash error cho 1.5s rồi về idle
      setTimeout(() => {
        oneClickState.buttonState = 'idle'
      }, 1500)

      // Vẫn auto-open panel để hiển thị error
      if (oneClickState.onPanelOpen) {
        setTimeout(() => {
          oneClickState.onPanelOpen()
        }, 500) // Delay một chút để user thấy error state
      }
    }

    return true // Prevent default toggle
  }

  /**
   * Clear cache cho URL cụ thể hoặc toàn bộ
   */
  function clearSummaryCache(url = null) {
    if (url) {
      const cacheKey = getCacheKey(url)
      summaryCache.delete(cacheKey)
    } else {
      summaryCache.clear()
    }

    // Reset current URL state nếu match
    if (!url || url === oneClickState.currentUrl) {
      oneClickState.hasSummaryForCurrentUrl = false
      oneClickState.buttonState = 'idle'
    }
  }

  /**
   * Update settings khi user thay đổi one-click mode
   */
  function updateOneClickMode(enabled) {
    oneClickState.isOneClickMode = enabled
  }

  // Reactively update one-click mode khi settings thay đổi
  $effect(() => {
    if (settings.oneClickSummarize !== oneClickState.isOneClickMode) {
      updateOneClickMode(settings.oneClickSummarize)
    }
  })

  return {
    // State
    oneClickState: () => oneClickState,
    localSummaryState,
    summaryToDisplay,
    statusToDisplay,

    // Actions
    initializeForUrl,
    handleFloatingButtonClick,
    clearSummaryCache,
    resetDisplayStateOnly, // NEW: Reset display state khi URL thay đổi
    updateOneClickMode,
    manualSaveToArchive,

    // Direct access to base summarization if needed
    summarizePageContent,
    summarizeChapters,
    summarizeComments,
    resetLocalSummaryState,
    handleSummarizationError,
  }
}
