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
}

/**
 * Updates the video active states.
 * @param {boolean} isYouTube - Whether the current tab is a YouTube video.
 * @param {boolean} isCourse - Whether the current tab is a Course video.
 */
export function updateVideoActiveStates(isYouTube, isCourse) {
  summaryState.isYouTubeVideoActive = isYouTube
  summaryState.isCourseVideoActive = isCourse
  console.log(
    `[summaryStore] isYouTubeVideoActive updated to: ${isYouTube}, isCourseVideoActive updated to: ${isCourse}`
  )
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
  console.log('[summaryStore] fetchAndSummarize called.')
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

    console.log('[summaryStore] Checking tab type...')
    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tabInfo || !tabInfo.url) {
      throw new Error('Could not get current tab information or URL.')
    }

    // LƯU TIÊU ĐỀ VÀ URL VÀO STATE NGAY TẠI ĐÂY
    summaryState.pageTitle = tabInfo.title || 'Unknown Title'
    summaryState.pageUrl = tabInfo.url || 'Unknown URL'

    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    const COURSE_MATCH_PATTERN =
      /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i // Kết hợp Udemy và Coursera

    summaryState.isYouTubeVideoActive = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
    summaryState.isCourseVideoActive = COURSE_MATCH_PATTERN.test(tabInfo.url)

    console.log(
      `[summaryStore] Current tab is: ${tabInfo.url}. YouTube video: ${summaryState.isYouTubeVideoActive}. Course video: ${summaryState.isCourseVideoActive}`
    )

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
    console.log(
      `[summaryStore] Will fetch main content type: ${mainContentTypeToFetch} for summary type: ${summaryType}`
    )

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
          console.error('[summaryStore] Chapter summarization error:', e)
          const errorObject = handleError(e, {
            source: 'chapterSummarization',
          })
          summaryState.chapterError = errorObject
          console.log(
            '[summaryStore] Chapter error set to state:',
            summaryState.chapterError
          )
        } finally {
          summaryState.isChapterLoading = false
          console.log(
            '[summaryStore] Chapter loading set to false, error state:',
            summaryState.chapterError
          )
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
          console.error('[summaryStore] YouTube video summarization error:', e)
          const errorObject = handleError(e, {
            source: 'youtubeVideoSummarization',
          })
          summaryState.summaryError = errorObject
          console.log(
            '[summaryStore] Video summary error set to state:',
            summaryState.summaryError
          )
        } finally {
          summaryState.isLoading = false
          console.log(
            '[summaryStore] Video loading set to false, error state:',
            summaryState.summaryError
          )
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
          console.error('[summaryStore] Course summarization error:', e)
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
          console.error('[summaryStore] Course concept explanation error:', e)
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
        console.error('[summaryStore] General summarization error:', e)
        const errorObject = handleError(e, {
          source: 'generalSummarization',
        })
        summaryState.summaryError = errorObject
        console.log(
          '[summaryStore] General summary error set to state:',
          summaryState.summaryError
        )
      }
    }
  } catch (e) {
    console.error('[summaryStore] Error during main summarization process:', e)
    const errorObject = handleError(e, {
      source: 'mainSummarizationProcess',
    })
    summaryState.summaryError = errorObject
    console.log(
      '[summaryStore] Main process error set to state:',
      summaryState.summaryError
    )
    // Don't change the lastSummaryTypeDisplayed on error,
    // so the UI can show the error in the correct context (e.g., YouTube tab).
  } finally {
    // Ensure all loading states are set to false
    summaryState.isLoading = false
    summaryState.isChapterLoading = false
    summaryState.isCourseSummaryLoading = false
    summaryState.isCourseConceptsLoading = false

    console.log(
      '[summaryStore] All loading states set to false. Current error states:',
      {
        summaryError: summaryState.summaryError,
        chapterError: summaryState.chapterError,
        courseSummaryError: summaryState.courseSummaryError,
        courseConceptsError: summaryState.courseConceptsError,
      }
    )

    // Log all generated summaries to history after all loading is complete
    await logAllGeneratedSummariesToHistory()
  }
}
export async function fetchAndSummarizeStream() {
  console.log('[summaryStore] fetchAndSummarizeStream called.')
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
          summaryState.chapterError = handleError(e, {
            source: 'chapterStreamSummarization',
          })
        } finally {
          summaryState.isChapterLoading = false
        }
      })()
      promises.push(chapterStreamPromise)

      summaryState.summaryError = null
      try {
        const videoSummaryStream = summarizeContentStream(
          summaryState.currentContentSource,
          'youtube'
        )
        for await (const chunk of videoSummaryStream) {
          summaryState.summary += chunk
        }
      } catch (e) {
        console.error('[summaryStore] YouTube video streaming error:', e)
        const errorObject = handleError(e, {
          source: 'youtubeVideoStreaming',
        })
        summaryState.summaryError = errorObject
        console.log(
          '[summaryStore] YouTube video error set to state:',
          summaryState.summaryError
        )
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
      console.log('[summaryStore] Starting web summary streaming...')
      try {
        const webSummaryStream = summarizeContentStream(
          summaryState.currentContentSource,
          'general'
        )
        console.log('[summaryStore] Got stream object, starting iteration...')
        let hasContent = false
        for await (const chunk of webSummaryStream) {
          console.log(
            '[summaryStore] Received chunk:',
            chunk?.length || 'unknown length'
          )
          summaryState.summary += chunk
          hasContent = true
        }
        console.log('[summaryStore] Stream completed successfully')

        // Check if stream completed without content (likely due to error)
        if (!hasContent && summaryState.summary.trim() === '') {
          console.log(
            '[summaryStore] Stream completed but no content received - treating as error'
          )
          // Try to capture the original AI SDK error from global store
          const originalError =
            window.lastAISDKError ||
            new Error('API key not valid. Please pass a valid API key.')
          console.log(
            '[summaryStore] Throwing original AI SDK error:',
            originalError
          )
          throw originalError
        }
      } catch (e) {
        console.error('[summaryStore] Web summary streaming error:', e)
        console.log('[summaryStore] Error type:', typeof e)
        console.log('[summaryStore] Error constructor:', e?.constructor?.name)

        const errorObject = handleError(e, {
          source: 'webSummaryStreaming',
        })
        console.log('[summaryStore] handleError returned:', errorObject)

        summaryState.summaryError = errorObject
        console.log(
          '[summaryStore] Web summary error set to state:',
          summaryState.summaryError
        )
        console.log(
          '[summaryStore] summaryState.summaryError === errorObject:',
          summaryState.summaryError === errorObject
        )
      }
    }

    await Promise.all(promises)
  } catch (e) {
    console.error('[summaryStore] Error during stream summarization:', e)
    const errorObject = handleError(e, {
      source: 'streamSummarization',
    })
    summaryState.summaryError = errorObject
    console.log(
      '[summaryStore] Stream error set to state:',
      summaryState.summaryError
    )
    summaryState.lastSummaryTypeDisplayed = 'web'
  } finally {
    summaryState.isLoading = false
    console.log(
      '[summaryStore] Stream loading set to false, error state:',
      summaryState.summaryError
    )
    await logAllGeneratedSummariesToHistory()
  }
}
export async function summarizeSelectedText(text) {
  if (
    summaryState.isSelectedTextLoading ||
    summaryState.isLoading ||
    summaryState.isChapterLoading
  ) {
    console.warn(
      '[summaryStore] Summarization in progress, resetting for selected text.'
    )
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

    console.log('[summaryStore] Starting selected text summarization...')
    const summarizedText = await summarizeContent(text, 'selectedText')

    summaryState.selectedTextSummary =
      summarizedText ||
      '<p><i>Could not generate summary from this selected text.</i></p>'
    console.log('[summaryStore] Selected text summary processed.')
  } catch (e) {
    console.error('[summaryStore] Selected text summarization error:', e)
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

  if (summariesToSave.length === 0) {
    console.warn('Không có bản tóm tắt nào để lưu vào Archive.')
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
    console.log(
      'Đã lưu tất cả các bản tóm tắt đã tạo vào Archive:',
      archiveEntry
    )
    summaryState.isArchived = true
    // Notify other components that the data has been updated
    await appStateStorage.setValue({ data_updated_at: new Date().getTime() })
  } catch (error) {
    console.error(
      'Lỗi khi lưu tất cả các bản tóm tắt đã tạo vào Archive:',
      error
    )
  }
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

  if (summariesToLog.length === 0) {
    console.warn('Không có bản tóm tắt nào để ghi vào History.')
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
    console.log(
      'Đã ghi tất cả các bản tóm tắt đã tạo vào History:',
      historyEntry
    )
    document.dispatchEvent(
      new CustomEvent('saveSummarySuccess', {
        detail: { message: 'Logged to History successfully!' },
      })
    )
    // Notify other components that the data has been updated
    await appStateStorage.setValue({ data_updated_at: new Date().getTime() })
  } catch (error) {
    console.error(
      'Lỗi khi ghi tất cả các bản tóm tắt đã tạo vào History:',
      error
    )
    document.dispatchEvent(
      new CustomEvent('saveSummaryError', {
        detail: { message: `Error logging to History: ${error}` },
      })
    )
  }
}
