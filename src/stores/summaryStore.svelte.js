// @ts-nocheck
// @svelte-compiler-ignore
import { marked } from 'marked'
import { getPageContent } from '../services/contentService.js'
import { getActiveTabInfo } from '../services/chromeService.js' // Import getActiveTabInfo
import { settingsStore } from './settingsStore.svelte.js' // Import the settingsStore object
import { summarizeWithGemini, summarizeChaptersWithGemini } from '../lib/api.js' // Assuming api.js is updated or compatible

// Access state from the imported object
const { settings: appSettings, isInitialized: settingsInitialized } =
  settingsStore

// --- State ---
let summary = $state('')
let chapterSummary = $state('')
let isLoading = $state(false) // Loading state for the main summary
let isChapterLoading = $state(false) // Loading state for chapters
let error = $state('') // Error for the main summary
let chapterError = $state('') // Error for chapters
let isYouTubeVideoActive = $state(false) // Is the current tab a YouTube video?
let currentContentSource = $state('') // Store the source text for potential re-summarization
let selectedTextSummary = $state('') // Summary for selected text
let isSelectedTextLoading = $state(false) // Loading state for selected text summary
let selectedTextError = $state('') // Error for selected text summary
let lastSummaryTypeDisplayed = $state(null) // Stores the type of the last summary displayed ('web', 'youtube', 'selectedText')
let activeYouTubeTab = $state('videoSummary') // Mặc định là tóm tắt video

// --- Actions ---

/**
 * Reset all summary-related states.
 */
function resetState() {
  summary = ''
  chapterSummary = ''
  selectedTextSummary = ''
  isLoading = false
  isChapterLoading = false
  isSelectedTextLoading = false
  error = ''
  chapterError = ''
  selectedTextError = ''
  isYouTubeVideoActive = false
  currentContentSource = ''
  lastSummaryTypeDisplayed = null // Reset this as well
  activeYouTubeTab = 'videoSummary' // Reset YouTube tab to default
}

/**
 * Resets only the display-related states, clearing current summaries.
 */
function resetDisplayState() {
  summary = ''
  chapterSummary = ''
  selectedTextSummary = ''
  error = ''
  chapterError = ''
  selectedTextError = ''
  lastSummaryTypeDisplayed = null
  activeYouTubeTab = 'videoSummary' // Reset YouTube tab to default
  // Keep isLoading, isChapterLoading, isSelectedTextLoading as false if not actively summarizing
  // Keep isYouTubeVideoActive and currentContentSource as they reflect the current tab's info
}

/**
 * Updates the isYouTubeVideoActive state.
 * @param {boolean} isYouTube - Whether the current tab is a YouTube video.
 */
function updateIsYouTubeVideoActive(isYouTube) {
  isYouTubeVideoActive = isYouTube
  console.log(`[summaryStore] isYouTubeVideoActive updated to: ${isYouTube}`)
}

/**
 * Updates the active YouTube tab state.
 * @param {string} tabName - The ID of the active YouTube tab ('videoSummary' or 'chapterSummary').
 */
function updateActiveYouTubeTab(tabName) {
  activeYouTubeTab = tabName
  console.log(`[summaryStore] activeYouTubeTab updated to: ${tabName}`)
}

/**
 * Fetches content from the current tab and triggers the summarization process.
 */
export async function fetchAndSummarize() {
  if (isLoading || isChapterLoading) {
    console.warn('[summaryStore] Summarization already in progress.')
    return
  }

  // Wait for settings to be initialized
  if (!settingsStore.isInitialized) {
    console.log('[summaryStore] Chờ cài đặt được tải...')
    // Simple polling mechanism - can be improved with a Promise/event if needed
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (settingsStore.isInitialized) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100) // Check every 100ms
    })
    console.log('[summaryStore] Cài đặt đã sẵn sàng.')
  }

  // Now settings are guaranteed to be initialized
  const { settings: appSettings } = settingsStore // Destructure settings after initialization check

  resetState() // Reset state before starting
  isLoading = true // Start main loading

  try {
    // 1. Get API Key first
    const apiKey = appSettings.geminiApiKey // Use state from settingsStore
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
    isYouTubeVideoActive = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
    console.log(
      `[summaryStore] Tab hiện tại là: ${tabInfo.url}. YouTube video: ${isYouTubeVideoActive}`
    )

    // 3. Quyết định loại nội dung cần lấy cho tóm tắt chính
    let mainContentTypeToFetch = 'webpageText' // Mặc định là web
    if (isYouTubeVideoActive) {
      mainContentTypeToFetch = 'transcript' // Nếu là YouTube, lấy transcript thường
    }
    console.log(
      `[summaryStore] Sẽ lấy loại nội dung chính: ${mainContentTypeToFetch}`
    )

    // 4. Get Page Content cho tóm tắt chính
    const mainContentResult = await getPageContent(
      mainContentTypeToFetch,
      appSettings.summaryLang
    )

    if (mainContentResult.type === 'error' || !mainContentResult.content) {
      throw new Error(
        'Could not get main page content. Please try refreshing the page or reopening the extension. If the error persists, please clear your YouTube cookies and site data.'
      )
    }

    currentContentSource = mainContentResult.content // Store the fetched content

    // --- Start Chapter Summarization in Parallel (if YouTube) ---
    if (isYouTubeVideoActive) {
      isChapterLoading = true // Start chapter loading
      console.log(
        '[summaryStore] Bắt đầu lấy transcript có timestamp cho chapters...'
      )
      // Use IIAFE for parallel execution without awaiting here
      ;(async () => {
        chapterError = '' // Reset chapter error specifically
        try {
          // Fetch timestamped transcript specifically for chapters
          // Luôn yêu cầu 'timestampedTranscript' cho phần này
          const chapterContentResult = await getPageContent(
            'timestampedTranscript',
            appSettings.summaryLang
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

          const chapterSummarizedText = await summarizeChaptersWithGemini(
            chapterContentResult.content,
            apiKey,
            appSettings.summaryLang,
            appSettings.summaryLength
          )

          if (!chapterSummarizedText || chapterSummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt chapter.'
            )
            chapterSummary =
              '<p><i>Không thể tạo tóm tắt chapter từ nội dung này.</i></p>'
          } else {
            chapterSummary = marked.parse(chapterSummarizedText)
          }
          console.log('[summaryStore] Đã xử lý tóm tắt chapter.')
        } catch (e) {
          console.error('[summaryStore] Lỗi tóm tắt chapter:', e)
          chapterError =
            e.message ||
            'Unexpected error when summarizing chapters. Please try again later.'
        } finally {
          isChapterLoading = false // End chapter loading regardless of outcome
        }
      })()
    } else {
      // Nếu không phải YouTube, đảm bảo không có trạng thái loading chapter
      isChapterLoading = false
      chapterSummary = ''
      chapterError = ''
    }

    // --- Continue Main Summarization (Awaited) ---
    console.log('[summaryStore] Bắt đầu tóm tắt chính...')
    const summarizedText = await summarizeWithGemini(
      currentContentSource, // Use the stored content
      apiKey,
      isYouTubeVideoActive ? 'youtube' : 'general', // Pass string literal based on type
      appSettings.summaryLang, // Pass language
      appSettings.summaryLength, // Pass length
      appSettings.summaryFormat // Pass format
    )

    if (!summarizedText || summarizedText.trim() === '') {
      console.warn(
        '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt chính.'
      )
      summary = '<p><i>Không thể tạo tóm tắt từ nội dung này.</i></p>'
    } else {
      summary = marked.parse(summarizedText)
      lastSummaryTypeDisplayed = isYouTubeVideoActive ? 'youtube' : 'web' // Cập nhật loại tóm tắt đã hiển thị
    }
    console.log('[summaryStore] Đã xử lý tóm tắt chính.')
  } catch (e) {
    console.error('[summaryStore] Lỗi trong quá trình tóm tắt chính:', e)
    error = e.message || 'An unexpected error occurred. Please try again later.'
    // Ensure chapter loading stops if main process fails early
    // if (isChapterLoading && !chapterError) { // Let the parallel process handle its own loading state
    // }
  } finally {
    isLoading = false // End main loading
    // Không cần đặt isChapterLoading = false ở đây nữa vì nó được xử lý trong khối if/else và IIAFE
  }
}

/**
 * Summarizes selected text.
 * @param {string} text - The selected text to summarize.
 */
export async function summarizeSelectedText(text) {
  if (isSelectedTextLoading || isLoading || isChapterLoading) {
    console.warn(
      '[summaryStore] Selected text summarization already in progress or other summarization is active.'
    )
    return
  }

  if (!settingsStore.isInitialized) {
    console.log(
      '[summaryStore] Chờ cài đặt được tải cho tóm tắt văn bản được chọn...'
    )
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (settingsStore.isInitialized) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
    console.log(
      '[summaryStore] Cài đặt đã sẵn sàng cho tóm tắt văn bản được chọn.'
    )
  }

  const { settings: appSettings } = settingsStore

  selectedTextSummary = '' // Reset previous selected text summary
  selectedTextError = '' // Reset previous error
  isSelectedTextLoading = true // Start loading for selected text

  try {
    const apiKey = appSettings.geminiApiKey
    if (!apiKey) {
      throw new Error(
        'API Key not configured in settings. Please add your API Key in the settings.'
      )
    }

    if (!text || text.trim() === '') {
      throw new Error('No text selected for summarization.')
    }

    console.log('[summaryStore] Bắt đầu tóm tắt văn bản được chọn...')
    const summarizedText = await summarizeWithGemini(
      text,
      apiKey,
      'selectedText', // Pass type as 'selectedText'
      appSettings.summaryLang,
      appSettings.summaryLength,
      appSettings.summaryFormat
    )

    if (!summarizedText || summarizedText.trim() === '') {
      console.warn(
        '[summaryStore] Gemini trả về kết quả rỗng cho tóm tắt văn bản được chọn.'
      )
      selectedTextSummary =
        '<p><i>Không thể tạo tóm tắt từ văn bản được chọn này.</i></p>'
    } else {
      selectedTextSummary = marked.parse(summarizedText)
      lastSummaryTypeDisplayed = 'selectedText' // Cập nhật loại tóm tắt đã hiển thị
    }
    console.log('[summaryStore] Đã xử lý tóm tắt văn bản được chọn.')
  } catch (e) {
    console.error('[summaryStore] Lỗi tóm tắt văn bản được chọn:', e)
    selectedTextError =
      e.message ||
      'An unexpected error occurred during selected text summarization. Please try again later.'
  } finally {
    isSelectedTextLoading = false // End loading
  }
}

// --- Exported State ---
// Export an object containing the state variables and actions
export const summaryStore = {
  get summary() {
    return summary
  },
  get chapterSummary() {
    return chapterSummary
  },
  get selectedTextSummary() {
    return selectedTextSummary
  },
  get isLoading() {
    return isLoading
  },
  get isChapterLoading() {
    return isChapterLoading
  },
  get isSelectedTextLoading() {
    return isSelectedTextLoading
  },
  get error() {
    return error
  },
  get chapterError() {
    return chapterError
  },
  get selectedTextError() {
    return selectedTextError
  },
  get isYouTubeVideoActive() {
    return isYouTubeVideoActive
  },
  get currentContentSource() {
    return currentContentSource
  },
  get lastSummaryTypeDisplayed() {
    return lastSummaryTypeDisplayed
  }, // Export the new state
  get activeYouTubeTab() {
    return activeYouTubeTab
  }, // Export the new state
  fetchAndSummarize, // Also export the action
  summarizeSelectedText, // Export the new action
  updateIsYouTubeVideoActive, // Export the update function
  updateActiveYouTubeTab, // Export the new update function
  resetDisplayState, // Export the new reset function
  // Add setters for state updates from outside
  updateSummary: (value) => {
    summary = value
  },
  updateError: (value) => {
    error = value
  },
}

console.log('summaryStore.svelte.js loaded')
