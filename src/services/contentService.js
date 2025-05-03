import {
  getActiveTabInfo,
  sendMessageToTab,
  executeFunction,
} from './chromeService.js'

const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i

/**
 * Lấy nội dung text từ body của trang web.
 * Thử lấy innerText trước, nếu không đủ dài thì fallback về textContent.
 * @returns {string | null} Nội dung text hoặc null nếu không lấy được.
 */
function getWebpageText() {
  // Hàm này sẽ được thực thi trong context của trang web bởi executeFunction
  const minLength = 50 // Độ dài tối thiểu để coi là nội dung hợp lệ
  let content = document.body?.innerText?.trim()

  if (content && content.length >= minLength) {
    return content
  }

  // Fallback to textContent if innerText is too short or unavailable
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
 * Tự động xác định là trang YouTube hay trang web thường dựa trên URL.
 * @param {'transcript' | 'timestampedTranscript' | 'webpageText'} contentType Loại nội dung cần lấy.
 *        'transcript': Chỉ lấy text transcript từ YouTube (nếu là trang YouTube).
 *        'timestampedTranscript': Lấy transcript kèm timestamp từ YouTube (nếu là trang YouTube).
 *        'webpageText': Lấy text từ body trang web (áp dụng cho mọi loại trang).
 * @param {string} [preferredLang='en'] Ngôn ngữ ưu tiên cho transcript YouTube.
 * @returns {Promise<{ type: 'youtube' | 'webpage' | 'error', content: string | null, error?: string }>}
 *          Object chứa loại trang (dựa trên URL), nội dung và lỗi (nếu có).
 *          Lưu ý: `type` trả về ('youtube' hoặc 'webpage') phản ánh loại trang thực tế, không phải `contentType` yêu cầu.
 */
export async function getPageContent(
  contentType = 'webpageText',
  preferredLang = 'en'
) {
  const tab = await getActiveTabInfo()
  if (!tab || !tab.id || !tab.url) {
    return {
      type: 'error',
      content: null,
      error: 'Không thể lấy thông tin tab hiện tại.',
    }
  }

  const isYouTubeVideo = YOUTUBE_MATCH_PATTERN.test(tab.url)
  const actualPageType = isYouTubeVideo ? 'youtube' : 'webpage'

  console.log(
    `[contentService] Tab ID: ${tab.id}, URL: ${tab.url}, Is YouTube: ${isYouTubeVideo}, Requested Type: ${contentType}`
  )

  if (contentType === 'webpageText') {
    console.log(
      '[contentService] Yêu cầu lấy nội dung text từ trang web (webpageText)...'
    )
    try {
      const pageText = await executeFunction(tab.id, getWebpageText)
      if (pageText) {
        console.log('[contentService] Lấy nội dung webpageText thành công.')
        return { type: actualPageType, content: pageText }
      } else {
        console.warn('[contentService] Không lấy đủ nội dung webpageText.')
        return {
          type: 'error',
          content: null,
          error: 'Không thể lấy đủ nội dung text từ trang web.',
        }
      }
    } catch (error) {
      console.error(
        '[contentService] Lỗi khi thực thi script lấy webpageText:',
        error
      )
      return {
        type: 'error',
        content: null,
        error: `Lỗi khi lấy nội dung webpageText: ${error.message}`,
      }
    }
  }

  if (
    isYouTubeVideo &&
    (contentType === 'transcript' || contentType === 'timestampedTranscript')
  ) {
    const action =
      contentType === 'timestampedTranscript'
        ? 'fetchTranscriptWithTimestamp'
        : 'fetchTranscript'
    try {
      console.log(
        `[contentService] Gửi yêu cầu ${action} (vì là YouTube và yêu cầu ${contentType}) đến tab ${tab.id} với ngôn ngữ ${preferredLang}`
      )
      const response = await sendMessageToTab(tab.id, {
        action: action,
        lang: preferredLang,
      })

      if (response && response.success && response.transcript) {
        console.log(
          `[contentService] Nhận được transcript (${action}) thành công.`
        )
        return {
          type: 'youtube',
          content: response.transcript,
        }
      } else {
        console.error(
          `[contentService] Lỗi từ content script (${action}):`,
          response?.error
        )
        return {
          type: 'error',
          content: null,
          error:
            response?.error ||
            `Không thể lấy ${contentType} từ content script YouTube.`,
        }
      }
    } catch (error) {
      console.error(`[contentService] Lỗi khi gửi message (${action}):`, error)
      return {
        type: 'error',
        content: null,
        error: `Lỗi giao tiếp với content script YouTube: ${error.message}`,
      }
    }
  }

  if (
    !isYouTubeVideo &&
    (contentType === 'transcript' || contentType === 'timestampedTranscript')
  ) {
    console.warn(
      `[contentService] Yêu cầu lấy ${contentType} nhưng đây không phải trang YouTube. URL: ${tab.url}`
    )
    return {
      type: 'error',
      content: null,
      error: `Không thể lấy ${contentType} vì đây không phải trang YouTube.`,
    }
  }

  console.error(
    `[contentService] Trường hợp không xử lý được: isYouTube=${isYouTubeVideo}, contentType=${contentType}`
  )
  return {
    type: 'error',
    content: null,
    error: 'Logic không xác định trong getPageContent.',
  }
}

console.log('contentService.js loaded')
