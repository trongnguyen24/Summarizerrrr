// @ts-nocheck
import { loadSettings, settings } from '@/stores/settingsStore.svelte.js'
import { updateModelStatus } from '@/stores/summaryStore.svelte.js'
import { ContentExtractorService } from '../services/ContentExtractorService.js'
import { SummarizationService } from '../services/SummarizationService.js'
import {
  saveToHistory,
  saveToArchive,
} from '../services/FloatingPanelStorageService.js'
import { extractPageTitle } from '@/lib/utils/titleExtractor.js'

// Deep Dive imports
import {
  updateSummaryContext,
  setQuestions,
  setGenerating,
  setError as setDeepDiveError,
  addToQuestionHistory,
  deepDiveState,
} from '@/stores/deepDiveStore.svelte.js'
import { generateFollowUpQuestions } from '@/services/tools/deepDiveService.js'
import {
  formatCommentsForAI,
  fetchYouTubeComments,
} from '@/lib/utils/youtubeUtils.js'

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
    courseConcepts: '',
    isCourseConceptsLoading: false,
    // State cho việc lưu trữ
    isSavedToHistory: false,
    isSavedToArchive: false,
    historyId: null, // Lưu ID của bản ghi history
    saveError: null,
    pageTitle: '', // Thêm pageTitle
    pageUrl: '', // Thêm pageUrl
    currentRequestId: null, // Unique ID for the current summarization request
    loadingAction: null, // 'summarize', 'chapters', 'comments', 'custom'
  })

  // AbortController to handle cancellation
  let abortController = null

  /**
   * Reset local summary state
   */
  function resetLocalSummaryState() {
    // Reset request ID - invalidates any pending requests
    localSummaryState.currentRequestId = null

    localSummaryState.isLoading = false
    localSummaryState.summary = ''
    localSummaryState.error = null
    localSummaryState.contentType = 'general'
    localSummaryState.startTime = null
    localSummaryState.streamingEnabled = false
    localSummaryState.courseConcepts = ''
    localSummaryState.isCourseConceptsLoading = false
    localSummaryState.isSavedToHistory = false
    localSummaryState.isSavedToArchive = false
    localSummaryState.historyId = null
    localSummaryState.saveError = null
    localSummaryState.pageTitle = ''
    localSummaryState.pageUrl = ''
    localSummaryState.loadingAction = null
  }

  /**
   * Handle summarization error
   * @param {Error} error
   */
  function handleSummarizationError(error) {
    // Ignore AbortError
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      console.log('[useSummarization] Operation aborted, ignoring error')
      return
    }

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
   * Stop the current summarization operation
   */
  function stopSummarization() {
    console.log('[useSummarization] Stopping summarization...')

    // Abort current request if exists
    if (abortController) {
      abortController.abort()
      abortController = null
    }

    // Invalidate current request
    localSummaryState.currentRequestId = null

    // Reset loading states
    localSummaryState.isLoading = false
    localSummaryState.isCourseConceptsLoading = false

    // Reset processing flag
    isProcessing = false

    // Kiểm tra nếu không có content thì reset display
    const hasContent =
      localSummaryState.summary && localSummaryState.summary.trim() !== ''
    if (!hasContent) {
      console.log(
        '[useSummarization] No content generated when stopped, resetting display state'
      )
      resetLocalSummaryState()
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

    // Cancel any previous request
    if (abortController) {
      abortController.abort()
    }
    // Create new AbortController
    abortController = new AbortController()
    const signal = abortController.signal

    // Set immediate loading state để disable button ngay lập tức
    localSummaryState.isLoading = true
    isProcessing = true

    // Generate new request ID
    const requestId = Date.now().toString()
    localSummaryState.currentRequestId = requestId

    try {
      console.log('[useSummarization] Starting independent summarization...', requestId)

      // 1. Reset state (giữ lại isLoading = true)
      const wasLoading = localSummaryState.isLoading
      resetLocalSummaryState()
      // Restore request ID after reset (since reset clears it)
      localSummaryState.currentRequestId = requestId
      localSummaryState.loadingAction = customContentType || 'summarize'
      
      // Reset global model status
      updateModelStatus(null, null, false)
      localSummaryState.isLoading = wasLoading
      localSummaryState.startTime = Date.now()

      // 2. Get Page Info directly from the document
      localSummaryState.pageTitle = extractPageTitle()
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

      // Check abort signal
      if (signal.aborted) throw new Error('Aborted')

      // 5. Course content: Chỉ tóm tắt Summary, Concepts là custom action riêng
      if (contentType === 'course') {
        localSummaryState.isLoading = true

        console.log('[useSummarization] Starting course summary...')
        const result =
          await summarizationService.summarizeCourseSummaryWithContent(
            content,
            settings,
            signal
          )
        
        // Check request ID before updating state
        if (localSummaryState.currentRequestId !== requestId) {
          console.log('[useSummarization] Course summary stopped/outdated, skipping update')
          return
        }

        localSummaryState.summary = result.summary
        localSummaryState.isLoading = false
        console.log(
          '[useSummarization] Course summary completed and displayed'
        )
      } else {
        // Non-course content: Use original logic hoặc custom actions
        localSummaryState.isLoading = true

        // Nếu là custom action, gọi API trực tiếp
        if (
          customContentType &&
          ['analyze', 'explain', 'debate', 'chapters'].includes(
            customContentType
          )
        ) {
          const { summarizeContent, summarizeChapters } = await import(
            '@/lib/api/api.js'
          )

          if (customContentType === 'chapters') {
            // Tóm tắt chapters và lưu vào summary field (như một entry riêng)
            const result = await summarizeChapters(content, signal)
            
            // Check request ID
            if (localSummaryState.currentRequestId !== requestId) return
            
            localSummaryState.summary = result
          } else {
            const result = await summarizeContent(
              content,
              customContentType,
              signal
            )
            
            // Check request ID
            if (localSummaryState.currentRequestId !== requestId) return
            
            localSummaryState.summary = result
          }
        } else {
          // Logic gốc cho content thường - CHỈ TÓM TẮT CHÍNH
          const result = await summarizationService.summarizeWithContent(
            content,
            contentType,
            settings,
            signal
          )
          
          // Check request ID
          if (localSummaryState.currentRequestId !== requestId) {
            console.log('[useSummarization] Summarization stopped/outdated, skipping update')
            return
          }

          localSummaryState.summary = result.summary
          // Không tự động tóm tắt chapters nữa
        }

        localSummaryState.isLoading = false
      }

      const duration = Date.now() - localSummaryState.startTime
      console.log(`[useSummarization] Summarization completed in ${duration}ms`)

      // 6. Auto-save to history
      // Check request ID again before auto-save
      if (localSummaryState.currentRequestId !== requestId) return

      let typeLabel = 'Summary'
      if (customContentType) {
        typeLabel =
          customContentType.charAt(0).toUpperCase() + customContentType.slice(1)
      } else if (contentType === 'course') {
        typeLabel = 'Course Summary'
      } else if (contentType === 'youtube') {
        typeLabel = 'Video Summary'
      } else {
        typeLabel = 'Web Summary'
      }
      await autoSaveToHistory(typeLabel)

      // 7. Update Deep Dive context and auto-generate if enabled
      await handleDeepDiveAfterSummary()
    } catch (error) {
      // Only handle error if this is still the active request
      if (localSummaryState.currentRequestId === requestId) {
        handleSummarizationError(error)
        // Reset loading states on error
        localSummaryState.isLoading = false
        localSummaryState.isCourseConceptsLoading = false
      }
    } finally {
      // Reset processing flag
      isProcessing = false
      // Reset abort controller if it's the current one
      if (abortController && abortController.signal === signal) {
        abortController = null
      }
    }
  }

  /**
   * Summarize chapters specifically (for floating panel)
   * Chapters được lưu vào summary field để auto-save như một entry riêng
   */
  async function summarizeChapters() {
    if (isProcessing) {
      console.log(
        '[useSummarization] Already processing, ignoring duplicate request'
      )
      return
    }

    // Cancel any previous request
    if (abortController) {
      abortController.abort()
    }
    // Create new AbortController
    abortController = new AbortController()
    const signal = abortController.signal

    // Generate new request ID
    const requestId = Date.now().toString()
    localSummaryState.currentRequestId = requestId

    // Reset summary trước để chapters được lưu như một entry mới
    localSummaryState.summary = ''
    // Reset global model status
    updateModelStatus(null, null, false)
    localSummaryState.isLoading = true
    isProcessing = true
    localSummaryState.loadingAction = 'chapters'

    try {
      console.log('[useSummarization] Starting chapter summarization...', requestId)

      // Set page info (QUAN TRỌNG: Cần có để autoSaveToHistory() không skip)
      localSummaryState.pageTitle = extractPageTitle()
      localSummaryState.pageUrl = window.location.href

      // Load settings
      await loadSettings()

      // Initialize services
      const contentExtractor = new ContentExtractorService(
        (settings?.uiLanguage || 'en').slice(0, 2)
      )

      // Extract content
      const extractResult = await contentExtractor.extractPageContent()
      const content = extractResult.content

      // Check abort signal
      if (signal.aborted) throw new Error('Aborted')

      // Call chapter summarization và lưu vào summary field
      const { summarizeChapters: apiSummarizeChapters } = await import(
        '@/lib/api/api.js'
      )
      const result = await apiSummarizeChapters(content, signal)

      // Check request ID
      if (localSummaryState.currentRequestId !== requestId) {
        console.log('[useSummarization] Chapter summarization stopped/outdated, skipping update')
        return
      }

      localSummaryState.summary = result

      console.log('[useSummarization] Chapter summarization completed')

      // Auto-save to history - sẽ lưu summary (chứa chapters) như một entry riêng
      await autoSaveToHistory('Chapters')

      // Update Deep Dive context
      await handleDeepDiveAfterSummary()
    } catch (error) {
      if (localSummaryState.currentRequestId === requestId) {
        console.error('[useSummarization] Chapter summarization error:', error)
        handleSummarizationError(error)
      }
    } finally {
      if (localSummaryState.currentRequestId === requestId) {
        localSummaryState.isLoading = false
      }
      isProcessing = false
      if (abortController && abortController.signal === signal) {
        abortController = null
      }
    }
  }

  /**
   * Summarize course concepts specifically (for floating panel)
   * Concepts được lưu vào summary field để auto-save như một entry riêng
   */
  async function summarizeCourseConcepts() {
    if (isProcessing) {
      console.log(
        '[useSummarization] Already processing, ignoring duplicate request'
      )
      return
    }

    // Cancel any previous request
    if (abortController) {
      abortController.abort()
    }
    // Create new AbortController
    abortController = new AbortController()
    const signal = abortController.signal

    // Generate new request ID
    const requestId = Date.now().toString()
    localSummaryState.currentRequestId = requestId

    // Reset summary trước để concepts được lưu như một entry mới
    localSummaryState.summary = ''
    // Reset global model status
    updateModelStatus(null, null, false)
    localSummaryState.isLoading = true
    isProcessing = true
    localSummaryState.loadingAction = 'courseConcepts'

    try {
      console.log('[useSummarization] Starting course concepts summarization...', requestId)

      // Set page info (QUAN TRỌNG: Cần có để autoSaveToHistory() không skip)
      localSummaryState.pageTitle = extractPageTitle()
      localSummaryState.pageUrl = window.location.href

      // Load settings
      await loadSettings()

      // Initialize services
      const contentExtractor = new ContentExtractorService(
        (settings?.uiLanguage || 'en').slice(0, 2)
      )
      const summarizationService = new SummarizationService(contentExtractor)

      // Extract content
      const extractResult = await contentExtractor.extractPageContent()
      const content = extractResult.content

      // Check abort signal
      if (signal.aborted) throw new Error('Aborted')

      // Call course concepts và lưu vào summary field
      const result = await summarizationService.extractCourseConcepts(settings, signal)

      // Check request ID
      if (localSummaryState.currentRequestId !== requestId) {
        console.log('[useSummarization] Course concepts stopped/outdated, skipping update')
        return
      }

      localSummaryState.summary = result.courseConcepts

      console.log('[useSummarization] Course concepts summarization completed')

      // Auto-save to history - sẽ lưu summary (chứa concepts) như một entry riêng
      await autoSaveToHistory('Course Concepts')

      // Update Deep Dive context
      await handleDeepDiveAfterSummary()
    } catch (error) {
      if (localSummaryState.currentRequestId === requestId) {
        console.error('[useSummarization] Course concepts summarization error:', error)
        handleSummarizationError(error)
      }
    } finally {
      if (localSummaryState.currentRequestId === requestId) {
        localSummaryState.isLoading = false
      }
      isProcessing = false
      if (abortController && abortController.signal === signal) {
        abortController = null
      }
    }
  }

  /**
   * Summarize YouTube comments (for floating panel)
   * Fetch comments và analyze với AI
   */
  async function summarizeComments() {
    if (isProcessing) {
      console.log(
        '[useSummarization] Already processing, ignoring duplicate request'
      )
      return
    }

    // Cancel any previous request
    if (abortController) {
      abortController.abort()
    }
    // Create new AbortController
    abortController = new AbortController()
    const signal = abortController.signal

    // Generate new request ID
    const requestId = Date.now().toString()
    localSummaryState.currentRequestId = requestId

    // Reset summary trước
    localSummaryState.summary = ''
    // Reset global model status
    updateModelStatus(null, null, false)
    localSummaryState.isLoading = true
    isProcessing = true
    localSummaryState.loadingAction = 'comments'

    try {
      console.log('[useSummarization] Starting comment analysis...', requestId)

      // Set page info
      localSummaryState.pageTitle = extractPageTitle()
      localSummaryState.pageUrl = window.location.href

      // Load settings
      await loadSettings()

      // Verify this is a YouTube watch page
      const YOUTUBE_WATCH_PATTERN = /youtube\.com\/watch/i
      if (!YOUTUBE_WATCH_PATTERN.test(localSummaryState.pageUrl)) {
        throw new Error('This feature only works on YouTube video pages.')
      }

      console.log('[useSummarization] Fetching comments via message...')

      // Fetch comments qua message passing - use chrome.runtime for content script
      // Fetch comments qua message passing - use chrome.runtime for content script
      const response = await fetchYouTubeComments(null, {
        maxComments: settings.commentLimit || 60,
        maxRepliesPerComment: 10,
      })

      // Check abort signal
      if (signal.aborted) throw new Error('Aborted')

      console.log('[useSummarization] Comments received:', response)

      if (!response || !response.success) {
        throw new Error(
          response?.error || 'Failed to fetch comments from YouTube.'
        )
      }

      if (!response.comments || response.comments.length === 0) {
        throw new Error(
          'No comments found. This video may have comments disabled or no comments yet.'
        )
      }


      console.log('[useSummarization] Formatting comments...')
      const formattedComments = formatCommentsForAI(
        response.comments,
        response.metadata
      )

      console.log(
        '[useSummarization] Formatted data length:',
        formattedComments.length
      )

      // Analyze với AI
      console.log('[useSummarization] Analyzing comments with AI...')
      const { summarizeContent } = await import('@/lib/api/api.js')
      const result = await summarizeContent(
        formattedComments,
        'commentAnalysis',
        signal
      )

      // Check request ID
      if (localSummaryState.currentRequestId !== requestId) {
        console.log('[useSummarization] Comment analysis stopped/outdated, skipping update')
        return
      }

      localSummaryState.summary = result

      console.log('[useSummarization] Comment analysis completed')

      // Auto-save to history
      await autoSaveToHistory('Comments')

      // Update Deep Dive context
      await handleDeepDiveAfterSummary()
    } catch (error) {
      if (localSummaryState.currentRequestId === requestId) {
        console.error('[useSummarization] Comment analysis error:', error)
        handleSummarizationError(error)
      }
    } finally {
      if (localSummaryState.currentRequestId === requestId) {
        localSummaryState.isLoading = false
      }
      isProcessing = false
      if (abortController && abortController.signal === signal) {
        abortController = null
      }
    }
  }

  async function autoSaveToHistory(typeLabel) {
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

      const newHistoryId = await saveToHistory(
        localSummaryState,
        pageInfo,
        typeLabel
      )
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

  /**
   * Handle Deep Dive context update and auto-generation after summarization
   */
  async function handleDeepDiveAfterSummary() {
    // Only proceed if summary is available
    const content = localSummaryState.summary || ''
    if (!content || content.trim() === '') {
      console.log('[useSummarization] No summary content for Deep Dive')
      return
    }

    // Update Deep Dive context
    updateSummaryContext(
      content,
      localSummaryState.pageTitle,
      localSummaryState.pageUrl,
      settings.summaryLang || 'English'
    )
    console.log('[useSummarization] Deep Dive context updated')

    // Check if auto-generate is enabled
    const toolEnabled = settings.tools?.deepDive?.enabled ?? false
    const autoGenEnabled = settings.tools?.deepDive?.autoGenerate ?? false

    if (!toolEnabled || !autoGenEnabled) {
      console.log('[useSummarization] Deep Dive auto-generate disabled')
      return
    }

    // Don't auto-generate if questions already exist
    if (deepDiveState.questions.length > 0) {
      console.log('[useSummarization] Deep Dive questions already exist')
      return
    }

    // Auto-generate questions in background
    console.log('[useSummarization] Auto-generating Deep Dive questions...')
    try {
      setGenerating(true)
      setDeepDiveError(null)

      const questions = await generateFollowUpQuestions(
        content,
        localSummaryState.pageTitle,
        localSummaryState.pageUrl,
        settings.summaryLang || 'English',
        deepDiveState.questionHistory
      )

      setQuestions(questions)
      addToQuestionHistory(questions)
      console.log('[useSummarization] Auto-generated questions:', questions)
    } catch (error) {
      console.error('[useSummarization] Auto-generation failed:', error)
      // Silent fail - error will be shown when user opens deep dive
      setDeepDiveError(error.message || 'Failed to auto-generate questions')
    } finally {
      setGenerating(false)
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
    isProcessing: () => isProcessing,

    // Actions
    summarizePageContent,
    summarizeChapters,
    summarizeComments,
    summarizeCourseConcepts,
    resetLocalSummaryState,
    handleSummarizationError,
    manualSaveToArchive,
    stopSummarization,
  }
}
