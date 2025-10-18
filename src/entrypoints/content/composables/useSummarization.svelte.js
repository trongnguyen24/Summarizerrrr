// @ts-nocheck
import { loadSettings, settings } from '@/stores/settingsStore.svelte.js'
import { ContentExtractorService } from '../services/ContentExtractorService.js'
import { SummarizationService } from '../services/SummarizationService.js'
import {
  saveToHistory,
  saveToArchive,
} from '../services/FloatingPanelStorageService.js'

// Flag để prevent concurrent requests
let isProcessing = false

/**
 * Composable quản lý summarization state và logic
 */
export function useSummarization() {
  // Local summarization state - independent from global summaryState
  let localSummaryState = $state({
    isLoading: false,
    summary: '',
    error: null,
    contentType: 'general',
    startTime: null,
    streamingEnabled: false,
    // Extra fields cho FP displays
    chapterSummary: '',
    isChapterLoading: false,
    courseConcepts: '',
    isCourseConceptsLoading: false,
    // State cho việc lưu trữ
    isSavedToHistory: false,
    isSavedToArchive: false,
    historyId: null, // Lưu ID của bản ghi history
    saveError: null,
    pageTitle: '', // Thêm pageTitle
    pageUrl: '', // Thêm pageUrl
  })

  /**
   * Reset local summary state
   */
  function resetLocalSummaryState() {
    localSummaryState.isLoading = false
    localSummaryState.summary = ''
    localSummaryState.error = null
    localSummaryState.contentType = 'general'
    localSummaryState.startTime = null
    localSummaryState.streamingEnabled = false
    localSummaryState.chapterSummary = ''
    localSummaryState.isChapterLoading = false
    localSummaryState.courseConcepts = ''
    localSummaryState.isCourseConceptsLoading = false
    localSummaryState.isSavedToHistory = false
    localSummaryState.isSavedToArchive = false
    localSummaryState.historyId = null
    localSummaryState.saveError = null
    localSummaryState.pageTitle = ''
    localSummaryState.pageUrl = ''
  }

  /**
   * Handle summarization error
   * @param {Error} error
   */
  function handleSummarizationError(error) {
    console.error('[useSummarization] Summarization error:', error)

    localSummaryState.error = {
      message: error.message || 'Unknown error occurred',
      type: error.type || 'GENERAL_ERROR',
      timestamp: Date.now(),
    }

    // Display user-friendly error messages
    if (error.type === 'API_KEY') {
      localSummaryState.error.message =
        'API key not configured. Please check settings.'
    } else if (error.type === 'CONTENT') {
      localSummaryState.error.message =
        'Could not extract content from this page.'
    } else if (error.type === 'NETWORK') {
      localSummaryState.error.message =
        'Network error. Please check your connection.'
    }
  }

  /**
   * Main summarization function với independent loading
   */
  async function summarizePageContent(customContentType = null) {
    // Prevent multiple concurrent requests
    if (isProcessing) {
      console.log(
        '[useSummarization] Summarization already in progress, ignoring duplicate request'
      )
      return
    }

    // Set immediate loading state để disable button ngay lập tức
    localSummaryState.isLoading = true
    isProcessing = true

    try {
      console.log('[useSummarization] Starting independent summarization...')

      // 1. Reset state (giữ lại isLoading = true)
      const wasLoading = localSummaryState.isLoading
      resetLocalSummaryState()
      localSummaryState.isLoading = wasLoading
      localSummaryState.startTime = Date.now()

      // 2. Get Page Info directly from the document
      localSummaryState.pageTitle = document.title || 'Unknown Title'
      localSummaryState.pageUrl = window.location.href

      // 3. Load settings
      await loadSettings()

      // 3. Initialize services
      const contentExtractor = new ContentExtractorService(
        (settings?.uiLanguage || 'en').slice(0, 2)
      )
      const summarizationService = new SummarizationService(contentExtractor)

      // 4. Extract content MỘT LẦN DUY NHẤT
      let contentType, content
      if (customContentType) {
        // Nếu có customContentType, chỉ extract content không detect type
        const extractResult = await contentExtractor.extractPageContent()
        content = extractResult.content
        contentType = customContentType
      } else {
        // Logic gốc - detect content type tự động
        const extractResult = await contentExtractor.extractPageContent()
        contentType = extractResult.contentType
        content = extractResult.content
      }
      localSummaryState.contentType = contentType
      localSummaryState.streamingEnabled =
        summarizationService.shouldUseStreaming(settings)

      // 5. Course content: Gọi APIs parallel nhưng update UI independently
      if (contentType === 'course') {
        // Start both loading states
        localSummaryState.isLoading = true
        localSummaryState.isCourseConceptsLoading = true

        // Course Summary - Independent API call với content đã có
        const courseSummaryPromise = (async () => {
          try {
            console.log('[useSummarization] Starting course summary...')
            const result =
              await summarizationService.summarizeCourseSummaryWithContent(
                content,
                settings
              )
            localSummaryState.summary = result.summary
            console.log(
              '[useSummarization] Course summary completed and displayed'
            )
          } catch (error) {
            console.error('[useSummarization] Course summary error:', error)
            handleSummarizationError(error)
          } finally {
            localSummaryState.isLoading = false
          }
        })()

        // Course Concepts - Independent API call với content đã có
        const courseConceptsPromise = (async () => {
          try {
            console.log('[useSummarization] Starting course concepts...')
            const result =
              await summarizationService.extractCourseConceptsWithContent(
                content,
                settings
              )
            localSummaryState.courseConcepts = result.courseConcepts
            console.log(
              '[useSummarization] Course concepts completed and displayed'
            )
          } catch (error) {
            console.error('[useSummarization] Course concepts error:', error)
            // Set fallback content for concepts
            localSummaryState.courseConcepts =
              '<p><i>Could not generate course concepts.</i></p>'
          } finally {
            localSummaryState.isCourseConceptsLoading = false
          }
        })()

        // Don't wait for both to complete - let them update UI independently
        await Promise.allSettled([courseSummaryPromise, courseConceptsPromise])
      } else {
        // Non-course content: Use original logic hoặc custom actions
        localSummaryState.isLoading = true
        if (contentType === 'youtube') {
          localSummaryState.isChapterLoading = true
        }

        // Nếu là custom action, gọi API trực tiếp
        if (
          customContentType &&
          ['analyze', 'explain', 'debate'].includes(customContentType)
        ) {
          const { summarizeContent } = await import('@/lib/api/api.js')
          localSummaryState.summary = await summarizeContent(
            content,
            customContentType
          )
        } else {
          // Logic gốc cho content thường - TRUYỀN CONTENT ĐÃ CÓ
          const result = await summarizationService.summarizeWithContent(
            content,
            contentType,
            settings
          )
          localSummaryState.summary = result.summary
          if (result.chapterSummary) {
            localSummaryState.chapterSummary = result.chapterSummary
          }
        }

        localSummaryState.isLoading = false
        if (contentType === 'youtube') {
          localSummaryState.isChapterLoading = false
        }
      }

      const duration = Date.now() - localSummaryState.startTime
      console.log(`[useSummarization] Summarization completed in ${duration}ms`)

      // 6. Auto-save to history
      await autoSaveToHistory()
    } catch (error) {
      handleSummarizationError(error)
      // Reset loading states on error
      localSummaryState.isLoading = false
      localSummaryState.isChapterLoading = false
      localSummaryState.isCourseConceptsLoading = false
    } finally {
      // Reset processing flag
      isProcessing = false
    }
  }

  async function autoSaveToHistory() {
    try {
      console.log('[useSummarization] Auto-saving to history...')

      // Validate state before saving
      if (!localSummaryState.pageTitle || !localSummaryState.pageUrl) {
        console.warn('[useSummarization] Missing page info, skipping auto-save')
        return
      }

      const pageInfo = {
        title: localSummaryState.pageTitle,
        url: localSummaryState.pageUrl,
      }

      const newHistoryId = await saveToHistory(localSummaryState, pageInfo)
      if (newHistoryId) {
        localSummaryState.isSavedToHistory = true
        localSummaryState.historyId = newHistoryId
        console.log(
          `[useSummarization] Auto-saved to history with ID: ${newHistoryId}`
        )
      }
    } catch (error) {
      console.error('[useSummarization] Auto-save to history failed:', error)
      localSummaryState.saveError = {
        message: error.message || 'Failed to save to history',
        timestamp: Date.now(),
      }
    }
  }

  async function manualSaveToArchive() {
    try {
      console.log('[useSummarization] Manual saving to archive...')
      const pageInfo = {
        title: localSummaryState.pageTitle,
        url: localSummaryState.pageUrl,
      }
      await saveToArchive(
        localSummaryState,
        pageInfo,
        localSummaryState.historyId
      )
      localSummaryState.isSavedToArchive = true
      console.log('[useSummarization] Manual save to archive successful.')
    } catch (error) {
      console.error('[useSummarization] Manual save to archive failed:', error)
      localSummaryState.saveError = error
      throw error // Re-throw để UI có thể xử lý
    }
  }

  // Computed properties
  let summaryToDisplay = $derived(localSummaryState.summary)
  let statusToDisplay = $derived(
    localSummaryState.isLoading
      ? 'loading'
      : localSummaryState.error
      ? 'error'
      : 'idle'
  )

  return {
    // State
    localSummaryState: () => localSummaryState,
    summaryToDisplay: () => summaryToDisplay,
    statusToDisplay: () => statusToDisplay,

    // Actions
    summarizePageContent,
    resetLocalSummaryState,
    handleSummarizationError,
    manualSaveToArchive,
  }
}
