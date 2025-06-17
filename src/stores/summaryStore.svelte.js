// @ts-nocheck
// @svelte-compiler-ignore
import { marked } from 'marked'
import { getPageContent } from '../services/contentService.js'
import { getActiveTabInfo } from '../services/chromeService.js'
import { settings, getIsInitialized } from './settingsStore.svelte.js' // Import settings và getIsInitialized
import { summarizeContent, summarizeChapters } from '../lib/api.js'

// --- State ---
export const summaryState = $state({
  summary: '',
  chapterSummary: '',
  udemySummary: '', // New: For Udemy video summary
  udemyConcepts: '', // New: For Udemy concepts explanation
  isLoading: false,
  isChapterLoading: false,
  isUdemySummaryLoading: false, // New: For Udemy video summary loading state
  isUdemyConceptsLoading: false, // New: For Udemy concepts loading state
  error: '',
  chapterError: '',
  udemySummaryError: '', // New: For Udemy summary error
  udemyConceptsError: '', // New: For Udemy concepts error
  isYouTubeVideoActive: false,
  isUdemyVideoActive: false, // New: For Udemy video active state
  currentContentSource: '',
  selectedTextSummary: '',
  isSelectedTextLoading: false,
  selectedTextError: '',
  lastSummaryTypeDisplayed: null,
  activeYouTubeTab: 'videoSummary',
  activeUdemyTab: 'udemySummary', // New: For active Udemy tab
})

// --- Actions ---

/**
 * Reset all summary-related states.
 */
export function resetState() {
  summaryState.summary = ''
  summaryState.chapterSummary = ''
  summaryState.udemySummary = ''
  summaryState.udemyConcepts = ''
  summaryState.selectedTextSummary = ''
  summaryState.isLoading = false
  summaryState.isChapterLoading = false
  summaryState.isUdemySummaryLoading = false
  summaryState.isUdemyConceptsLoading = false
  summaryState.isSelectedTextLoading = false
  summaryState.error = ''
  summaryState.chapterError = ''
  summaryState.udemySummaryError = ''
  summaryState.udemyConceptsError = ''
  summaryState.isYouTubeVideoActive = false
  summaryState.isUdemyVideoActive = false
  summaryState.currentContentSource = ''
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
  summaryState.activeUdemyTab = 'udemySummary'
}

/**
 * Resets only the display-related states, clearing current summaries.
 */
export function resetDisplayState() {
  summaryState.summary = ''
  summaryState.chapterSummary = ''
  summaryState.udemySummary = ''
  summaryState.udemyConcepts = ''
  summaryState.selectedTextSummary = ''
  summaryState.error = ''
  summaryState.chapterError = ''
  summaryState.udemySummaryError = ''
  summaryState.udemyConceptsError = ''
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
  summaryState.activeUdemyTab = 'udemySummary'
}

/**
 * Updates the video active states.
 * @param {boolean} isYouTube - Whether the current tab is a YouTube video.
 * @param {boolean} isUdemy - Whether the current tab is a Udemy video.
 */
export function updateVideoActiveStates(isYouTube, isUdemy) {
  summaryState.isYouTubeVideoActive = isYouTube
  summaryState.isUdemyVideoActive = isUdemy
  console.log(
    `[summaryStore] isYouTubeVideoActive updated to: ${isYouTube}, isUdemyVideoActive updated to: ${isUdemy}`
  )
}

/**
 * Updates the active YouTube tab state.
 * @param {string} tabName - The ID of the active YouTube tab ('videoSummary' or 'chapterSummary').
 */
export function updateActiveYouTubeTab(tabName) {
  summaryState.activeYouTubeTab = tabName
  console.log(`[summaryStore] activeYouTubeTab updated to: ${tabName}`)
}

/**
 * Updates the active Udemy tab state.
 * @param {string} tabName - The ID of the active Udemy tab ('udemySummary' or 'udemyConcepts').
 */
export function updateActiveUdemyTab(tabName) {
  summaryState.activeUdemyTab = tabName
  console.log(`[summaryStore] activeUdemyTab updated to: ${tabName}`)
}

/**
 * Fetches content from the current tab and triggers the summarization process.
 */
export async function fetchAndSummarize() {
  // Nếu có quá trình tóm tắt đang diễn ra, reset trạng thái và bắt đầu quá trình mới
  if (summaryState.isLoading || summaryState.isChapterLoading) {
    console.warn(
      '[summaryStore] Existing summarization in progress. Resetting and starting new.'
    )
    resetState() // Reset state before starting a new summarization
  }

  // Wait for settings to be initialized
  if (!getIsInitialized()) {
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (getIsInitialized()) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
    console.log('[summaryStore] Cài đặt đã sẵn sàng.')
  }

  const userSettings = settings

  // Reset state before starting, and immediately set loading states
  resetState()
  summaryState.isLoading = true
  summaryState.isChapterLoading = true
  summaryState.isUdemySummaryLoading = true // Set loading for Udemy summary
  summaryState.isUdemyConceptsLoading = true // Set loading for Udemy concepts

  try {
    let apiKey
    const selectedProviderId = userSettings.selectedProvider || 'gemini'
    if (selectedProviderId === 'gemini') {
      if (userSettings.isAdvancedMode) {
        apiKey = userSettings.geminiAdvancedApiKey
      } else {
        apiKey = userSettings.geminiApiKey
      }
    } else {
      apiKey = userSettings[`${selectedProviderId}ApiKey`]
    }

    if (!apiKey) {
      throw new Error(
        'API Key not configured in settings. Please add your API Key in the settings.'
      )
    }

    console.log('[summaryStore] Đang kiểm tra loại tab...')
    const tabInfo = await getActiveTabInfo()
    if (!tabInfo || !tabInfo.url) {
      throw new Error(
        'Could not get current tab information or URL. Please try switching to a different tab and back, or ing the extension. if this error persists, please clear your cookie.'
      )
    }
    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    const UDEMY_MATCH_PATTERN = /udemy\.com\/course\/.*\/learn\//i

    summaryState.isYouTubeVideoActive = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
    summaryState.isUdemyVideoActive = UDEMY_MATCH_PATTERN.test(tabInfo.url)

    console.log(
      `[summaryStore] Tab hiện tại là: ${tabInfo.url}. YouTube video: ${summaryState.isYouTubeVideoActive}. Udemy video: ${summaryState.isUdemyVideoActive}`
    )

    let mainContentTypeToFetch = 'webpageText'
    let summaryType = 'general'

    if (summaryState.isYouTubeVideoActive) {
      mainContentTypeToFetch = 'transcript'
      summaryType = 'youtube'
      summaryState.lastSummaryTypeDisplayed = 'youtube' // Set immediately
    } else if (summaryState.isUdemyVideoActive) {
      mainContentTypeToFetch = 'transcript'
      summaryType = 'udemySummary'
      summaryState.lastSummaryTypeDisplayed = 'udemy' // Set immediately
    } else {
      summaryState.lastSummaryTypeDisplayed = 'web' // Set immediately for general web
    }
    console.log(
      `[summaryStore] Sẽ lấy loại nội dung chính: ${mainContentTypeToFetch} cho loại tóm tắt: ${summaryType}`
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
        '[summaryStore] Bắt đầu lấy transcript có timestamp cho chapters và tóm tắt video...'
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
            '[summaryStore] Đã lấy transcript có timestamp, bắt đầu tóm tắt chapter...'
          )

          const chapterSummarizedText = await summarizeChapters(
            chapterContentResult.content
          )

          if (!chapterSummarizedText || chapterSummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt chapter.'
            )
            summaryState.chapterSummary =
              '<p><i>Không thể tạo tóm tắt chapter từ nội dung này.</i></p>'
          } else {
            summaryState.chapterSummary = marked.parse(chapterSummarizedText)
          }
          console.log('[summaryStore] Đã xử lý tóm tắt chapter.')
        } catch (e) {
          console.error('[summaryStore] Lỗi tóm tắt chapter:', e)
          summaryState.chapterError =
            e.message ||
            'Unexpected error when summarizing chapters. Please try again later.'
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
              '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt video YouTube.'
            )
            summaryState.summary =
              '<p><i>Không thể tạo tóm tắt video YouTube từ nội dung này.</i></p>'
          } else {
            summaryState.summary = marked.parse(videoSummarizedText)
          }
          console.log('[summaryStore] Đã xử lý tóm tắt video YouTube.')
        } catch (e) {
          console.error('[summaryStore] Lỗi tóm tắt video YouTube:', e)
          summaryState.error =
            e.message ||
            'Unexpected error when summarizing YouTube video. Please try again later.'
        } finally {
          summaryState.isLoading = false
        }
      })()
      await Promise.all([chapterPromise, videoSummaryPromise]) // Await both promises
    } else if (summaryState.isUdemyVideoActive) {
      console.log(
        '[summaryStore] Bắt đầu tóm tắt Udemy và giải thích khái niệm...'
      )

      const udemySummaryPromise = (async () => {
        summaryState.udemySummaryError = ''
        try {
          const udemySummarizedText = await summarizeContent(
            summaryState.currentContentSource,
            'udemySummary'
          )

          if (!udemySummarizedText || udemySummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt Udemy.'
            )
            summaryState.udemySummary =
              '<p><i>Không thể tạo tóm tắt bài giảng Udemy từ nội dung này.</i></p>'
          } else {
            summaryState.udemySummary = marked.parse(udemySummarizedText)
          }
          console.log('[summaryStore] Đã xử lý tóm tắt Udemy.')
        } catch (e) {
          console.error('[summaryStore] Lỗi tóm tắt Udemy:', e)
          summaryState.udemySummaryError =
            e.message ||
            'Unexpected error when summarizing Udemy video. Please try again later.'
        } finally {
          summaryState.isUdemySummaryLoading = false
        }
      })()

      const udemyConceptsPromise = (async () => {
        summaryState.udemyConceptsError = ''
        try {
          const udemyConceptsText = await summarizeContent(
            summaryState.currentContentSource,
            'udemyConcepts'
          )

          if (!udemyConceptsText || udemyConceptsText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini trả về kết quả rỗng cho giải thích khái niệm Udemy.'
            )
            summaryState.udemyConcepts =
              '<p><i>Không thể giải thích thuật ngữ từ nội dung này.</i></p>'
          } else {
            summaryState.udemyConcepts = marked.parse(udemyConceptsText)
          }
          console.log('[summaryStore] Đã xử lý giải thích khái niệm Udemy.')
        } catch (e) {
          console.error('[summaryStore] Lỗi giải thích khái niệm Udemy:', e)
          summaryState.udemyConceptsError =
            e.message ||
            'Unexpected error when explaining Udemy concepts. Please try again later.'
        } finally {
          summaryState.isUdemyConceptsLoading = false
        }
      })()

      await Promise.allSettled([udemySummaryPromise, udemyConceptsPromise]) // Await both promises independently
    } else {
      // For general webpages, this is the primary summarization.
      console.log('[summaryStore] Bắt đầu tóm tắt chính cho trang web chung...')
      const summarizedText = await summarizeContent(
        summaryState.currentContentSource,
        summaryType
      )

      if (!summarizedText || summarizedText.trim() === '') {
        console.warn(
          '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt chính.'
        )
        summaryState.summary =
          '<p><i>Không thể tạo tóm tắt từ nội dung này.</i></p>'
      } else {
        summaryState.summary = marked.parse(summarizedText)
      }
      // No need to set isLoading = false here, as it's handled by the finally block
    }
  } catch (e) {
    console.error('[summaryStore] Lỗi trong quá trình tóm tắt chính:', e)
    summaryState.error =
      e.message || 'An unexpected error occurred. Please try again later.'
  } finally {
    // Đảm bảo tất cả các trạng thái loading được đặt về false
    summaryState.isLoading = false
    summaryState.isChapterLoading = false
    summaryState.isUdemySummaryLoading = false
    summaryState.isUdemyConceptsLoading = false
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

  if (!getIsInitialized()) {
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (getIsInitialized()) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
    console.log(
      '[summaryStore] Cài đặt đã sẵn sàng cho tóm tắt văn bản được chọn.'
    )
  }

  const userSettings = settings

  resetDisplayState() // Reset display state before new summarization
  summaryState.selectedTextSummary = ''
  summaryState.selectedTextError = ''
  summaryState.isSelectedTextLoading = true
  summaryState.lastSummaryTypeDisplayed = 'selectedText' // Set immediately

  try {
    let apiKey
    const selectedProviderId = userSettings.selectedProvider || 'gemini'
    if (selectedProviderId === 'gemini') {
      if (userSettings.isAdvancedMode) {
        apiKey = userSettings.geminiAdvancedApiKey
      } else {
        apiKey = userSettings.geminiApiKey
      }
    } else {
      apiKey = userSettings[`${selectedProviderId}ApiKey`]
    }

    if (!apiKey) {
      throw new Error(
        'API Key not configured in settings. Please add your API Key in the settings.'
      )
    }

    if (!text || text.trim() === '') {
      throw new Error('No text selected for summarization.')
    }

    console.log('[summaryStore] Bắt đầu tóm tắt văn bản được chọn...')
    const summarizedText = await summarizeContent(text, 'selectedText')

    if (!summarizedText || summarizedText.trim() === '') {
      console.warn(
        '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt văn bản được chọn.'
      )
      summaryState.selectedTextSummary =
        '<p><i>Không thể tạo tóm tắt từ văn bản được chọn này.</i></p>'
    } else {
      summaryState.selectedTextSummary = marked.parse(summarizedText)
    }
    console.log('[summaryStore] Đã xử lý tóm tắt văn bản được chọn.')
  } catch (e) {
    console.error('[summaryStore] Lỗi tóm tắt văn bản được chọn:', e)
    summaryState.selectedTextError =
      e.message ||
      'An unexpected error occurred during selected text summarization. Please try again later.'
  } finally {
    summaryState.isSelectedTextLoading = false
  }
}

// Các hàm updateSummary và updateError không còn cần thiết nếu các component trực tiếp cập nhật summaryState.summary và summaryState.error
// export function updateSummary(value) { summaryState.summary = value; }
// export function updateError(value) { summaryState.error = value; }
