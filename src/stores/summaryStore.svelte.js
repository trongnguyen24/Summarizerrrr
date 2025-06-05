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
  isLoading: false,
  isChapterLoading: false,
  error: '',
  chapterError: '',
  isYouTubeVideoActive: false,
  currentContentSource: '',
  selectedTextSummary: '',
  isSelectedTextLoading: false,
  selectedTextError: '',
  lastSummaryTypeDisplayed: null,
  activeYouTubeTab: 'videoSummary',
})

// --- Actions ---

/**
 * Reset all summary-related states.
 */
export function resetState() {
  summaryState.summary = ''
  summaryState.chapterSummary = ''
  summaryState.selectedTextSummary = ''
  summaryState.isLoading = false
  summaryState.isChapterLoading = false
  summaryState.isSelectedTextLoading = false
  summaryState.error = ''
  summaryState.chapterError = ''
  summaryState.selectedTextError = ''
  summaryState.isYouTubeVideoActive = false
  summaryState.currentContentSource = ''
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
}

/**
 * Resets only the display-related states, clearing current summaries.
 */
export function resetDisplayState() {
  summaryState.summary = ''
  summaryState.chapterSummary = ''
  summaryState.selectedTextSummary = ''
  summaryState.error = ''
  summaryState.chapterError = ''
  summaryState.selectedTextError = ''
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
}

/**
 * Updates the isYouTubeVideoActive state.
 * @param {boolean} isYouTube - Whether the current tab is a YouTube video.
 */
export function updateIsYouTubeVideoActive(isYouTube) {
  summaryState.isYouTubeVideoActive = isYouTube
  console.log(`[summaryStore] isYouTubeVideoActive updated to: ${isYouTube}`)
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
    // Sử dụng getIsInitialized()
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (getIsInitialized()) {
          // Sử dụng getIsInitialized()
          clearInterval(checkInterval)
          resolve()
        }
      }, 100) // Check every 100ms
    })
    console.log('[summaryStore] Cài đặt đã sẵn sàng.')
  }

  const userSettings = settings // Sử dụng settings trực tiếp

  resetState() // Reset state before starting
  summaryState.isLoading = true // Start main loading

  try {
    // 1. Get API Key first
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

    // 2. Xác định loại tab trước khi lấy nội dung
    console.log('[summaryStore] Đang kiểm tra loại tab...')
    const tabInfo = await getActiveTabInfo() // Lấy thông tin tab hiện tại bằng getActiveTabInfo
    if (!tabInfo || !tabInfo.url) {
      throw new Error(
        'Could not get current tab information or URL. Please try switching to a different tab and back, or ing the extension. if this error persists, please clear your cookie.'
      )
    }
    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i // Định nghĩa lại pattern nếu cần, hoặc import từ contentService
    summaryState.isYouTubeVideoActive = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
    console.log(
      `[summaryStore] Tab hiện tại là: ${tabInfo.url}. YouTube video: ${summaryState.isYouTubeVideoActive}`
    )

    // 3. Quyết định loại nội dung cần lấy cho tóm tắt chính
    let mainContentTypeToFetch = 'webpageText' // Mặc định là web
    if (summaryState.isYouTubeVideoActive) {
      mainContentTypeToFetch = 'transcript' // Nếu là YouTube, lấy transcript thường
    }
    console.log(
      `[summaryStore] Sẽ lấy loại nội dung chính: ${mainContentTypeToFetch}`
    )

    // 4. Get Page Content cho tóm tắt chính
    const mainContentResult = await getPageContent(
      mainContentTypeToFetch,
      userSettings.summaryLang
    )

    if (mainContentResult.type === 'error' || !mainContentResult.content) {
      throw new Error(
        'Could not get main page content. Please try refreshing the page or reopening the extension. If the error persists, please clear your YouTube cookies and site data.'
      )
    }

    summaryState.currentContentSource = mainContentResult.content // Store the fetched content

    // --- Start Chapter Summarization in Parallel (if YouTube) ---
    if (summaryState.isYouTubeVideoActive) {
      summaryState.isChapterLoading = true // Start chapter loading
      console.log(
        '[summaryStore] Bắt đầu lấy transcript có timestamp cho chapters...'
      )
      // Use IIAFE for parallel execution without awaiting here
      ;(async () => {
        summaryState.chapterError = '' // Reset chapter error specifically
        try {
          // Fetch timestamped transcript specifically for chapters
          // Luôn yêu cầu 'timestampedTranscript' cho phần này
          const chapterContentResult = await getPageContent(
            'timestampedTranscript',
            userSettings.summaryLang
          )
          if (
            chapterContentResult.type === 'error' ||
            !chapterContentResult.content
          ) {
            throw new Error(
              'Could not get main page content. Please try refreshing the page or reopening the extension. If the error persists, please clear your YouTube cookies and site data.'
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
          summaryState.isChapterLoading = false // End chapter loading regardless of outcome
        }
      })()
    } else {
      // Nếu không phải YouTube, đảm bảo không có trạng thái loading chapter
      summaryState.isChapterLoading = false
      summaryState.chapterSummary = ''
      summaryState.chapterError = ''
    }

    // --- Continue Main Summarization (Awaited) ---
    console.log('[summaryStore] Bắt đầu tóm tắt chính...')
    const summarizedText = await summarizeContent(
      summaryState.currentContentSource, // Use the stored content
      summaryState.isYouTubeVideoActive ? 'youtube' : 'general' // Pass string literal based on type
    )

    if (!summarizedText || summarizedText.trim() === '') {
      console.warn(
        '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt chính.'
      )
      summaryState.summary =
        '<p><i>Không thể tạo tóm tắt từ nội dung này.</i></p>'
    } else {
      summaryState.summary = marked.parse(summarizedText)
      summaryState.lastSummaryTypeDisplayed = summaryState.isYouTubeVideoActive
        ? 'youtube'
        : 'web' // Cập nhật loại tóm tắt đã hiển thị
    }
    console.log('[summaryStore] Đã xử lý tóm tắt chính.')
  } catch (e) {
    console.error('[summaryStore] Lỗi trong quá trình tóm tắt chính:', e)
    summaryState.error =
      e.message || 'An unexpected error occurred. Please try again later.'
    // Ensure chapter loading stops if main process fails early
    // if (isChapterLoading && !chapterError) { // Let the parallel process handle its own loading state
    // }
  } finally {
    summaryState.isLoading = false // End main loading
    // Không cần đặt isChapterLoading = false ở đây nữa vì nó được xử lý trong khối if/else và IIAFE
  }
}

/**
 * Summarizes selected text.
 * @param {string} text - The selected text to summarize.
 */
export async function summarizeSelectedText(text) {
  // Nếu có quá trình tóm tắt đang diễn ra, reset trạng thái và bắt đầu quá trình mới
  if (
    summaryState.isSelectedTextLoading ||
    summaryState.isLoading ||
    summaryState.isChapterLoading
  ) {
    console.warn(
      '[summaryStore] Existing summarization in progress. Resetting and starting new selected text summarization.'
    )
    resetState() // Reset state before starting a new selected text summarization
  }

  if (!getIsInitialized()) {
    // Sử dụng getIsInitialized()
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (getIsInitialized()) {
          // Sử dụng getIsInitialized()
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
    console.log(
      '[summaryStore] Cài đặt đã sẵn sàng cho tóm tắt văn bản được chọn.'
    )
  }

  const userSettings = settings // Sử dụng settings trực tiếp

  summaryState.selectedTextSummary = '' // Reset previous selected text summary
  summaryState.selectedTextError = '' // Reset previous error
  summaryState.isSelectedTextLoading = true // Start loading for selected text
  summaryState.lastSummaryTypeDisplayed = 'selectedText' // Ensure selected text display is active immediately

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
    const summarizedText = await summarizeContent(
      text,
      'selectedText' // Pass type as 'selectedText'
    )

    if (!summarizedText || summarizedText.trim() === '') {
      console.warn(
        '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt văn bản được chọn.'
      )
      summaryState.selectedTextSummary =
        '<p><i>Không thể tạo tóm tắt từ văn bản được chọn này.</i></p>'
    } else {
      summaryState.selectedTextSummary = marked.parse(summarizedText)
      // summaryState.lastSummaryTypeDisplayed = 'selectedText' // Đã di chuyển lên trên
    }
    console.log('[summaryStore] Đã xử lý tóm tắt văn bản được chọn.')
  } catch (e) {
    console.error('[summaryStore] Lỗi tóm tắt văn bản được chọn:', e)
    summaryState.selectedTextError =
      e.message ||
      'An unexpected error occurred during selected text summarization. Please try again later.'
  } finally {
    summaryState.isSelectedTextLoading = false // End loading
  }
}

// Các hàm updateSummary và updateError không còn cần thiết nếu các component trực tiếp cập nhật summaryState.summary và summaryState.error
// export function updateSummary(value) { summaryState.summary = value; }
// export function updateError(value) { summaryState.error = value; }
