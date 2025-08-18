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
   * Main summarization function với independent loading
   */
  async function summarizePageContent() {
    try {
      console.log('[useSummarization] Starting independent summarization...')

      // 1. Reset state
      resetLocalSummaryState()
      localSummaryState.startTime = Date.now()

      // 2. Load settings
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
    } catch (error) {
      handleSummarizationError(error)
      // Reset loading states on error
      localSummaryState.isLoading = false
      localSummaryState.isChapterLoading = false
      localSummaryState.isCourseConceptsLoading = false
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
