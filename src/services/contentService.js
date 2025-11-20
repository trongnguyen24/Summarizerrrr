// @ts-nocheck
import { browser } from 'wxt/browser'
import { handleError } from '../lib/error/simpleErrorHandler.js'

const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
const COURSE_MATCH_PATTERN =
  /(udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\/.*\/lecture\/|coursera\.org\/learn\/.*\/supplement\/)/i

/**
 * Send message with retry mechanism
 * REDUCED RETRIES: Now only 1 retry (down from 3) to avoid long waits
 * With auto-fallback for Gemini, we don't need many retries
 * @param {number} tabId - Tab ID to send message to
 * @param {object} message - Message object to send
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<any>} Response from content script
 */
async function sendMessageWithRetry(
  tabId,
  message,
  maxRetries = 1,
  retryDelay = 500
) {
  let lastError = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[contentService] Sending message (attempt ${attempt}/${maxRetries}):`,
        message.action
      )

      const response = await browser.tabs.sendMessage(tabId, message)

      if (response?.success) {
        console.log(
          `[contentService] Message successful on attempt ${attempt}:`,
          message.action
        )
        return response
      } else if (response?.error) {
        lastError = new Error(response.error)
        console.log(
          `[contentService] Message failed on attempt ${attempt}:`,
          response.error
        )
      }
    } catch (error) {
      lastError = error
      console.log(
        `[contentService] Message error on attempt ${attempt}:`,
        error.message
      )

      // If this is not the last attempt, wait before retrying
      if (attempt < maxRetries) {
        console.log(
          `[contentService] Waiting ${retryDelay}ms before retry ${
            attempt + 1
          }...`
        )
        await new Promise((resolve) => setTimeout(resolve, retryDelay))
        // Increase delay for next retry (exponential backoff)
        retryDelay *= 1.5
      }
    }
  }

  // All retries failed
  throw lastError || new Error('Failed to communicate with content script')
}

function getWebpageText() {
  const minLength = 50
  let content = document.body?.innerText?.trim()
  if (content && content.length >= minLength) {
    return content
  }
  console.log('innerText không đủ dài hoặc không có, thử textContent...')
  content = document.body?.textContent?.trim()
  if (content && content.length >= minLength) {
    return content
  }
  console.warn('Không thể lấy đủ nội dung text từ trang web.')
  return null
}

/**
 * Lấy nội dung từ tab hiện tại.
 * Tự động xác định là trang YouTube, khóa học hay trang web thường dựa trên URL.
 * @param {'transcript' | 'timestampedTranscript' | 'webpageText'} contentType Loại nội dung cần lấy.
 * @param {string} [preferredLang='en'] Ngôn ngữ ưu tiên cho transcript.
 * @returns {Promise<{ type: 'youtube' | 'course' | 'webpage', content: string }>}
 * Object chứa loại trang và nội dung. Throws a structured error on failure.
 */
export async function getPageContent(
  contentType = 'webpageText',
  preferredLang = 'en'
) {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tab || !tab.id || !tab.url) {
      throw new Error('Could not get active tab information.')
    }

    const isYouTubeVideo = YOUTUBE_MATCH_PATTERN.test(tab.url)
    const isCourseVideo = COURSE_MATCH_PATTERN.test(tab.url)
    let actualPageType = 'webpage'
    if (isYouTubeVideo) actualPageType = 'youtube'
    else if (isCourseVideo) actualPageType = 'course'

    console.log(
      `[contentService] Processing tab ${tab.id} (${tab.url}) as ${actualPageType} for ${contentType}`
    )

    if (contentType === 'webpageText') {
      // Try to get content via message first (if content script is loaded)
      try {
        const response = await browser.tabs.sendMessage(tab.id, {
          action: 'GET_PAGE_CONTENT',
        })
        if (response && response.success && response.content) {
          return { type: actualPageType, content: response.content }
        }
      } catch (e) {
        console.log(
          '[contentService] Message failed, falling back to executeScript:',
          e
        )
      }

      // Fallback to executeScript using static file to avoid CSP eval issues
      const pageText = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['extractor.js'],
        world: 'ISOLATED',
      })
      if (pageText && pageText[0] && pageText[0].result)
        return { type: actualPageType, content: pageText[0].result }
      if (pageText) return { type: actualPageType, content: pageText }
      throw new Error(
        'Failed to retrieve sufficient text content from the webpage.'
      )
    }

    if (
      isYouTubeVideo &&
      (contentType === 'transcript' || contentType === 'timestampedTranscript')
    ) {
      // Always use timestamped transcript for better AI understanding and accuracy
      const action = 'fetchTranscriptWithTimestamp'

      try {
        const response = await sendMessageWithRetry(
          tab.id,
          { action, lang: preferredLang },
          3,
          500
        )

        if (response?.success && response.transcript) {
          return { type: 'youtube', content: response.transcript }
        }
        throw new Error(
          response?.error ||
            `Failed to get ${contentType} from YouTube content script.`
        )
      } catch (error) {
        console.error('[contentService] YouTube transcript error:', error)
        throw new Error(
          `Failed to get transcript from YouTube. Please try refreshing the page.`
        )
      }
    }

    if (isCourseVideo && contentType === 'transcript') {
      try {
        const response = await sendMessageWithRetry(
          tab.id,
          { action: 'fetchCourseContent', lang: preferredLang },
          3,
          500
        )

        if (response?.success && (response.content || response.transcript)) {
          return {
            type: 'course',
            content: response.content || response.transcript,
          }
        }
        throw new Error(
          response?.error ||
            `Failed to get ${contentType} from Course content script.`
        )
      } catch (error) {
        console.error('[contentService] Course content error:', error)
        throw new Error(
          `Failed to get course content. Please try refreshing the page.`
        )
      }
    }

    // Handle cases where transcript is requested on a non-video page
    if (
      !isYouTubeVideo &&
      !isCourseVideo &&
      (contentType === 'transcript' || contentType === 'timestampedTranscript')
    ) {
      const error = new Error(
        `Cannot get ${contentType} from a non-video page.`
      )
      throw error
    }

    throw new Error('Unhandled case in getPageContent logic.')
  } catch (error) {
    console.error('[contentService] Error:', error)
    // Use simple error handler
    const handledError = handleError(error, {
      source: 'contentService',
      contentType,
      preferredLang,
    })
    throw handledError
  }
}
