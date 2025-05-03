// @svelte-compiler-ignore
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

// --- Actions ---

/**
 * Reset all summary-related states.
 */
function resetState() {
  summary = ''
  chapterSummary = ''
  isLoading = false
  isChapterLoading = false
  error = ''
  chapterError = ''
  isYouTubeVideoActive = false
  currentContentSource = ''
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
      throw new Error('Chưa cấu hình API Key trong cài đặt.')
    }

    // 2. Xác định loại tab trước khi lấy nội dung
    console.log('[summaryStore] Đang kiểm tra loại tab...')
    const tabInfo = await getActiveTabInfo() // Lấy thông tin tab hiện tại bằng getActiveTabInfo
    if (!tabInfo || !tabInfo.url) {
      throw new Error('Không thể lấy thông tin tab hiện tại hoặc URL.')
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
        mainContentResult.error || 'Không thể lấy nội dung trang chính.'
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
              chapterContentResult.error ||
                'Không thể lấy transcript có timestamp cho chapter.'
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
          chapterError = e.message || 'Lỗi không mong muốn khi tóm tắt chapter.'
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
      isYouTubeVideoActive, // Pass boolean flag
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
    }
    console.log('[summaryStore] Đã xử lý tóm tắt chính.')
  } catch (e) {
    console.error('[summaryStore] Lỗi trong quá trình tóm tắt chính:', e)
    error = e.message || 'Đã xảy ra lỗi không mong muốn.'
    // Ensure chapter loading stops if main process fails early
    // if (isChapterLoading && !chapterError) { // Let the parallel process handle its own loading state
    // }
  } finally {
    isLoading = false // End main loading
    // Không cần đặt isChapterLoading = false ở đây nữa vì nó được xử lý trong khối if/else và IIAFE
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
  get isLoading() {
    return isLoading
  },
  get isChapterLoading() {
    return isChapterLoading
  },
  get error() {
    return error
  },
  get chapterError() {
    return chapterError
  },
  get isYouTubeVideoActive() {
    return isYouTubeVideoActive
  },
  get currentContentSource() {
    return currentContentSource
  },
  fetchAndSummarize, // Also export the action
  updateIsYouTubeVideoActive, // Export the update function
}

console.log('summaryStore.svelte.js loaded')
