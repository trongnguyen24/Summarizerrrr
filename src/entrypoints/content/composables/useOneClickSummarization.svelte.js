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
   * Initialize hoặc update one-click state khi URL thay đổi
   */
  function initializeForUrl(url, onPanelOpenCallback) {
    oneClickState.currentUrl = url
    oneClickState.onPanelOpen = onPanelOpenCallback
    oneClickState.isOneClickMode = settings.oneClickSummarize || false

    // Check xem URL này đã có summary chưa
    const cacheKey = getCacheKey(url)
    const cachedSummary = summaryCache.get(cacheKey)
    oneClickState.hasSummaryForCurrentUrl = !!cachedSummary

    // Set button state dựa trên cache
    if (cachedSummary) {
      oneClickState.buttonState = 'has-summary'
      // Restore cached summary to display
      if (cachedSummary.summary) {
        const currentState = localSummaryState()
        Object.assign(currentState, cachedSummary)
      }
    } else {
      oneClickState.buttonState = 'idle'
    }

    console.log(
      `[useOneClickSummarization] Initialized for URL: ${url}, hasCache: ${!!cachedSummary}`
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
      console.log(
        '[useOneClickSummarization] Has summary, toggling panel instead'
      )
      return false // Let normal toggle happen
    }

    // Bắt đầu one-click summarization
    console.log(
      '[useOneClickSummarization] Starting one-click summarization...'
    )

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
        console.log('[useOneClickSummarization] Auto-opening panel...')
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
      console.log(`[useOneClickSummarization] Cleared cache for URL: ${url}`)
    } else {
      summaryCache.clear()
      console.log('[useOneClickSummarization] Cleared entire summary cache')
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
    console.log(
      `[useOneClickSummarization] One-click mode ${
        enabled ? 'enabled' : 'disabled'
      }`
    )
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
    updateOneClickMode,
    manualSaveToArchive,

    // Direct access to base summarization if needed
    summarizePageContent,
    resetLocalSummaryState,
    handleSummarizationError,
  }
}
