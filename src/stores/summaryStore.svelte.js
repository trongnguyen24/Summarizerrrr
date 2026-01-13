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
import {
  formatCommentsForAI,
  fetchYouTubeComments,
} from '@/lib/utils/youtubeUtils.js'
import {
  getOrCreateTabState,
  getCurrentTabId,
} from '@/services/tabCacheService.js'

// Import shared initial state
import { createDefaultSummaryState } from '@/lib/constants/initialStates.js'

// --- State ---
// --- State ---
export const summaryState = $state(createDefaultSummaryState())

// Global signal for background updates
export const globalStoreUpdate = $state({ version: 0 })

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

  // Explicitly reset all loading states to ensure UI updates immediately
  summaryState.isLoading = false
  summaryState.isCourseSummaryLoading = false
  summaryState.isCourseConceptsLoading = false
  summaryState.isSelectedTextLoading = false
  summaryState.isCustomActionLoading = false

  // Check if we should reset the display state (if no content was generated)
  const hasContent =
    (summaryState.summary && summaryState.summary.trim() !== '') ||
    (summaryState.courseSummary && summaryState.courseSummary.trim() !== '') ||
    (summaryState.courseConcepts &&
      summaryState.courseConcepts.trim() !== '') ||
    (summaryState.selectedTextSummary &&
      summaryState.selectedTextSummary.trim() !== '') ||
    (summaryState.customActionResult &&
      summaryState.customActionResult.trim() !== '')

  if (!hasContent) {
    console.log(
      '[summaryStore] No content generated when stopped, resetting display state'
    )
    summaryState.lastSummaryTypeDisplayed = null
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
  const targetTabId = getCurrentTabId()
  const perTabCacheEnabled = settings.tools?.perTabCache?.enabled ?? true
  let logData = null // Capture data for history logging

  /**
   * Helper to update state for the target tab (and global if active)
   * @param {Object} updates - Key-value pairs to update
   */
  const updateState = (updates) => {
    // 1. Update the tab-specific state in cache
    if (perTabCacheEnabled && targetTabId) {
      const tabState = getOrCreateTabState(targetTabId)
      if (tabState) {
        Object.assign(tabState.summaryState, updates)
      }
    }

    // 2. Update the global state IF we are looking at the target tab
    //    OR if per-tab cache is disabled
    if (!perTabCacheEnabled || targetTabId === getCurrentTabId()) {
      Object.assign(summaryState, updates)
    }

    // Trigger global update for UI lists
    globalStoreUpdate.version++
  }

  /**
   * Helper to reset state for local/target tab
   */
  const resetLocalState = () => {
    // Abort any ongoing streaming operation if it matches global state
    if ((!perTabCacheEnabled || targetTabId === getCurrentTabId()) && summaryState.abortController) {
      summaryState.abortController.abort()
      summaryState.abortController = null
    }

    const resetValues = {
      summary: '',
      courseSummary: '',
      courseConcepts: '',
      selectedTextSummary: '',
      isLoading: false,
      isCourseSummaryLoading: false,
      isCourseConceptsLoading: false,
      isSelectedTextLoading: false,
      summaryError: null,
      courseSummaryError: null,
      courseConceptsError: null,
      selectedTextError: null,
      isYouTubeVideoActive: false,
      isCourseVideoActive: false,
      currentContentSource: '',
      lastSummaryTypeDisplayed: null,
      activeYouTubeTab: 'videoSummary',
      activeCourseTab: 'courseSummary',
      pageTitle: '',
      pageUrl: '',
      isArchived: false,
      currentActionType: 'summarize',
      customActionResult: '',
      isCustomActionLoading: false,
      customActionError: null,
      modelStatus: {
        currentModel: null,
        fallbackFrom: null,
        isFallback: false,
      },
    }
    
    updateState(resetValues)
    
    // Reset DeepDive (global only if active)
    if (!perTabCacheEnabled || targetTabId === getCurrentTabId()) {
      resetDeepDive()
    }
  }

  // If a summarization process is already ongoing, reset state and start a new one
  if (summaryState.isLoading || summaryState.isCustomActionLoading) {
    resetLocalState()
  }

  // Wait for settings to be initialized
  await loadSettings()

  const userSettings = settings

  // Reset state before starting
  resetLocalState()

  // Determine the actual provider to use based on isAdvancedMode
  let selectedProviderId = userSettings.selectedProvider || 'gemini'
  if (!userSettings.isAdvancedMode) {
    selectedProviderId = 'gemini' // Force Gemini in basic mode
  }

  // Check if we should use streaming mode
  // FORCE DISABLE STREAMING if per-tab cache is enabled
  const shouldUseStreaming =
    !perTabCacheEnabled &&
    userSettings.enableStreaming &&
    providerSupportsStreaming(selectedProviderId)

  if (shouldUseStreaming) {
    try {
      // Use streaming mode
      await fetchAndSummarizeStream()
    } catch (streamError) {
      console.error('[fetchAndSummarize] Streaming error caught:', streamError)
    } finally {
      summaryState.isLoading = false
      summaryState.isCourseSummaryLoading = false
      summaryState.isCourseConceptsLoading = false
    }
    return
  }

  // Use non-streaming mode (Blocking)
  try {
    // Immediately set loading states
    updateState({
        isLoading: true,
        isCourseSummaryLoading: true,
        isCourseConceptsLoading: true
    })

    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tabInfo || !tabInfo.url) {
      throw new Error('Could not get current tab information or URL.')
    }

    // Check permissions cho Firefox
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

    // Save page info
    updateState({
        pageTitle: tabInfo.title || 'Unknown Title',
        pageUrl: tabInfo.url || 'Unknown URL'
    })

    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    const COURSE_MATCH_PATTERN =
      /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i

    const isYouTube = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
    const isCourse = COURSE_MATCH_PATTERN.test(tabInfo.url)
    
    updateState({
        isYouTubeVideoActive: isYouTube,
        isCourseVideoActive: isCourse
    })

    let mainContentTypeToFetch = 'webpageText'
    let summaryType = 'general'
    let lastType = 'web'

    if (isYouTube) {
      mainContentTypeToFetch = 'timestampedTranscript'
      summaryType = 'youtube'
      lastType = 'youtube'
    } else if (isCourse) {
      mainContentTypeToFetch = 'transcript'
      summaryType = 'courseSummary'
      lastType = 'course'
    }

    updateState({ lastSummaryTypeDisplayed: lastType })

    const mainContentResult = await getPageContent(
      mainContentTypeToFetch,
      userSettings.summaryLang
    )
    updateState({ currentContentSource: mainContentResult.content })

    if (isYouTube) {
      try {
        const videoSummarizedText = await summarizeContent(
          mainContentResult.content,
          'youtube'
        )
        const finalContent = videoSummarizedText || '<p><i>Could not generate video summary.</i></p>'
        updateState({
            summary: finalContent,
            summaryError: null
        })
        logData = { content: finalContent, title: tabInfo.title, url: tabInfo.url, type: 'Video Summary' }
      } catch (e) {
        const errorObject = handleError(e, {
          source: 'youtubeVideoSummarization',
        })
        updateState({ summaryError: errorObject })
      }
    } else if (isCourse) {
      // Course Summary
      try {
        updateState({
            isCourseSummaryLoading: true,
            isCourseConceptsLoading: false,
            courseSummaryError: null
        })
        const courseSummaryText = await summarizeContent(
           mainContentResult.content,
           'courseSummary'
        )
        const finalContent = courseSummaryText || '<p><i>Could not generate course summary.</i></p>'
        updateState({ courseSummary: finalContent })
        logData = { content: finalContent, title: tabInfo.title, url: tabInfo.url, type: 'Course Summary' }
      } catch (e) {
        updateState({
            courseSummaryError: handleError(e, { source: 'courseSummarySummarization' })
        })
      } finally {
        updateState({ isCourseSummaryLoading: false })
      }
    } else {
      // General Web Summary
      try {
        updateState({ summaryError: null })
        const webSummaryText = await summarizeContent(
          mainContentResult.content,
          'general'
        )
        const finalContent = webSummaryText || '<p><i>Could not generate summary.</i></p>'
        updateState({
            summary: finalContent
        })
        logData = { content: finalContent, title: tabInfo.title, url: tabInfo.url, type: 'Web Summary' }
      } catch (e) {
        updateState({
            summaryError: handleError(e, { source: 'webSummarization' })
        })
      }
    }
  } catch (error) {
    if (error.message === 'Could not get current tab information or URL.') {
      updateState({
          summaryError: {
            message: error.message,
            origError: error,
            failedAction: 'Initialization',
          }
      })
    } else {
       updateState({
           summaryError: handleError(error, { source: 'fetchAndSummarize' })
       })
    }
  } finally {
    updateState({
        isLoading: false,
        isCourseSummaryLoading: false,
        isCourseConceptsLoading: false
    })
    
    if (logData) {
       await logSingleSummaryToHistory(logData.content, logData.title, logData.url, logData.type)
       console.log(`[summaryStore] Logged history for tab ${targetTabId} (Backround safe)`)
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

/**
 * Fetches and generates Course Concepts summary.
 * Standalone custom action for course pages (Udemy/Coursera).
 */
export async function fetchCourseConcepts() {
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

  // Reset Deep Dive when starting course concepts
  resetDeepDive()

  // Reset custom action state for course concepts
  summaryState.isCustomActionLoading = true
  summaryState.lastSummaryTypeDisplayed = 'custom'
  summaryState.currentActionType = 'courseConcepts'
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

    // Verify this is a course page
    const COURSE_MATCH_PATTERN = /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i
    if (!COURSE_MATCH_PATTERN.test(tabInfo.url)) {
      throw new Error('Course Concepts is only available for Udemy/Coursera course pages.')
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

    // Fetch course transcript
    console.log('[summaryStore] Fetching transcript for course concepts')
    const contentResult = await getPageContent(
      'transcript',
      userSettings.summaryLang
    )
    const transcript = contentResult.content

    // Generate course concepts
    if (shouldUseStreaming) {
      // Use streaming mode
      try {
        console.log('[summaryStore] Starting course concepts streaming...')
        const conceptsStream = summarizeContentStream(transcript, 'courseConcepts', abortSignal)
        let chunkCount = 0
        for await (const chunk of conceptsStream) {
          summaryState.customActionResult += chunk
          chunkCount++
        }
        console.log(
          `[summaryStore] Course concepts streaming completed, chunks: ${chunkCount}`
        )
      } catch (streamError) {
        console.log(
          '[summaryStore] Course concepts streaming error, falling back to blocking mode:',
          streamError
        )
        showBlockingModeToast()
        // Fallback to blocking mode
        const conceptsText = await summarizeContent(transcript, 'courseConcepts')
        summaryState.customActionResult =
          conceptsText || '<p><i>Could not generate course concepts.</i></p>'
      }
    } else {
      // Use non-streaming mode
      const conceptsText = await summarizeContent(transcript, 'courseConcepts')
      summaryState.customActionResult =
        conceptsText || '<p><i>Could not generate course concepts.</i></p>'
    }

    // Update page info
    summaryState.pageTitle = tabInfo.title || 'Unknown Title'
    summaryState.pageUrl = tabInfo.url || 'Unknown URL'

  } catch (e) {
    const errorObject = handleError(e, {
      source: 'courseConceptsSummarization',
    })
    summaryState.customActionError = errorObject
  } finally {
    summaryState.isCustomActionLoading = false
    // Clear abort controller after streaming completes
    summaryState.abortController = null

    // Log to history after course concepts is complete
    await logSingleSummaryToHistory(
      summaryState.customActionResult,
      summaryState.pageTitle,
      summaryState.pageUrl,
      'Course Concepts'
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
      // Course: chỉ streaming courseSummary, courseConcepts là custom action riêng
      summaryState.isCourseSummaryLoading = true
      summaryState.isCourseConceptsLoading = false
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

    // Trigger cloud sync after adding new summary
    try {
      const { triggerSync } = await import(
        '@/services/cloudSync/cloudSyncService.svelte.js'
      )
      triggerSync()
    } catch (syncError) {
      console.warn('Failed to trigger sync after adding summary:', syncError)
    }

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

    // Trigger cloud sync after adding new history entry
    try {
      const { triggerSync } = await import(
        '@/services/cloudSync/cloudSyncService.svelte.js'
      )
      triggerSync()
    } catch (syncError) {
      console.warn('Failed to trigger sync after adding history:', syncError)
    }

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
    const response = await fetchYouTubeComments(tabInfo.id, {
      maxComments,
      maxRepliesPerComment,
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
