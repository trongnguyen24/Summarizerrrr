// @ts-nocheck
import { loadSettings, settings } from '@/stores/settingsStore.svelte.js'
import { updateModelStatus } from '@/stores/summaryStore.svelte.js'
import { ContentExtractorService } from '../services/ContentExtractorService.js'
import { SummarizationService } from '../services/SummarizationService.js'
import {
  saveToHistory,
  saveToArchive,
} from '../services/FloatingPanelStorageService.js'

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
    abortController: null, // AbortController for cancellation
  })

  /**
   * Reset local summary state
   */
  function resetLocalSummaryState() {
    // Abort any ongoing operation
    if (localSummaryState.abortController) {
      localSummaryState.abortController.abort()
      localSummaryState.abortController = null
    }

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
   * Stop the current summarization operation
   * Note: Content script uses blocking mode, so we can't cancel the API call
   * We can only reset the UI state to stop waiting for the response
   */
  function stopSummarization() {
    console.log('[useSummarization] Stopping summarization...')

    // Abort controller nếu có
    if (localSummaryState.abortController) {
      localSummaryState.abortController.abort()
      localSummaryState.abortController = null
    }

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

    // Set immediate loading state để disable button ngay lập tức
    localSummaryState.isLoading = true
    isProcessing = true

    try {
      console.log('[useSummarization] Starting independent summarization...')

      // 1. Reset state (giữ lại isLoading = true)
      const wasLoading = localSummaryState.isLoading
      resetLocalSummaryState()
      // Reset global model status
      updateModelStatus(null, null, false)
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
            
            // Check abort before updating state
            if (!localSummaryState.abortController) {
              console.log('[useSummarization] Course summary aborted, skipping update')
              return
            }

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
            
            // Check abort before updating state
            if (!localSummaryState.abortController) {
              console.log('[useSummarization] Course concepts aborted, skipping update')
              return
            }

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
            const result = await summarizeChapters(content)
            
            // Check abort
            if (!localSummaryState.abortController) return
            
            localSummaryState.summary = result
          } else {
            const result = await summarizeContent(
              content,
              customContentType
            )
            
            // Check abort
            if (!localSummaryState.abortController) return
            
            localSummaryState.summary = result
          }
        } else {
          // Logic gốc cho content thường - CHỈ TÓM TẮT CHÍNH
          const result = await summarizationService.summarizeWithContent(
            content,
            contentType,
            settings
          )
          
          // Check abort
          if (!localSummaryState.abortController) {
            console.log('[useSummarization] Summarization aborted, skipping update')
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
      handleSummarizationError(error)
      // Reset loading states on error
      localSummaryState.isLoading = false
      localSummaryState.isCourseConceptsLoading = false
    } finally {
      // Reset processing flag
      isProcessing = false
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

    // Reset summary trước để chapters được lưu như một entry mới
    localSummaryState.summary = ''
    // Reset global model status
    updateModelStatus(null, null, false)
    localSummaryState.isLoading = true
    isProcessing = true

    try {
      console.log('[useSummarization] Starting chapter summarization...')

      // Set page info (QUAN TRỌNG: Cần có để autoSaveToHistory() không skip)
      localSummaryState.pageTitle = document.title || 'Unknown Title'
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

      // Call chapter summarization và lưu vào summary field
      const { summarizeChapters: apiSummarizeChapters } = await import(
        '@/lib/api/api.js'
      )
      const result = await apiSummarizeChapters(content)

      // Check abort
      if (!localSummaryState.abortController) {
        console.log('[useSummarization] Chapter summarization aborted, skipping update')
        return
      }

      localSummaryState.summary = result

      console.log('[useSummarization] Chapter summarization completed')

      // Auto-save to history - sẽ lưu summary (chứa chapters) như một entry riêng
      await autoSaveToHistory('Chapters')

      // Update Deep Dive context
      await handleDeepDiveAfterSummary()
    } catch (error) {
      console.error('[useSummarization] Chapter summarization error:', error)
      handleSummarizationError(error)
    } finally {
      localSummaryState.isLoading = false
      isProcessing = false
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

    // Reset summary trước
    localSummaryState.summary = ''
    // Reset global model status
    updateModelStatus(null, null, false)
    localSummaryState.isLoading = true
    isProcessing = true

    try {
      console.log('[useSummarization] Starting comment analysis...')

      // Set page info
      localSummaryState.pageTitle = document.title || 'YouTube Comment Analysis'
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
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'fetchYouTubeComments',
            maxComments: 80,
            maxRepliesPerComment: 10,
          },
          (result) => {
            if (chrome.runtime.lastError) {
              console.error(
                '[useSummarization] Chrome runtime error:',
                chrome.runtime.lastError
              )
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              console.log(
                '[useSummarization] Message sent, waiting for response...'
              )
              resolve(result)
            }
          }
        )
      })

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

      // Format comments for AI (copy function từ summaryStore)
      const formatCommentsForAI = (comments, metadata) => {
        if (!comments || comments.length === 0) {
          return 'No comments available.'
        }

        let formatted = ''
        const seenTexts = new Set()

        for (const comment of comments) {
          // Skip duplicates and spam
          const normalizedText = comment.text.trim().toLowerCase()
          if (seenTexts.has(normalizedText) || comment.text.trim().length < 3) {
            continue
          }
          seenTexts.add(normalizedText)

          // Clean text: remove excessive emojis
          let cleanText = comment.text
            .trim()
            .replace(/[\u{1F300}-\u{1F9FF}]{6,}/gu, '[emoji]')

          // Truncate long comments
          if (cleanText.length > 400) {
            cleanText = cleanText.substring(0, 397) + '...'
          }

          // Ultra compact format
          formatted += `@${comment.author.name}`
          if (comment.author.isChannelOwner) {
            formatted += '👤'
          }
          formatted += `|${comment.publishedTime}|${comment.likeCount}↑`
          if (comment.replyCount > 0) {
            formatted += `|${comment.replyCount}💬`
          }
          formatted += `|${cleanText}\n`

          // Compact replies format
          if (comment.replies && comment.replies.length > 0) {
            for (const reply of comment.replies) {
              let cleanReply = reply.text
                .trim()
                .replace(/[\u{1F300}-\u{1F9FF}]{6,}/gu, '[emoji]')

              if (cleanReply.length > 200) {
                cleanReply = cleanReply.substring(0, 197) + '...'
              }

              if (cleanReply.length < 3) {
                continue
              }

              formatted += `  ${reply.index}.@${reply.author.name}|${cleanReply}\n`
            }
          }

          formatted += '\n'
        }

        return formatted
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
        'commentAnalysis'
      )

      // Check abort
      if (!localSummaryState.abortController) {
        console.log('[useSummarization] Comment analysis aborted, skipping update')
        return
      }

      localSummaryState.summary = result

      console.log('[useSummarization] Comment analysis completed')

      // Auto-save to history
      await autoSaveToHistory('Comments')

      // Update Deep Dive context
      await handleDeepDiveAfterSummary()
    } catch (error) {
      console.error('[useSummarization] Comment analysis error:', error)
      handleSummarizationError(error)
    } finally {
      localSummaryState.isLoading = false
      isProcessing = false
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
    resetLocalSummaryState,
    handleSummarizationError,
    manualSaveToArchive,
    stopSummarization,
  }
}
