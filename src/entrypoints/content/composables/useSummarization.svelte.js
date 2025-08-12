// @ts-nocheck
import { loadSettings, settings } from '@/stores/settingsStore.svelte.js'
import { ContentExtractorService } from '../services/ContentExtractorService.js'
import { SummarizationService } from '../services/SummarizationService.js'

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
   * Main summarization function
   */
  async function summarizePageContent() {
    try {
      console.log('[useSummarization] Starting independent summarization...')

      // 1. Reset state
      resetLocalSummaryState()
      localSummaryState.isLoading = true
      localSummaryState.startTime = Date.now()

      // 2. Load settings
      await loadSettings()

      // 3. Initialize services
      const contentExtractor = new ContentExtractorService(
        (settings?.uiLanguage || 'en').slice(0, 2)
      )
      const summarizationService = new SummarizationService(contentExtractor)

      // 4. Perform summarization
      const result = await summarizationService.summarize(settings)

      // 5. Update state với kết quả
      localSummaryState.summary = result.summary
      localSummaryState.contentType = result.contentType
      localSummaryState.streamingEnabled =
        summarizationService.shouldUseStreaming(settings)

      if (result.chapterSummary) {
        localSummaryState.chapterSummary = result.chapterSummary
      }

      const duration = Date.now() - localSummaryState.startTime
      console.log(`[useSummarization] Summarization completed in ${duration}ms`)
      console.log(
        `[useSummarization] Summary result:`,
        result.summary ? 'has content' : 'empty'
      )
      console.log(
        `[useSummarization] Summary length:`,
        result.summary?.length || 0
      )
      console.log(
        `[useSummarization] LocalSummaryState after update:`,
        localSummaryState.summary ? 'has content' : 'empty'
      )
    } catch (error) {
      handleSummarizationError(error)
    } finally {
      localSummaryState.isLoading = false
      localSummaryState.isChapterLoading = false
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
  }
}
