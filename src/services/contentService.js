// @ts-nocheck
import { browser } from 'wxt/browser'
import { ErrorHandler } from '../lib/error/errorHandler.js'
import { ErrorTypes } from '../lib/error/errorTypes.js'

const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
const COURSE_MATCH_PATTERN =
  /(udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\/.*\/lecture\/|coursera\.org\/learn\/.*\/supplement\/)/i

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
      const pageText = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: getWebpageText,
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
      const action =
        contentType === 'timestampedTranscript'
          ? 'fetchTranscriptWithTimestamp'
          : 'fetchTranscript'
      const response = await browser.tabs.sendMessage(tab.id, {
        action,
        lang: preferredLang,
      })
      if (response?.success && response.transcript) {
        return { type: 'youtube', content: response.transcript }
      }
      throw new Error(
        response?.error ||
          `Failed to get ${contentType} from YouTube content script.`
      )
    }

    if (isCourseVideo && contentType === 'transcript') {
      const response = await browser.tabs.sendMessage(tab.id, {
        action: 'fetchCourseContent',
        lang: preferredLang,
      })
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
      error.type = ErrorTypes.CONTENT // Assign a specific type for better classification
      throw error
    }

    throw new Error('Unhandled case in getPageContent logic.')
  } catch (error) {
    console.error('[contentService] Error:', error)
    // Pass the error to the centralized handler
    throw ErrorHandler.handle(error, {
      source: 'contentService',
      contentType,
      preferredLang,
    })
  }
}
