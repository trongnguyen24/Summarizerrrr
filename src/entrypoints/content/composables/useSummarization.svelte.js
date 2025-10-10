// @ts-nocheck
import { loadSettings, settings } from '@/stores/settingsStore.svelte.js'
import { ContentExtractorService } from '../services/ContentExtractorService.js'
import { SummarizationService } from '../services/SummarizationService.js'
import {
  saveToHistory,
  saveToArchive,
} from '../services/FloatingPanelStorageService.js'
import { summarizeContent } from '@/lib/api/api.js'

// Flags để prevent concurrent requests
let isProcessing = false
let isCustomActionProcessing = false

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
    // Custom Action State
    currentActionType: 'summarize', // 'summarize' | 'analyze' | 'explain' | 'debate'
    customActionResult: '',
    isCustomActionLoading: false,
    customActionError: null,
    lastActionType: null, // Track loại action cuối cùng
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
    // Reset custom action state
    localSummaryState.currentActionType = 'summarize'
    localSummaryState.customActionResult = ''
    localSummaryState.isCustomActionLoading = false
    localSummaryState.customActionError = null
    localSummaryState.lastActionType = null
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
  async function summarizePageContent() {
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

      // 4. Detect content type trước
      const { contentType } = await contentExtractor.extractPageContent()
      localSummaryState.contentType = contentType
      localSummaryState.streamingEnabled =
        summarizationService.shouldUseStreaming(settings)

      // 5. Course content: Gọi APIs parallel nhưng update UI independently
      if (contentType === 'course') {
        // Start both loading states
        localSummaryState.isLoading = true
        localSummaryState.isCourseConceptsLoading = true

        // Course Summary - Independent API call
        const courseSummaryPromise = (async () => {
          try {
            console.log('[useSummarization] Starting course summary...')
            const result = await summarizationService.summarizeCourseSummary(
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

        // Course Concepts - Independent API call
        const courseConceptsPromise = (async () => {
          try {
            console.log('[useSummarization] Starting course concepts...')
            const result = await summarizationService.extractCourseConcepts(
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
        // Non-course content: Use original logic
        localSummaryState.isLoading = true
        if (contentType === 'youtube') {
          localSummaryState.isChapterLoading = true
        }

        const result = await summarizationService.summarize(settings)

        localSummaryState.summary = result.summary
        if (result.chapterSummary) {
          localSummaryState.chapterSummary = result.chapterSummary
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
      localSummaryState.saveError = error
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

  /**
   * Execute custom action (analyze, explain, debate) on current page content
   * @param {string} actionType - 'analyze' | 'explain' | 'debate'
   */
  async function executeCustomAction(actionType) {
    // Prevent multiple simultaneous custom actions
    if (isCustomActionProcessing || isProcessing) {
      console.log(
        '[useSummarization] Custom action already in progress, ignoring duplicate request'
      )
      return
    }

    // Set immediate loading state
    localSummaryState.isCustomActionLoading = true
    localSummaryState.currentActionType = actionType
    localSummaryState.customActionResult = ''
    localSummaryState.customActionError = null
    localSummaryState.lastActionType = actionType
    isCustomActionProcessing = true

    try {
      console.log(`[useSummarization] Starting custom action: ${actionType}`)

      // Get Page Info directly from the document
      localSummaryState.pageTitle = document.title || 'Custom Action Result'
      localSummaryState.pageUrl = window.location.href

      // Load settings
      await loadSettings()

      // Initialize services
      const contentExtractor = new ContentExtractorService(
        (settings?.uiLanguage || 'en').slice(0, 2)
      )

      // Get page content
      const { content, contentType } =
        await contentExtractor.extractPageContent()

      if (!content || content.trim() === '') {
        throw new Error('No content found on this page.')
      }

      console.log(`[useSummarization] Executing ${actionType} action...`)

      // Execute custom action using summarizeContent API
      const result = await summarizeContent(content, actionType)

      localSummaryState.customActionResult =
        result || '<p><i>Could not generate result.</i></p>'

      console.log(`[useSummarization] Custom action ${actionType} completed`)

      // Auto-save to history với custom action result
      await autoSaveToHistoryWithCustomAction()
    } catch (error) {
      console.error(
        `[useSummarization] Custom action ${actionType} error:`,
        error
      )

      localSummaryState.customActionError = {
        message: error.message || 'Unknown error occurred',
        type: error.type || 'CUSTOM_ACTION_ERROR',
        timestamp: Date.now(),
      }

      // Display user-friendly error messages
      if (error.type === 'API_KEY') {
        localSummaryState.customActionError.message =
          'API key not configured. Please check settings.'
      } else if (error.type === 'CONTENT') {
        localSummaryState.customActionError.message =
          'Could not extract content from this page.'
      } else if (error.type === 'NETWORK') {
        localSummaryState.customActionError.message =
          'Network error. Please check your connection.'
      }
    } finally {
      localSummaryState.isCustomActionLoading = false
      isCustomActionProcessing = false
    }
  }

  /**
   * Auto-save to history including custom action results
   */
  async function autoSaveToHistoryWithCustomAction() {
    try {
      console.log(
        '[useSummarization] Auto-saving to history with custom action...'
      )
      const pageInfo = {
        title: localSummaryState.pageTitle,
        url: localSummaryState.pageUrl,
      }

      // Create state object that includes custom action data
      const stateWithCustomAction = {
        ...localSummaryState,
        // Ensure we have the custom action data for saving
        customActionType: localSummaryState.currentActionType,
        customActionContent: localSummaryState.customActionResult,
      }

      const newHistoryId = await saveToHistory(stateWithCustomAction, pageInfo)
      if (newHistoryId) {
        localSummaryState.isSavedToHistory = true
        localSummaryState.historyId = newHistoryId
        console.log(
          `[useSummarization] Auto-saved custom action to history with ID: ${newHistoryId}`
        )
      }
    } catch (error) {
      console.error(
        '[useSummarization] Auto-save custom action to history failed:',
        error
      )
      localSummaryState.saveError = error
    }
  }

  /**
   * Check if any summaries are completed
   */
  function areAllSummariesCompleted() {
    const hasSummary =
      localSummaryState.summary && localSummaryState.summary.trim() !== ''
    const hasChapterSummary =
      localSummaryState.chapterSummary &&
      localSummaryState.chapterSummary.trim() !== ''
    const hasCourseSummary =
      localSummaryState.courseConcepts &&
      localSummaryState.courseConcepts.trim() !== ''
    const hasCustomAction =
      localSummaryState.customActionResult &&
      localSummaryState.customActionResult.trim() !== ''

    return (
      hasSummary || hasChapterSummary || hasCourseSummary || hasCustomAction
    )
  }

  /**
   * Check if has any custom action result
   */
  function hasAnyCustomActionResult() {
    return (
      localSummaryState.customActionResult &&
      localSummaryState.customActionResult.trim() !== ''
    )
  }

  // Computed properties
  let summaryToDisplay = $derived(
    localSummaryState.lastActionType &&
      localSummaryState.lastActionType !== 'summarize'
      ? localSummaryState.customActionResult
      : localSummaryState.summary
  )

  let statusToDisplay = $derived(
    localSummaryState.isLoading || localSummaryState.isCustomActionLoading
      ? 'loading'
      : localSummaryState.error || localSummaryState.customActionError
      ? 'error'
      : 'idle'
  )

  let contentTypeToDisplay = $derived(
    localSummaryState.lastActionType &&
      localSummaryState.lastActionType !== 'summarize'
      ? 'custom'
      : localSummaryState.contentType
  )

  return {
    // State
    localSummaryState: () => localSummaryState,
    summaryToDisplay: () => summaryToDisplay,
    statusToDisplay: () => statusToDisplay,
    contentTypeToDisplay: () => contentTypeToDisplay,

    // Actions
    summarizePageContent,
    executeCustomAction,
    resetLocalSummaryState,
    handleSummarizationError,
    manualSaveToArchive,

    // Helper functions
    areAllSummariesCompleted,
    hasAnyCustomActionResult,
  }
}
