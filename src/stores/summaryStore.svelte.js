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

// --- State ---
export const summaryState = $state({
  summary: '',
  chapterSummary: '',
  courseSummary: '',
  courseConcepts: '',
  isLoading: false,
  isChapterLoading: false,
  isCourseSummaryLoading: false,
  isCourseConceptsLoading: false,
  summaryError: null, // Will hold the structured error object
  chapterError: null,
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
})

// --- Actions ---

/**
 * Reset all summary-related states.
 */
export function resetState() {
  summaryState.summary = ''
  summaryState.chapterSummary = ''
  summaryState.courseSummary = ''
  summaryState.courseConcepts = ''
  summaryState.selectedTextSummary = ''
  summaryState.isLoading = false
  summaryState.isChapterLoading = false
  summaryState.isCourseSummaryLoading = false
  summaryState.isCourseConceptsLoading = false
  summaryState.isSelectedTextLoading = false
  summaryState.summaryError = null
  summaryState.chapterError = null
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
}

/**
 * Resets only the display-related states, clearing current summaries.
 */
export function resetDisplayState() {
  summaryState.summary = ''
  summaryState.chapterSummary = ''
  summaryState.courseSummary = ''
  summaryState.courseConcepts = ''
  summaryState.selectedTextSummary = ''
  summaryState.summaryError = null
  summaryState.chapterError = null
  summaryState.courseSummaryError = null
  summaryState.courseConceptsError = null
  summaryState.selectedTextError = null
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
  summaryState.activeCourseTab = 'courseSummary'
  summaryState.customActionResult = ''
  summaryState.customActionError = null
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
  if (summaryState.isLoading || summaryState.isChapterLoading) {
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
    // Use streaming mode
    await fetchAndSummarizeStream()
    // Ensure all loading states are set to false after streaming completes
    summaryState.isLoading = false
    summaryState.isChapterLoading = false
    summaryState.isCourseSummaryLoading = false
    summaryState.isCourseConceptsLoading = false
    // logAllGeneratedSummariesToHistory() is called within fetchAndSummarizeStream
    return // Exit the function after streaming
  }

  // Use non-streaming mode (existing logic)
  try {
    // Immediately set loading states inside try block
    summaryState.isLoading = true
    summaryState.isChapterLoading = true
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
      mainContentTypeToFetch = 'transcript'
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
      const chapterPromise = (async () => {
        summaryState.chapterError = null
        try {
          const chapterContentResult = await getPageContent(
            'timestampedTranscript',
            userSettings.summaryLang
          )
          const chapterSummarizedText = await summarizeChapters(
            chapterContentResult.content
          )
          summaryState.chapterSummary =
            chapterSummarizedText ||
            '<p><i>Could not generate chapter summary.</i></p>'
        } catch (e) {
          const errorObject = handleError(e, {
            source: 'chapterSummarization',
          })
          summaryState.chapterError = errorObject
        } finally {
          summaryState.isChapterLoading = false
        }
      })()

      const videoSummaryPromise = (async () => {
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
        } finally {
          summaryState.isLoading = false
        }
      })()
      await Promise.all([chapterPromise, videoSummaryPromise])
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
    summaryState.isChapterLoading = false
    summaryState.isCourseSummaryLoading = false
    summaryState.isCourseConceptsLoading = false

    // Log all generated summaries to history after all loading is complete
    await logAllGeneratedSummariesToHistory()
  }
}
export async function fetchAndSummarizeStream() {
  if (
    summaryState.isLoading ||
    summaryState.isChapterLoading ||
    summaryState.isCourseSummaryLoading ||
    summaryState.isCourseConceptsLoading
  ) {
    resetState()
  }

  await loadSettings()
  const userSettings = settings
  resetState()

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
      mainContentTypeToFetch = 'transcript'
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
      summaryState.isChapterLoading = true
      const chapterStreamPromise = (async () => {
        summaryState.chapterError = null
        try {
          const chapterContentResult = await getPageContent(
            'timestampedTranscript',
            userSettings.summaryLang
          )
          const chapterStream = summarizeChaptersStream(
            chapterContentResult.content
          )
          for await (const chunk of chapterStream) {
            summaryState.chapterSummary += chunk
          }
        } catch (e) {
          if (e.message?.includes('transcript')) {
            summaryState.chapterSummary =
              '<p><i>Failed to get transcript for chapters.</i></p>'
          } else {
            summaryState.chapterError = handleError(e, {
              source: 'chapterStreamSummarization',
            })
            // Re-throw to be caught by the main handler
            throw e
          }
        } finally {
          summaryState.isChapterLoading = false
        }
      })()
      promises.push(chapterStreamPromise)

      summaryState.summaryError = null
      try {
        console.log('[summaryStore] Starting YouTube video streaming...')
        const videoSummaryStream = summarizeContentStream(
          summaryState.currentContentSource,
          'youtube'
        )
        let chunkCount = 0
        for await (const chunk of videoSummaryStream) {
          summaryState.summary += chunk
          chunkCount++
        }
        console.log(
          `[summaryStore] YouTube streaming completed, chunks: ${chunkCount}`
        )
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
            'courseSummary'
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
            'courseConcepts'
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
          'general'
        )
        let hasContent = false
        for await (const chunk of webSummaryStream) {
          summaryState.summary += chunk
          hasContent = true
        }

        // Check if stream completed without content - likely due to API error
        if (!hasContent && summaryState.summary.trim() === '') {
          // Try to get actual error from last global error or fallback to blocking mode
          try {
            console.log(
              '[summaryStore] Stream failed silently, trying blocking mode...'
            )
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
        const errorObject = handleError(e, {
          source: 'webSummaryStreaming',
        })
        summaryState.summaryError = errorObject
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
    await logAllGeneratedSummariesToHistory()
  }
}
export async function summarizeSelectedText(text) {
  if (
    summaryState.isSelectedTextLoading ||
    summaryState.isLoading ||
    summaryState.isChapterLoading
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
    await logAllGeneratedSummariesToHistory()
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
  if (
    summaryState.chapterSummary &&
    summaryState.chapterSummary.trim() !== ''
  ) {
    summariesToSave.push({
      title: 'Chapters',
      content: summaryState.chapterSummary,
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

export async function logAllGeneratedSummariesToHistory() {
  const summariesToLog = []

  if (summaryState.summary && summaryState.summary.trim() !== '') {
    summariesToLog.push({
      title:
        summaryState.lastSummaryTypeDisplayed === 'youtube'
          ? 'Summary'
          : 'Summary',
      content: summaryState.summary,
    })
  }
  if (
    summaryState.chapterSummary &&
    summaryState.chapterSummary.trim() !== ''
  ) {
    summariesToLog.push({
      title: 'Chapters',
      content: summaryState.chapterSummary,
    })
  }
  if (summaryState.courseSummary && summaryState.courseSummary.trim() !== '') {
    summariesToLog.push({
      title: 'Summary',
      content: summaryState.courseSummary,
    })
  }
  if (
    summaryState.courseConcepts &&
    summaryState.courseConcepts.trim() !== ''
  ) {
    summariesToLog.push({
      title: 'Concepts',
      content: summaryState.courseConcepts,
    })
  }
  if (
    summaryState.selectedTextSummary &&
    summaryState.selectedTextSummary.trim() !== ''
  ) {
    summariesToLog.push({
      title: 'Selected Text',
      content: summaryState.selectedTextSummary,
    })
  }

  // Add custom action result
  if (
    summaryState.customActionResult &&
    summaryState.customActionResult.trim() !== ''
  ) {
    summariesToLog.push({
      title:
        summaryState.currentActionType.charAt(0).toUpperCase() +
        summaryState.currentActionType.slice(1),
      content: summaryState.customActionResult,
    })
  }

  if (summariesToLog.length === 0) {
    return
  }

  try {
    const historyEntry = {
      id: generateUUID(), // Generate UUID for new entry
      title: summaryState.pageTitle || 'Tiêu đề không xác định',
      url: summaryState.pageUrl || 'URL không xác định',
      date: new Date().toISOString(),
      summaries: summariesToLog,
    }

    await addHistory(historyEntry)
    document.dispatchEvent(
      new CustomEvent('saveSummarySuccess', {
        detail: { message: 'Logged to History successfully!' },
      })
    )
    // Notify other components that the data has been updated
    await appStateStorage.setValue({ data_updated_at: new Date().getTime() })
  } catch (error) {
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

  // Reset custom action state
  summaryState.isCustomActionLoading = true
  summaryState.currentActionType = actionType
  summaryState.customActionResult = ''
  summaryState.customActionError = null
  summaryState.lastSummaryTypeDisplayed = 'custom'

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
    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i;
    const contentTypeToFetch = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
      ? 'transcript'
      : 'webpageText';

    const contentResult = await getPageContent(
      contentTypeToFetch,
      userSettings.summaryLang
    )

    if (!contentResult.content || contentResult.content.trim() === '') {
      throw new Error('No content found on this page.')
    }

    // Execute custom action using existing summarizeContent function
    const result = await summarizeContent(contentResult.content, actionType)

    summaryState.customActionResult =
      result || '<p><i>Could not generate result.</i></p>'
  } catch (e) {
    const errorObject = handleError(e, {
      source: `customAction_${actionType}`,
    })
    summaryState.customActionError = errorObject
  } finally {
    summaryState.isCustomActionLoading = false
    // Log to history
    await logAllGeneratedSummariesToHistory()
  }
}
