// @ts-nocheck
import { marked } from 'marked'
import { getPageContent } from '@/services/contentService.js'
import { browser } from 'wxt/browser'
import { settings, loadSettings } from './settingsStore.svelte.js'
import {
  summarizeContent,
  summarizeChapters,
  summarizeContentStream,
  summarizeChaptersStream,
  providerSupportsStreaming,
} from '@/lib/api/api.js'
import {
  addSummary,
  addHistory,
  getSummaryById,
  getHistoryById,
} from '@/lib/db/indexedDBService.js'
import { appStateStorage } from '@/services/wxtStorageService.js'
import { generateUUID } from '@/lib/utils/utils.js'
import { handleError } from '@/lib/error/simpleErrorHandler.js'
// Import Firefox permission service
import {
  checkPermission,
  requestPermission,
} from '@/services/firefoxPermissionService.js'
// Import Deep Dive store
import { resetDeepDive } from './deepDiveStore.svelte.js'
import { showBlockingModeToast } from '@/lib/utils/toastUtils.js'

// --- State ---
export const summaryState = $state({
  summary: '',
  courseSummary: '',
  courseConcepts: '',
  isLoading: false,
  isCourseSummaryLoading: false,
  isCourseConceptsLoading: false,
  summaryError: null, // Will hold the structured error object
  courseSummaryError: null,
  courseConceptsError: null,
  isYouTubeVideoActive: false,
  isCourseVideoActive: false,
  currentContentSource: '',
  selectedTextSummary: '',
  isSelectedTextLoading: false,
  selectedTextError: null,
  lastSummaryTypeDisplayed: null,
  activeYouTubeTab: 'videoSummary',
  activeCourseTab: 'courseSummary',
  pageTitle: '', // Thêm pageTitle vào state
  pageUrl: '', // Thêm pageUrl vào state
  isArchived: false,
  currentActionType: 'summarize', // 'summarize' | 'analyze' | 'explain' | 'debate'
  customActionResult: '',
  isCustomActionLoading: false,
  customActionError: null,
  modelStatus: {
    currentModel: null,
    fallbackFrom: null,
    isFallback: false,
  },
  abortController: null, // AbortController for cancelling streaming operations
})

// --- Actions ---

/**
 * Update model status for UI display
 * @param {string|null} currentModel - Current model being used
 * @param {string|null} fallbackFrom - Original model that failed (if fallback occurred)
 * @param {boolean} isFallback - Whether we're currently in fallback mode
 */
export function updateModelStatus(
  currentModel = null,
  fallbackFrom = null,
  isFallback = false
) {
  summaryState.modelStatus = {
    currentModel,
    fallbackFrom,
    isFallback,
  }
}

/**
 * Stop the current streaming operation
 */
export function stopStreaming() {
  if (summaryState.abortController) {
    console.log('[summaryStore] Stopping streaming...')
    summaryState.abortController.abort()
    summaryState.abortController = null
  }
}

/**
 * Reset all summary-related states.
 */
export function resetState() {
  // Abort any ongoing streaming operation
  if (summaryState.abortController) {
    summaryState.abortController.abort()
    summaryState.abortController = null
  }

  summaryState.summary = ''
  summaryState.courseSummary = ''
  summaryState.courseConcepts = ''
  summaryState.selectedTextSummary = ''
  summaryState.isLoading = false
  summaryState.isCourseSummaryLoading = false
  summaryState.isCourseConceptsLoading = false
  summaryState.isSelectedTextLoading = false
  summaryState.summaryError = null
  summaryState.courseSummaryError = null
  summaryState.courseConceptsError = null
  summaryState.selectedTextError = null
  summaryState.isYouTubeVideoActive = false
  summaryState.isCourseVideoActive = false
  summaryState.currentContentSource = ''
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
  summaryState.activeCourseTab = 'courseSummary'
  summaryState.pageTitle = ''
  summaryState.pageUrl = ''
  summaryState.isArchived = false
  summaryState.currentActionType = 'summarize'
  summaryState.customActionResult = ''
  summaryState.isCustomActionLoading = false
  summaryState.customActionError = null
  summaryState.modelStatus = {
    currentModel: null,
    fallbackFrom: null,
    isFallback: false,
  }

  // Reset Deep Dive state
  resetDeepDive()
}

/**
 * Resets only the display-related states, clearing current summaries.
 */
export function resetDisplayState() {
  summaryState.summary = ''
  summaryState.courseSummary = ''
  summaryState.courseConcepts = ''
  summaryState.selectedTextSummary = ''
  summaryState.summaryError = null
  summaryState.courseSummaryError = null
  summaryState.courseConceptsError = null
  summaryState.selectedTextError = null
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
  summaryState.activeCourseTab = 'courseSummary'
  summaryState.customActionResult = ''
  summaryState.customActionError = null
  summaryState.modelStatus = {
    currentModel: null,
    fallbackFrom: null,
    isFallback: false,
  }

  // Reset Deep Dive state
  resetDeepDive()
}

/**
 * Updates the video active states.
 * @param {boolean} isYouTube - Whether the current tab is a YouTube video.
 * @param {boolean} isCourse - Whether the current tab is a Course video.
 */
export function updateVideoActiveStates(isYouTube, isCourse) {
  summaryState.isYouTubeVideoActive = isYouTube
  summaryState.isCourseVideoActive = isCourse
}

/**
 * Updates the active YouTube tab state.
 * @param {string} tabName - The ID of the active YouTube tab ('videoSummary' or 'chapterSummary').
 */
export function updateActiveYouTubeTab(tabName) {
  summaryState.activeYouTubeTab = tabName
}

/**
 * Updates the active Course tab state.
 * @param {string} tabName - The ID of the active Course tab ('courseSummary' or 'courseConcepts').
 */
export function updateActiveCourseTab(tabName) {
  summaryState.activeCourseTab = tabName
}

/**
 * Fetches content from the current tab and triggers the summarization process.
 */
export async function fetchAndSummarize() {
  // If a summarization process is already ongoing, reset state and start a new one
  if (summaryState.isLoading || summaryState.isCustomActionLoading) {
    resetState() // Reset state before starting a new summarization
  }

  // Wait for settings to be initialized
  await loadSettings()

  const userSettings = settings

  // Reset state before starting
  resetState()

  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  // Check if we should use streaming mode
  const shouldUseStreaming =
    userSettings.enableStreaming &&
    providerSupportsStreaming(selectedProviderId)

  if (shouldUseStreaming) {
    try {
      // Use streaming mode
      await fetchAndSummarizeStream()
    } catch (streamError) {
      // Error đã được handle trong fetchAndSummarizeStream()
      // Chỉ cần log để debug
      console.error('[fetchAndSummarize] Streaming error caught:', streamError)
      // Error state đã được set trong fetchAndSummarizeStream()
      // Không cần set lại ở đây
    } finally {
      // Ensure all loading states are set to false after streaming completes
      summaryState.isLoading = false
      summaryState.isCourseSummaryLoading = false
      summaryState.isCourseConceptsLoading = false
    }
    // logAllGeneratedSummariesToHistory() is called within fetchAndSummarizeStream
    return // Exit the function after streaming
  }

  // Use non-streaming mode (existing logic)
  try {
    // Immediately set loading states inside try block
    summaryState.isLoading = true
    summaryState.isCourseSummaryLoading = true
    summaryState.isCourseConceptsLoading = true

    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tabInfo || !tabInfo.url) {
      throw new Error('Could not get current tab information or URL.')
    }

    // Check permissions cho Firefox trước khi tiếp tục
    if (import.meta.env.BROWSER === 'firefox') {
      const hasPermission = await checkPermission(tabInfo.url)

      if (!hasPermission) {
        const permissionGranted = await requestPermission(tabInfo.url)
        if (!permissionGranted) {
          throw new Error(
            'Permission denied for this website. Please enable permissions in Settings or grant access when prompted.'
          )
        }
      }
    }

    // LƯU TIÊU ĐỀ VÀ URL VÀO STATE NGAY TẠI ĐÂY
    summaryState.pageTitle = tabInfo.title || 'Unknown Title'
    summaryState.pageUrl = tabInfo.url || 'Unknown URL'

    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    const COURSE_MATCH_PATTERN =
      /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i // Kết hợp Udemy và Coursera

    summaryState.isYouTubeVideoActive = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
    summaryState.isCourseVideoActive = COURSE_MATCH_PATTERN.test(tabInfo.url)

    let mainContentTypeToFetch = 'webpageText'
    let summaryType = 'general'

    if (summaryState.isYouTubeVideoActive) {
      mainContentTypeToFetch = 'timestampedTranscript' // Always use timestamped for better accuracy
      summaryType = 'youtube'
      summaryState.lastSummaryTypeDisplayed = 'youtube'
    } else if (summaryState.isCourseVideoActive) {
      mainContentTypeToFetch = 'transcript'
      summaryType = 'courseSummary'
      summaryState.lastSummaryTypeDisplayed = 'course'
    } else {
      summaryState.lastSummaryTypeDisplayed = 'web'
    }

    const mainContentResult = await getPageContent(
      mainContentTypeToFetch,
      userSettings.summaryLang
    )
    summaryState.currentContentSource = mainContentResult.content

    if (summaryState.isYouTubeVideoActive) {
      // Only summarize video content, chapters will be separate
      summaryState.summaryError = null
      try {
        const videoSummarizedText = await summarizeContent(
          summaryState.currentContentSource,
          'youtube'
        )
        summaryState.summary =
          videoSummarizedText ||
          '<p><i>Could not generate video summary.</i></p>'
      } catch (e) {
        const errorObject = handleError(e, {
          source: 'youtubeVideoSummarization',
        })
        summaryState.summaryError = errorObject
      }
    } else if (summaryState.isCourseVideoActive) {
      const courseSummaryPromise = (async () => {
        summaryState.courseSummaryError = null
        try {
          const courseSummarizedText = await summarizeContent(
            summaryState.currentContentSource,
            'courseSummary'
          )
          summaryState.courseSummary =
            courseSummarizedText ||
            '<p><i>Could not generate course summary.</i></p>'
        } catch (e) {
          summaryState.courseSummaryError = handleError(e, {
            source: 'courseSummarization',
          })
        } finally {
          summaryState.isCourseSummaryLoading = false
        }
      })()

      const courseConceptsPromise = (async () => {
        summaryState.courseConceptsError = null
        try {
          const courseConceptsText = await summarizeContent(
            summaryState.currentContentSource,
            'courseConcepts'
          )
          summaryState.courseConcepts =
            courseConceptsText ||
            '<p><i>Could not explain course concepts.</i></p>'
        } catch (e) {
          summaryState.courseConceptsError = handleError(e, {
            source: 'courseConceptsExplanation',
          })
        } finally {
          summaryState.isCourseConceptsLoading = false
        }
      })()
      await Promise.allSettled([courseSummaryPromise, courseConceptsPromise])
    } else {
      summaryState.summaryError = null
      try {
        const summarizedText = await summarizeContent(
          summaryState.currentContentSource,
          summaryType
        )
        summaryState.summary =
          summarizedText || '<p><i>Could not generate summary.</i></p>'
      } catch (e) {
        const errorObject = handleError(e, {
          source: 'generalSummarization',
        })
        summaryState.summaryError = errorObject
      }
    }
  } catch (e) {
    const errorObject = handleError(e, {
      source: 'mainSummarizationProcess',
    })
    summaryState.summaryError = errorObject
    // Don't change the lastSummaryTypeDisplayed on error,
    // so the UI can show the error in the correct context (e.g., YouTube tab).
  } finally {
    // Ensure all loading states are set to false
    summaryState.isLoading = false
    summaryState.isCourseSummaryLoading = false
    summaryState.isCourseConceptsLoading = false

    // Log all generated summaries to history after all loading is complete
    // Log generated summaries to history as separate entries
    if (summaryState.isYouTubeVideoActive && summaryState.summary) {
      await logSingleSummaryToHistory(
        summaryState.summary,
        summaryState.pageTitle,
        summaryState.pageUrl,
        'Video Summary'
      )
    } else if (summaryState.isCourseVideoActive) {
      if (summaryState.courseSummary)
        await logSingleSummaryToHistory(
          summaryState.courseSummary,
          summaryState.pageTitle,
          summaryState.pageUrl,
          'Course Summary'
        )
      if (summaryState.courseConcepts)
        await logSingleSummaryToHistory(
          summaryState.courseConcepts,
          summaryState.pageTitle,
          summaryState.pageUrl,
          'Course Concepts'
        )
    } else if (summaryState.summary) {
      await logSingleSummaryToHistory(
        summaryState.summary,
        summaryState.pageTitle,
        summaryState.pageUrl,
        'Web Summary'
      )
    }
  }
}

/**
 * Fetches and generates chapter summary for YouTube videos.
 * Can be called independently after main video summary.
 */
export async function fetchChapterSummary() {
  // Wait for settings to be initialized
  await loadSettings()

  const userSettings = settings

  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  // Check if we should use streaming mode
  const shouldUseStreaming =
    userSettings.enableStreaming &&
    providerSupportsStreaming(selectedProviderId)

  // Reset Deep Dive when starting chapter summary
  resetDeepDive()

  // Reset custom action state for chapters
  summaryState.isCustomActionLoading = true
  summaryState.lastSummaryTypeDisplayed = 'custom'
  summaryState.currentActionType = 'chapters'
  summaryState.customActionResult = ''
  summaryState.customActionError = null
  // Reset model status for custom actions
  summaryState.modelStatus = {
    currentModel: null,
    fallbackFrom: null,
    isFallback: false,
  }

  // Create new AbortController for this streaming operation
  summaryState.abortController = new AbortController()
  const abortSignal = summaryState.abortController.signal

  try {
    // Get current tab info
    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tabInfo || !tabInfo.url) {
      throw new Error('Could not get current tab information or URL.')
    }

    // Verify this is a YouTube page
    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    if (!YOUTUBE_MATCH_PATTERN.test(tabInfo.url)) {
      throw new Error('Chapter summary is only available for YouTube videos.')
    }

    // Check Firefox permissions
    if (import.meta.env.BROWSER === 'firefox') {
      const hasPermission = await checkPermission(tabInfo.url)
      if (!hasPermission) {
        const permissionGranted = await requestPermission(tabInfo.url)
        if (!permissionGranted) {
          throw new Error(
            'Permission denied for this website. Please enable permissions in Settings or grant access when prompted.'
          )
        }
      }
    }

    // Always fetch fresh transcript - no caching to avoid stale data issues
    console.log('[summaryStore] Fetching fresh transcript for chapters')
    const contentResult = await getPageContent(
      'timestampedTranscript',
      userSettings.summaryLang
    )
    const transcript = contentResult.content

    // Generate chapter summary
    if (shouldUseStreaming) {
      // Use streaming mode - stream directly to customActionResult
      try {
        console.log('[summaryStore] Starting chapter streaming...')
        const chapterStream = summarizeChaptersStream(transcript, abortSignal)
        let chunkCount = 0
        for await (const chunk of chapterStream) {
          summaryState.customActionResult += chunk
          chunkCount++
        }
        console.log(
          `[summaryStore] Chapter streaming completed, chunks: ${chunkCount}`
        )
      } catch (streamError) {
        console.log(
          '[summaryStore] Chapter streaming error, falling back to blocking mode:',
          streamError
        )
        showBlockingModeToast()
        // Fallback to blocking mode
        const chapterText = await summarizeChapters(transcript)
        summaryState.customActionResult =
          chapterText || '<p><i>Could not generate chapter summary.</i></p>'
      }
    } else {
      // Use non-streaming mode
      const chapterText = await summarizeChapters(transcript)
      summaryState.customActionResult =
        chapterText || '<p><i>Could not generate chapter summary.</i></p>'
    }

    // Always update page info for current video
    summaryState.pageTitle = tabInfo.title || 'Unknown Title'
    summaryState.pageUrl = tabInfo.url || 'Unknown URL'

    // Keep display type as 'custom' for chapters
    // (already set at the beginning)
  } catch (e) {
    const errorObject = handleError(e, {
      source: 'chapterSummarization',
    })
    summaryState.customActionError = errorObject
  } finally {
    summaryState.isCustomActionLoading = false
    // Clear abort controller after streaming completes
    summaryState.abortController = null

    // Log to history after chapter summary is complete
    await logSingleSummaryToHistory(
      summaryState.customActionResult,
      summaryState.pageTitle,
      summaryState.pageUrl,
      'Chapters'
    )
  }
}
export async function fetchAndSummarizeStream() {
  if (
    summaryState.isLoading ||
    summaryState.isCustomActionLoading ||
    summaryState.isCourseSummaryLoading ||
    summaryState.isCourseConceptsLoading
  ) {
    resetState()
  }

  await loadSettings()
  const userSettings = settings
  resetState()

  // Create new AbortController for this streaming operation
  summaryState.abortController = new AbortController()
  const abortSignal = summaryState.abortController.signal

  try {
    summaryState.isLoading = true
    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tabInfo || !tabInfo.url) {
      throw new Error('Could not get current tab information or URL.')
    }

    // Check permissions cho Firefox trước khi tiếp tục (stream mode)
    if (import.meta.env.BROWSER === 'firefox') {
      const hasPermission = await checkPermission(tabInfo.url)

      if (!hasPermission) {
        const permissionGranted = await requestPermission(tabInfo.url)
        if (!permissionGranted) {
          throw new Error(
            'Permission denied for this website. Please enable permissions in Settings or grant access when prompted.'
          )
        }
      }
    }

    summaryState.pageTitle = tabInfo.title || 'Unknown Title'
    summaryState.pageUrl = tabInfo.url

    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    const COURSE_MATCH_PATTERN =
      /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i

    summaryState.isYouTubeVideoActive = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
    summaryState.isCourseVideoActive = COURSE_MATCH_PATTERN.test(tabInfo.url)

    let mainContentTypeToFetch = 'webpageText'
    let summaryType = 'general'

    if (summaryState.isYouTubeVideoActive) {
      mainContentTypeToFetch = 'timestampedTranscript' // Always use timestamped for better accuracy
      summaryType = 'youtube'
      summaryState.lastSummaryTypeDisplayed = 'youtube'
    } else if (summaryState.isCourseVideoActive) {
      mainContentTypeToFetch = 'transcript'
      summaryType = 'courseSummary'
      summaryState.lastSummaryTypeDisplayed = 'course'
    } else {
      summaryState.lastSummaryTypeDisplayed = 'web'
    }

    const mainContentResult = await getPageContent(
      mainContentTypeToFetch,
      userSettings.summaryLang
    )
    summaryState.currentContentSource = mainContentResult.content

    const promises = []

    if (summaryState.isYouTubeVideoActive) {
      // Only stream video summary, chapters will be separate
      summaryState.summaryError = null
      try {
        console.log('[summaryStore] Starting YouTube video streaming...')
        const videoSummaryStream = summarizeContentStream(
          summaryState.currentContentSource,
          'youtube',
          abortSignal
        )
        let chunkCount = 0
        for await (const chunk of videoSummaryStream) {
          summaryState.summary += chunk
          chunkCount++
        }
        console.log(
          `[summaryStore] YouTube streaming completed, chunks: ${chunkCount}`
        )

        // If streaming completed with 0 chunks, it might be a silent error
        // Fallback to blocking mode to get proper error
        // BUT only if not aborted by user
        if (
          chunkCount === 0 &&
          summaryState.summary.trim() === '' &&
          !abortSignal.aborted
        ) {
          console.log(
            '[summaryStore] YouTube streaming failed silently (0 chunks), trying blocking mode...'
          )
          showBlockingModeToast()
          try {
            const blockingResult = await summarizeContent(
              summaryState.currentContentSource,
              'youtube'
            )
            summaryState.summary =
              blockingResult ||
              '<p><i>Could not generate video summary.</i></p>'
          } catch (blockingError) {
            // This will properly display the error
            const errorObject = handleError(blockingError, {
              source: 'youtubeVideoStreaming',
            })
            summaryState.summaryError = errorObject
            console.log(
              '[summaryStore] Error set for UI:',
              summaryState.summaryError
            )
          }
        }
      } catch (e) {
        console.log('[summaryStore] YouTube streaming error caught:', e)
        if (e.message?.includes('transcript')) {
          summaryState.summary =
            '<p><i>Failed to get transcript for summary.</i></p>'
        } else {
          const errorObject = handleError(e, {
            source: 'youtubeVideoStreaming',
          })
          summaryState.summaryError = errorObject
          // Re-throw to be caught by the main handler
          throw e
        }
      }
    } else if (summaryState.isCourseVideoActive) {
      summaryState.isCourseSummaryLoading = true
      summaryState.isCourseConceptsLoading = true

      const courseSummaryPromise = (async () => {
        summaryState.courseSummaryError = null
        try {
          const courseSummaryStream = summarizeContentStream(
            summaryState.currentContentSource,
            'courseSummary',
            abortSignal
          )
          for await (const chunk of courseSummaryStream) {
            summaryState.courseSummary += chunk
          }
        } catch (e) {
          summaryState.courseSummaryError = handleError(e, {
            source: 'courseSummaryStreamSummarization',
          })
        } finally {
          summaryState.isCourseSummaryLoading = false
        }
      })()
      promises.push(courseSummaryPromise)

      const courseConceptsPromise = (async () => {
        summaryState.courseConceptsError = null
        try {
          const courseConceptsStream = summarizeContentStream(
            summaryState.currentContentSource,
            'courseConcepts',
            abortSignal
          )
          for await (const chunk of courseConceptsStream) {
            summaryState.courseConcepts += chunk
          }
        } catch (e) {
          summaryState.courseConceptsError = handleError(e, {
            source: 'courseConceptsStreamSummarization',
          })
        } finally {
          summaryState.isCourseConceptsLoading = false
        }
      })()
      promises.push(courseConceptsPromise)
    } else {
      summaryState.summaryError = null
      try {
        const webSummaryStream = summarizeContentStream(
          summaryState.currentContentSource,
          'general',
          abortSignal
        )
        let hasContent = false
        for await (const chunk of webSummaryStream) {
          summaryState.summary += chunk
          hasContent = true
        }

        // Check if stream completed without content - likely due to API error
        // BUT only if not aborted by user
        if (
          !hasContent &&
          summaryState.summary.trim() === '' &&
          !abortSignal.aborted
        ) {
          // Try to get actual error from last global error or fallback to blocking mode
          try {
            console.log(
              '[summaryStore] Stream failed silently, trying blocking mode...'
            )
            showBlockingModeToast()
            // Fallback to blocking mode to get proper error
            const blockingSummary = await summarizeContent(
              summaryState.currentContentSource,
              'general'
            )
            summaryState.summary =
              blockingSummary || '<p><i>Could not generate summary.</i></p>'
          } catch (blockingError) {
            // This should give us the proper AI SDK error
            throw blockingError
          }
        }
      } catch (e) {
        console.error('[fetchAndSummarizeStream] Web streaming error:', e)
        console.log(
          '[fetchAndSummarizeStream] Falling back to blocking mode...'
        )
        showBlockingModeToast()
        // Fallback to blocking mode to get proper error display
        try {
          const blockingSummary = await summarizeContent(
            summaryState.currentContentSource,
            'general'
          )
          summaryState.summary =
            blockingSummary || '<p><i>Could not generate summary.</i></p>'
        } catch (blockingError) {
          // This will properly display the error on UI
          const errorObject = handleError(blockingError, {
            source: 'webSummaryStreaming',
          })
          summaryState.summaryError = errorObject
          console.log(
            '[fetchAndSummarizeStream] Error set for UI:',
            summaryState.summaryError
          )
        }
      }
    }

    await Promise.all(promises)
  } catch (e) {
    const errorObject = handleError(e, {
      source: 'streamSummarization',
    })
    summaryState.summaryError = errorObject
    summaryState.lastSummaryTypeDisplayed = 'web'
  } finally {
    summaryState.isLoading = false
    // Clear abort controller after streaming completes
    summaryState.abortController = null

    // Log generated summaries to history as separate entries
    if (summaryState.isYouTubeVideoActive && summaryState.summary) {
      await logSingleSummaryToHistory(
        summaryState.summary,
        summaryState.pageTitle,
        summaryState.pageUrl,
        'Video Summary'
      )
    } else if (summaryState.isCourseVideoActive) {
      if (summaryState.courseSummary)
        await logSingleSummaryToHistory(
          summaryState.courseSummary,
          summaryState.pageTitle,
          summaryState.pageUrl,
          'Course Summary'
        )
      if (summaryState.courseConcepts)
        await logSingleSummaryToHistory(
          summaryState.courseConcepts,
          summaryState.pageTitle,
          summaryState.pageUrl,
          'Course Concepts'
        )
    } else if (summaryState.summary) {
      await logSingleSummaryToHistory(
        summaryState.summary,
        summaryState.pageTitle,
        summaryState.pageUrl,
        'Web Summary'
      )
    }
  }
}
export async function summarizeSelectedText(text) {
  if (
    summaryState.isSelectedTextLoading ||
    summaryState.isLoading ||
    summaryState.isCustomActionLoading
  ) {
    resetState()
  }

  await loadSettings()
  resetDisplayState()
  summaryState.selectedTextSummary = ''
  summaryState.selectedTextError = null
  summaryState.lastSummaryTypeDisplayed = 'selectedText'

  try {
    summaryState.isSelectedTextLoading = true

    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    summaryState.pageTitle = tabInfo.title || 'Selected Text Summary'
    summaryState.pageUrl = tabInfo.url || 'Unknown URL'

    if (!text || text.trim() === '') {
      throw new Error('No text selected for summarization.')
    }

    const summarizedText = await summarizeContent(text, 'selectedText')

    summaryState.selectedTextSummary =
      summarizedText ||
      '<p><i>Could not generate summary from this selected text.</i></p>'
  } catch (e) {
    summaryState.selectedTextError = handleError(e, {
      source: 'selectedTextSummarization',
    })
    summaryState.lastSummaryTypeDisplayed = 'selectedText'
  } finally {
    summaryState.isSelectedTextLoading = false
    await logSingleSummaryToHistory(
      summaryState.selectedTextSummary,
      summaryState.pageTitle,
      summaryState.pageUrl,
      'Selected Text'
    )
  }
}

export async function saveAllGeneratedSummariesToArchive() {
  const summariesToSave = []

  if (summaryState.summary && summaryState.summary.trim() !== '') {
    summariesToSave.push({
      title:
        summaryState.lastSummaryTypeDisplayed === 'youtube'
          ? 'Summary'
          : 'Summary',
      content: summaryState.summary,
    })
  }
  if (summaryState.courseSummary && summaryState.courseSummary.trim() !== '') {
    summariesToSave.push({
      title: 'Summary',
      content: summaryState.courseSummary,
    })
  }
  if (
    summaryState.courseConcepts &&
    summaryState.courseConcepts.trim() !== ''
  ) {
    summariesToSave.push({
      title: 'Concepts',
      content: summaryState.courseConcepts,
    })
  }
  if (
    summaryState.selectedTextSummary &&
    summaryState.selectedTextSummary.trim() !== ''
  ) {
    summariesToSave.push({
      title: 'Selected Text',
      content: summaryState.selectedTextSummary,
    })
  }

  // Add custom action result
  if (
    summaryState.customActionResult &&
    summaryState.customActionResult.trim() !== ''
  ) {
    summariesToSave.push({
      title:
        summaryState.currentActionType.charAt(0).toUpperCase() +
        summaryState.currentActionType.slice(1),
      content: summaryState.customActionResult,
    })
  }

  if (summariesToSave.length === 0) {
    // TODO: Thêm thông báo cho người dùng
    return
  }

  try {
    const archiveEntry = {
      id: generateUUID(), // Generate UUID for new entry
      title: summaryState.pageTitle || 'Tiêu đề không xác định',
      url: summaryState.pageUrl || 'URL không xác định',
      date: new Date().toISOString(),
      summaries: summariesToSave,
    }

    await addSummary(archiveEntry)
    summaryState.isArchived = true
    // Notify other components that the data has been updated
    await appStateStorage.setValue({ data_updated_at: new Date().getTime() })
  } catch (error) {}
}

/**
 * Log a single summary action to history as a separate entry
 * @param {string} content - The summary content
 * @param {string} title - The page title
 * @param {string} url - The page URL
 * @param {string} typeLabel - The label to append to the title (e.g., "Summary", "Comments")
 */
export async function logSingleSummaryToHistory(content, title, url, typeLabel) {
  if (!content || content.trim() === '') {
    return
  }

  try {
    // Import contentTypeDetector for auto-tagging
    const { detectContentType } = await import(
      '@/lib/utils/contentTypeDetector.js'
    )

    const historyEntry = {
      id: generateUUID(), // Generate UUID for new entry
      title: `${title} - ${typeLabel}`, // Append type to title
      url: url || 'URL không xác định',
      date: new Date().toISOString(),
      summaries: [
        {
          title: typeLabel,
          content: content,
        },
      ],
      contentType: detectContentType(url), // Auto-assign content type
    }

    await addHistory(historyEntry)
    document.dispatchEvent(
      new CustomEvent('saveSummarySuccess', {
        detail: { message: `Logged ${typeLabel} to History successfully!` },
      })
    )
    // Notify other components that the data has been updated
    await appStateStorage.setValue({ data_updated_at: new Date().getTime() })
  } catch (error) {
    console.error('Error logging to history:', error)
    document.dispatchEvent(
      new CustomEvent('saveSummaryError', {
        detail: { message: `Error logging to History: ${error}` },
      })
    )
  }
}

export async function logAllGeneratedSummariesToHistory() {
  // Deprecated: This function is no longer used for new logic but kept for reference or potential cleanup
  // We are now using logSingleSummaryToHistory for granular history tracking
}


/**
 * Execute custom action (analyze, explain, debate) on current page content
 * @param {string} actionType - 'analyze' | 'explain' | 'debate'
 */
export async function executeCustomAction(actionType) {
  // Prevent multiple simultaneous actions
  if (summaryState.isCustomActionLoading || summaryState.isLoading) {
    return
  }

  // Wait for settings to be initialized
  await loadSettings()
  const userSettings = settings

  // Reset Deep Dive when starting custom action
  resetDeepDive()

  // Reset custom action state
  summaryState.isCustomActionLoading = true
  summaryState.currentActionType = actionType
  summaryState.customActionResult = ''
  summaryState.customActionError = null
  // Reset model status for custom actions
  summaryState.modelStatus = {
    currentModel: null,
    fallbackFrom: null,
    isFallback: false,
  }
  summaryState.lastSummaryTypeDisplayed = 'custom'

  // Create new AbortController for this streaming operation
  summaryState.abortController = new AbortController()
  const abortSignal = summaryState.abortController.signal

  try {
    // Get current tab info
    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (!tabInfo || !tabInfo.url) {
      throw new Error('Could not get current tab information or URL.')
    }

    // Check Firefox permissions
    if (import.meta.env.BROWSER === 'firefox') {
      const hasPermission = await checkPermission(tabInfo.url)
      if (!hasPermission) {
        const permissionGranted = await requestPermission(tabInfo.url)
        if (!permissionGranted) {
          throw new Error('Permission denied for this website.')
        }
      }
    }

    // Set page info
    summaryState.pageTitle = tabInfo.title || 'Custom Action Result'
    summaryState.pageUrl = tabInfo.url

    // Get page content
    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    const contentTypeToFetch = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
      ? 'transcript'
      : 'webpageText'

    const contentResult = await getPageContent(
      contentTypeToFetch,
      userSettings.summaryLang
    )

    if (!contentResult.content || contentResult.content.trim() === '') {
      throw new Error('No content found on this page.')
    }

    // Determine the actual provider to use based on isAdvancedMode
    let selectedProviderId = userSettings.selectedProvider || 'gemini'
    if (!userSettings.isAdvancedMode) {
      selectedProviderId = 'gemini' // Force Gemini in basic mode
    }

    // Check if we should use streaming mode
    const shouldUseStreaming =
      userSettings.enableStreaming &&
      providerSupportsStreaming(selectedProviderId)

    if (shouldUseStreaming) {
      // Use streaming mode
      try {
        console.log(`[summaryStore] Starting ${actionType} streaming...`)
        const actionStream = summarizeContentStream(
          contentResult.content,
          actionType,
          abortSignal
        )
        let chunkCount = 0
        for await (const chunk of actionStream) {
          summaryState.customActionResult += chunk
          chunkCount++
        }
        console.log(
          `[summaryStore] ${actionType} streaming completed, chunks: ${chunkCount}`
        )
      } catch (streamError) {
        console.log(
          `[summaryStore] ${actionType} streaming error, falling back to blocking mode:`,
          streamError
        )
        // Fallback to blocking mode on streaming error
        const result = await summarizeContent(contentResult.content, actionType)
        summaryState.customActionResult =
          result || '<p><i>Could not generate result.</i></p>'
      }
    } else {
      // Use non-streaming mode
      const result = await summarizeContent(contentResult.content, actionType)
      summaryState.customActionResult =
        result || '<p><i>Could not generate result.</i></p>'
    }
  } catch (e) {
    const errorObject = handleError(e, {
      source: `customAction_${actionType}`,
    })
    summaryState.customActionError = errorObject
  } finally {
    summaryState.isCustomActionLoading = false
    // Clear abort controller after streaming completes
    summaryState.abortController = null

    // Log to history
    // Log to history
    const actionLabel =
      summaryState.currentActionType.charAt(0).toUpperCase() +
      summaryState.currentActionType.slice(1)
    await logSingleSummaryToHistory(
      summaryState.customActionResult,
      summaryState.pageTitle,
      summaryState.pageUrl,
      actionLabel
    )
  }
}

/**
 * Format comments data for AI analysis
 * Cleans and structures comment data to optimize for AI processing
 * @param {Array} comments - Raw comment array from content script
 * @param {Object} metadata - Metadata object with video info
 * @returns {string} Formatted markdown string ready for AI
 */
function formatCommentsForAI(comments, metadata) {
  if (!comments || comments.length === 0) {
    return 'No comments available.'
  }

  // Ultra-compact format - no metadata header
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

    // Truncate long comments (max 400 chars for better token efficiency)
    if (cleanText.length > 400) {
      cleanText = cleanText.substring(0, 397) + '...'
    }

    // Ultra compact format: @author|time|likes↑|replies💬|text
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
        // Clean reply text
        let cleanReply = reply.text
          .trim()
          .replace(/[\u{1F300}-\u{1F9FF}]{6,}/gu, '[emoji]')

        // Truncate long replies (max 200 chars)
        if (cleanReply.length > 200) {
          cleanReply = cleanReply.substring(0, 197) + '...'
        }

        // Skip very short replies
        if (cleanReply.length < 3) {
          continue
        }

        // Compact reply: indent + number.@author|text
        formatted += `  ${reply.index}.@${reply.author.name}|${cleanReply}\n`
      }
    }

    formatted += '\n'
  }

  return formatted
}

/**
 * Fetch and analyze YouTube comments
 * Fetches comments from YouTube and analyzes them with AI
 * @param {number} maxComments - Max comments to fetch (default: 50)
 * @param {number} maxRepliesPerComment - Max replies per comment (default: 10)
 */
export async function fetchCommentSummary(
  maxComments = 80,
  maxRepliesPerComment = 10
) {
  // Prevent multiple simultaneous actions
  if (summaryState.isCustomActionLoading || summaryState.isLoading) {
    console.log('[fetchCommentSummary] Already loading, skipping...')
    return
  }

  // Wait for settings to be initialized
  await loadSettings()
  const userSettings = settings

  // Reset Deep Dive when starting custom action
  resetDeepDive()

  // Reset custom action state
  summaryState.isCustomActionLoading = true
  summaryState.currentActionType = 'comments'
  summaryState.customActionResult = ''
  summaryState.customActionError = null
  // Reset model status for custom actions
  summaryState.modelStatus = {
    currentModel: null,
    fallbackFrom: null,
    isFallback: false,
  }
  summaryState.lastSummaryTypeDisplayed = 'custom'

  // Create new AbortController for this streaming operation
  summaryState.abortController = new AbortController()
  const abortSignal = summaryState.abortController.signal

  try {
    console.log('[fetchCommentSummary] Starting comment fetch...')

    // Get current tab info
    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (!tabInfo || !tabInfo.url) {
      throw new Error('Could not get current tab information or URL.')
    }

    // Verify this is a YouTube watch page
    const YOUTUBE_WATCH_PATTERN = /youtube\.com\/watch/i
    if (!YOUTUBE_WATCH_PATTERN.test(tabInfo.url)) {
      throw new Error('This feature only works on YouTube video pages.')
    }

    // Check Firefox permissions
    if (import.meta.env.BROWSER === 'firefox') {
      const hasPermission = await checkPermission(tabInfo.url)
      if (!hasPermission) {
        const permissionGranted = await requestPermission(tabInfo.url)
        if (!permissionGranted) {
          throw new Error('Permission denied for this website.')
        }
      }
    }

    // Set page info
    summaryState.pageTitle = tabInfo.title || 'YouTube Comment Analysis'
    summaryState.pageUrl = tabInfo.url

    console.log('[fetchCommentSummary] Sending message to content script...')

    // Send message to content script to fetch comments
    const response = await browser.tabs.sendMessage(tabInfo.id, {
      action: 'fetchYouTubeComments',
      maxComments: maxComments,
      maxRepliesPerComment: maxRepliesPerComment,
    })

    console.log('[fetchCommentSummary] Received response:', response)

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

    // Format comments for AI
    console.log(
      `[fetchCommentSummary] Formatting ${response.comments.length} comments...`
    )
    console.log(
      '[DEBUG] Raw comments sample:',
      JSON.stringify(response.comments.slice(0, 2), null, 2)
    )
    console.log('[DEBUG] Metadata:', response.metadata)

    const formattedData = formatCommentsForAI(
      response.comments,
      response.metadata
    )

    console.log(
      '[fetchCommentSummary] Formatted data length:',
      formattedData.length
    )
    console.log(
      '[DEBUG] Formatted data preview (first 1000 chars):',
      formattedData.substring(0, 1000)
    )

    // Determine the actual provider to use based on isAdvancedMode
    let selectedProviderId = userSettings.selectedProvider || 'gemini'
    if (!userSettings.isAdvancedMode) {
      selectedProviderId = 'gemini' // Force Gemini in basic mode
    }

    // Check if we should use streaming mode
    const shouldUseStreaming =
      userSettings.enableStreaming &&
      providerSupportsStreaming(selectedProviderId)

    console.log('[fetchCommentSummary] Streaming mode:', shouldUseStreaming)
    console.log('[DEBUG] Formatted data length:', formattedData.length)
    console.log(
      '[DEBUG] Formatted data preview (first 500 chars):',
      formattedData.substring(0, 500)
    )

    if (shouldUseStreaming) {
      // Use streaming mode
      try {
        console.log(
          '[fetchCommentSummary] Starting comment analysis streaming...'
        )
        console.log(
          '[DEBUG] Calling summarizeContentStream with contentType: commentAnalysis'
        )
        const actionStream = summarizeContentStream(
          formattedData,
          'commentAnalysis',
          abortSignal
        )
        let chunkCount = 0
        for await (const chunk of actionStream) {
          summaryState.customActionResult += chunk
          chunkCount++
        }
        console.log(
          `[fetchCommentSummary] Streaming completed, chunks: ${chunkCount}`
        )
        console.log(
          '[DEBUG] Final streaming result length:',
          summaryState.customActionResult.length
        )
        console.log(
          '[DEBUG] Final streaming result preview (first 500 chars):',
          summaryState.customActionResult.substring(0, 500)
        )

        // If streaming completed with 0 chunks, it might be a silent error
        // Fallback to blocking mode to get proper error
        if (chunkCount === 0 && summaryState.customActionResult.trim() === '') {
          console.log(
            '[fetchCommentSummary] Streaming failed silently (0 chunks), trying blocking mode...'
          )
          try {
            const blockingResult = await summarizeContent(
              formattedData,
              'commentAnalysis'
            )
            console.log(
              '[DEBUG] Fallback result length:',
              blockingResult ? blockingResult.length : 0
            )
            console.log(
              '[DEBUG] Fallback result preview (first 500 chars):',
              blockingResult ? blockingResult.substring(0, 500) : 'No result'
            )
            summaryState.customActionResult =
              blockingResult ||
              '<p><i>Could not generate comment analysis.</i></p>'
          } catch (blockingError) {
            // This will properly display the error with correct error code
            const errorObject = handleError(blockingError, {
              source: 'commentAnalysisStreaming',
            })
            summaryState.customActionError = errorObject
            console.log(
              '[fetchCommentSummary] Error set for UI:',
              summaryState.customActionError
            )
          }
        }
      } catch (streamError) {
        console.log(
          '[fetchCommentSummary] Streaming error, falling back to blocking mode:',
          streamError
        )
        // Fallback to blocking mode on streaming error
        console.log(
          '[DEBUG] Calling summarizeContent with contentType: commentAnalysis (fallback)'
        )
        const result = await summarizeContent(formattedData, 'commentAnalysis')
        console.log(
          '[DEBUG] Fallback result length:',
          result ? result.length : 0
        )
        console.log(
          '[DEBUG] Fallback result preview (first 500 chars):',
          result ? result.substring(0, 500) : 'No result'
        )
        summaryState.customActionResult =
          result || '<p><i>Could not generate comment analysis.</i></p>'
      }
    } else {
      // Use non-streaming mode
      console.log('[fetchCommentSummary] Using non-streaming mode...')
      console.log(
        '[DEBUG] Calling summarizeContent with contentType: commentAnalysis (non-streaming)'
      )
      const result = await summarizeContent(formattedData, 'commentAnalysis')
      console.log(
        '[DEBUG] Non-streaming result length:',
        result ? result.length : 0
      )
      console.log(
        '[DEBUG] Non-streaming result preview (first 500 chars):',
        result ? result.substring(0, 500) : 'No result'
      )
      summaryState.customActionResult =
        result || '<p><i>Could not generate comment analysis.</i></p>'
    }

    console.log('[fetchCommentSummary] Analysis completed successfully')
  } catch (e) {
    console.error('[fetchCommentSummary] Error:', e)
    const errorObject = handleError(e, {
      source: 'commentAnalysis',
    })
    summaryState.customActionError = errorObject
  } finally {
    summaryState.isCustomActionLoading = false
    // Clear abort controller after streaming completes
    summaryState.abortController = null

    // Log to history
    // Log to history
    await logSingleSummaryToHistory(
      summaryState.customActionResult,
      summaryState.pageTitle,
      summaryState.pageUrl,
      'Comments'
    )
  }
}
