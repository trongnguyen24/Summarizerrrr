// @ts-nocheck
import { marked } from 'marked'
import { getPageContent } from '../services/contentService.js'
import { getActiveTabInfo } from '../services/chromeService.js'
import { settings, loadSettings } from './settingsStore.svelte.js'
import {
  summarizeContent,
  summarizeChapters,
  summarizeContentStream,
  summarizeChaptersStream,
  providerSupportsStreaming,
} from '../lib/api.js'
import {
  addSummary,
  addHistory,
  getSummaryById,
  getHistoryById,
} from '../lib/indexedDBService.js'
import { setStorage } from '../services/chromeService.js'
import { generateUUID } from '../lib/utils.js'

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
  error: '',
  chapterError: '',
  courseSummaryError: '',
  courseConceptsError: '',
  isYouTubeVideoActive: false,
  isCourseVideoActive: false,
  currentContentSource: '',
  selectedTextSummary: '',
  isSelectedTextLoading: false,
  selectedTextError: '',
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
  summaryState.error = ''
  summaryState.chapterError = ''
  summaryState.courseSummaryError = ''
  summaryState.courseConceptsError = ''
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
  summaryState.error = ''
  summaryState.chapterError = ''
  summaryState.courseSummaryError = ''
  summaryState.courseConceptsError = ''
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
 * Checks if the API key for the selected provider is configured.
 * @param {object} userSettings - The current settings object.
 * @param {string} selectedProviderId - The ID of the selected provider.
 * @throws {Error} If the API key is not configured.
 */
function checkApiKeyConfiguration(userSettings, selectedProviderId) {
  let apiKey
  if (selectedProviderId === 'ollama') {
    apiKey = userSettings.ollamaEndpoint
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'Ollama Endpoint not configured in settings. Please add your Ollama Endpoint in the settings.'
      )
    }
    if (
      !userSettings.selectedOllamaModel ||
      userSettings.selectedOllamaModel.trim() === ''
    ) {
      throw new Error(
        'Ollama Model not configured in settings. Please select an Ollama Model in the settings.'
      )
    }
  } else if (selectedProviderId === 'gemini') {
    apiKey = userSettings.isAdvancedMode
      ? userSettings.geminiAdvancedApiKey
      : userSettings.geminiApiKey
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'Gemini API Key not configured in settings. Please add your API Key in the settings.'
      )
    }
  } else {
    // For other providers that use API keys
    apiKey = userSettings[`${selectedProviderId}ApiKey`]
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        `${selectedProviderId} API Key not configured in settings. Please add your API Key in the settings.`
      )
    }
  }
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

    // Check API key configuration
    checkApiKeyConfiguration(userSettings, selectedProviderId)

    console.log('[summaryStore] Checking tab type...')
    const tabInfo = await getActiveTabInfo()
    if (!tabInfo || !tabInfo.url) {
      throw new Error(
        'Could not get current tab information or URL. Please try switching to a different tab and back, or ing the extension. if this error persists, please clear your cookie.'
      )
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

    if (mainContentResult.type === 'error' || !mainContentResult.content) {
      throw new Error(
        'Could not get main page content. Please try refreshing the page or reopening the extension. If the error persists, please clear your browser cookies and site data for this site.'
      )
    }

    summaryState.currentContentSource = mainContentResult.content

    if (summaryState.isYouTubeVideoActive) {
      console.log(
        '[summaryStore] Starting to fetch timestamped transcript for chapters and video summary...'
      )
      const chapterPromise = (async () => {
        summaryState.chapterError = ''
        try {
          const chapterContentResult = await getPageContent(
            'timestampedTranscript',
            userSettings.summaryLang
          )
          if (
            chapterContentResult.type === 'error' ||
            !chapterContentResult.content
          ) {
            throw new Error(
              'Could not get timestamped transcript for chapters. Please try refreshing the page or reopening the extension. If the error persists, please clear your YouTube cookies and site data.'
            )
          }
          console.log(
            '[summaryStore] Fetched timestamped transcript, starting chapter summarization...'
          )

          const chapterSummarizedText = await summarizeChapters(
            chapterContentResult.content
          )

          if (!chapterSummarizedText || chapterSummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini returned empty result for chapter summary.'
            )
            summaryState.chapterSummary =
              '<p><i>Could not generate chapter summary from this content.</i></p>'
          } else {
            summaryState.chapterSummary = chapterSummarizedText
          }
          console.log('[summaryStore] Chapter summary processed.')
        } catch (e) {
          console.error('[summaryStore] Chapter summarization error:', e)
          summaryState.chapterError = e.message
        } finally {
          summaryState.isChapterLoading = false
        }
      })()

      const videoSummaryPromise = (async () => {
        summaryState.error = ''
        try {
          const videoSummarizedText = await summarizeContent(
            summaryState.currentContentSource,
            'youtube'
          )

          if (!videoSummarizedText || videoSummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini returned empty result for YouTube video summary.'
            )
            summaryState.summary =
              '<p><i>Could not generate YouTube video summary from this content.</i></p>'
          } else {
            summaryState.summary = videoSummarizedText
          }
          console.log('[summaryStore] YouTube video summary processed.')
        } catch (e) {
          console.error('[summaryStore] YouTube video summarization error:', e)
          summaryState.error = e.message
        } finally {
          summaryState.isLoading = false
        }
      })()
      await Promise.all([chapterPromise, videoSummaryPromise])
    } else if (summaryState.isCourseVideoActive) {
      console.log(
        '[summaryStore] Starting Course summary and concept explanation...'
      )

      const courseSummaryPromise = (async () => {
        summaryState.courseSummaryError = ''
        try {
          const courseSummarizedText = await summarizeContent(
            summaryState.currentContentSource,
            'courseSummary'
          )

          if (!courseSummarizedText || courseSummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini returned empty result for Course summary.'
            )
            summaryState.courseSummary =
              '<p><i>Could not generate Course lecture summary from this content.</i></p>'
          } else {
            summaryState.courseSummary = courseSummarizedText
          }
          console.log('[summaryStore] Course summary processed.')
        } catch (e) {
          console.error('[summaryStore] Course summarization error:', e)
          summaryState.courseSummaryError = e.message
        } finally {
          summaryState.isCourseSummaryLoading = false
        }
      })()

      const courseConceptsPromise = (async () => {
        summaryState.courseConceptsError = ''
        try {
          const courseConceptsText = await summarizeContent(
            summaryState.currentContentSource,
            'courseConcepts'
          )

          if (!courseConceptsText || courseConceptsText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini returned empty result for Course concept explanation.'
            )
            summaryState.courseConcepts =
              '<p><i>Could not explain terms from this content.</i></p>'
          } else {
            summaryState.courseConcepts = courseConceptsText
          }
          console.log('[summaryStore] Course concept explanation processed.')
        } catch (e) {
          console.error('[summaryStore] Course concept explanation error:', e)
          summaryState.courseConceptsError = e.message
        } finally {
          summaryState.isCourseConceptsLoading = false
        }
      })()

      await Promise.allSettled([courseSummaryPromise, courseConceptsPromise])
    } else {
      // For general webpages, this is the primary summarization.
      console.log(
        '[summaryStore] Starting main summarization for general webpage...'
      )
      const summarizedText = await summarizeContent(
        summaryState.currentContentSource,
        summaryType
      )

      if (!summarizedText || summarizedText.trim() === '') {
        console.warn(
          '[summaryStore] Gemini returned empty result for main summary.'
        )
        summaryState.summary =
          '<p><i>Could not generate summary from this content.</i></p>'
      } else {
        summaryState.summary = summarizedText
      }
    }
  } catch (e) {
    console.error('[summaryStore] Error during main summarization process:', e)
    summaryState.error = e.message
    summaryState.lastSummaryTypeDisplayed = 'web'
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
    let selectedProviderId = userSettings.selectedProvider || 'gemini'
    if (!userSettings.isAdvancedMode) {
      selectedProviderId = 'gemini'
    }
    checkApiKeyConfiguration(userSettings, selectedProviderId)

    const tabInfo = await getActiveTabInfo()
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
    if (mainContentResult.type === 'error' || !mainContentResult.content) {
      throw new Error('Could not get main page content.')
    }
    summaryState.currentContentSource = mainContentResult.content

    const promises = []

    if (summaryState.isYouTubeVideoActive) {
      summaryState.isChapterLoading = true
      const chapterStreamPromise = (async () => {
        try {
          const chapterContentResult = await getPageContent(
            'timestampedTranscript',
            userSettings.summaryLang
          )
          if (
            chapterContentResult.type === 'error' ||
            !chapterContentResult.content
          ) {
            throw new Error(
              'Could not get timestamped transcript for chapters.'
            )
          }
          const chapterStream = summarizeChaptersStream(
            chapterContentResult.content
          )
          for await (const chunk of chapterStream) {
            summaryState.chapterSummary += chunk
          }
        } catch (e) {
          summaryState.chapterError = e.message
        } finally {
          summaryState.isChapterLoading = false
        }
      })()
      promises.push(chapterStreamPromise)

      const videoSummaryStream = summarizeContentStream(
        summaryState.currentContentSource,
        'youtube'
      )
      for await (const chunk of videoSummaryStream) {
        summaryState.summary += chunk
      }
    } else if (summaryState.isCourseVideoActive) {
      summaryState.isCourseSummaryLoading = true
      summaryState.isCourseConceptsLoading = true

      const courseSummaryStream = summarizeContentStream(
        summaryState.currentContentSource,
        'courseSummary'
      )
      const courseSummaryPromise = (async () => {
        try {
          for await (const chunk of courseSummaryStream) {
            summaryState.courseSummary += chunk
          }
        } catch (e) {
          summaryState.courseSummaryError = e.message
        } finally {
          summaryState.isCourseSummaryLoading = false
        }
      })()
      promises.push(courseSummaryPromise)

      const courseConceptsStream = summarizeContentStream(
        summaryState.currentContentSource,
        'courseConcepts'
      )
      const courseConceptsPromise = (async () => {
        try {
          for await (const chunk of courseConceptsStream) {
            summaryState.courseConcepts += chunk
          }
        } catch (e) {
          summaryState.courseConceptsError = e.message
        } finally {
          summaryState.isCourseConceptsLoading = false
        }
      })()
      promises.push(courseConceptsPromise)
    } else {
      const webSummaryStream = summarizeContentStream(
        summaryState.currentContentSource,
        'general'
      )
      for await (const chunk of webSummaryStream) {
        summaryState.summary += chunk
      }
    }

    await Promise.all(promises)
  } catch (e) {
    summaryState.error = e.message
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
    console.warn(
      '[summaryStore] Existing summarization in progress. Resetting and starting new selected text summarization.'
    )
    resetState()
  }

  // Wait for settings to be initialized
  await loadSettings()

  const userSettings = settings

  resetDisplayState()
  summaryState.selectedTextSummary = ''
  summaryState.selectedTextError = ''
  summaryState.lastSummaryTypeDisplayed = 'selectedText'

  try {
    summaryState.isSelectedTextLoading = true

    // Get current tab info for title and URL
    const tabInfo = await getActiveTabInfo()
    summaryState.pageTitle = tabInfo.title || 'Selected Text Summary'
    summaryState.pageUrl = tabInfo.url || 'Unknown URL'

    // Determine the actual provider to use based on isAdvancedMode
    let selectedProviderId = userSettings.selectedProvider || 'gemini'
    if (!userSettings.isAdvancedMode) {
      selectedProviderId = 'gemini' // Force Gemini in basic mode
    }

    // Check API key configuration
    checkApiKeyConfiguration(userSettings, selectedProviderId)

    if (!text || text.trim() === '') {
      throw new Error('No text selected for summarization.')
    }

    console.log('[summaryStore] Starting selected text summarization...')
    const summarizedText = await summarizeContent(text, 'selectedText')

    if (!summarizedText || summarizedText.trim() === '') {
      console.warn(
        '[summaryStore] Gemini returned empty result for selected text summary.'
      )
      summaryState.selectedTextSummary =
        '<p><i>Could not generate summary from this selected text.</i></p>'
    } else {
      summaryState.selectedTextSummary = summarizedText
    }
    console.log('[summaryStore] Selected text summary processed.')
  } catch (e) {
    console.error('[summaryStore] Selected text summarization error:', e)
    summaryState.selectedTextError = e.message
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
    await setStorage({ data_updated_at: new Date().getTime() })
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
    await setStorage({ data_updated_at: new Date().getTime() })
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
