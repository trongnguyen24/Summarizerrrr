// @ts-nocheck
export default defineContentScript({
  matches: ['*://*.udemy.com/course/*/learn/*'],
  main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.udemyListenerAdded) return
    window.udemyListenerAdded = true

    console.log('Udemy Transcript Content Script ready for use.')
    window.isUdemyContentScriptReady = true // Đặt cờ để background script biết script đã sẵn sàng
    class UdemyTranscriptExtractor {
      constructor(defaultLang = 'en') {
        this.defaultLang = defaultLang
      }

      /**
       * Chờ một phần tử DOM xuất hiện.
       * @param {string} selector - Bộ chọn CSS của phần tử.
       * @param {number} timeout - Thời gian chờ tối đa bằng milliseconds.
       * @returns {Promise<Element|null>} - Phần tử hoặc null nếu hết thời gian chờ.
       */
      async waitForElement(selector, timeout = 15000, interval = 500) {
        const startTime = Date.now()
        return new Promise((resolve) => {
          const check = () => {
            const element = document.querySelector(selector)
            if (element) {
              resolve(element)
            } else if (Date.now() - startTime > timeout) {
              resolve(null)
            } else {
              setTimeout(check, interval)
            }
          }
          check()
        })
      }

      async getTranscriptFromDOM() {
        try {
          // Chờ nút 'Transcript' xuất hiện và nhấp vào nó nếu panel chưa mở
          const transcriptButton = await this.waitForElement(
            'button[data-purpose="transcript-toggle"]'
          )
          if (!transcriptButton) {
            console.error('Transcript button not found after waiting.')
            return null
          }

          const isExpanded =
            transcriptButton.getAttribute('aria-expanded') === 'true'
          if (!isExpanded) {
            transcriptButton.click()
            console.log('Clicked transcript button to expand panel.')
            // Thêm một độ trễ nhỏ sau khi nhấp để panel có thời gian mở
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }

          // Chờ vùng chứa bản ghi xuất hiện
          const transcriptContainer = await this.waitForElement(
            'div[data-purpose="transcript-panel"]'
          )
          if (!transcriptContainer) {
            console.error('Transcript panel container not found after waiting.')
            return null
          }

          // Phân tích tất cả các đoạn văn bản từ vùng chứa bản ghi
          const transcriptText = Array.from(
            transcriptContainer.querySelectorAll(
              '.transcript--cue-container--Vuwj6'
            )
          )
            .map((element) => element.textContent?.trim())
            .filter(Boolean) // Lọc bỏ các giá trị null/undefined
            .join('\n') // Nối các đoạn bằng một dòng mới

          if (!transcriptText) {
            console.warn('No transcript text found in the panel.')
            return null
          }

          return transcriptText
        } catch (error) {
          console.error(
            'An error occurred while interacting with DOM to get Udemy transcript:',
            error
          )
          return null
        }
      }

      cleanTranscriptText(text) {
        return text
          .replace(/\n/g, ' ')
          .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }

      async getPlainTranscript(preferredLang = this.defaultLang) {
        console.log(
          `Attempting to get plain transcript for language: ${preferredLang} from Udemy DOM.`
        )
        try {
          const rawTranscript = await this.getTranscriptFromDOM()
          if (rawTranscript) {
            const cleanedTranscript = this.cleanTranscriptText(rawTranscript)
            console.log(
              'Udemy transcript extracted and processed successfully from DOM.'
            )
            return cleanedTranscript
          } else {
            console.error(
              'Failed to get Udemy transcript from DOM interaction.'
            )
            return null
          }
        } catch (error) {
          console.error(
            `An unexpected error occurred in getPlainTranscript for Udemy:`,
            error
          )
          return null
        }
      }
    }

    const transcriptExtractor = new UdemyTranscriptExtractor('en') // Udemy thường dùng tiếng Anh

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handleRequest = async () => {
        switch (request.action) {
          case 'fetchCourseContent': // Đổi tên action
            console.log(
              'Content script received fetchCourseContent request for Udemy',
              request
            )
            try {
              const lang = request.lang || transcriptExtractor.defaultLang
              let content = null
              const maxRetries = 3
              let retries = 0
              let lastError = null

              while (content === null && retries < maxRetries) {
                if (retries > 0) {
                  console.log(
                    `Retrying to get Udemy content (attempt ${
                      retries + 1
                    }/${maxRetries})...`
                  )
                  // Thêm độ trễ giữa các lần thử lại
                  await new Promise((resolve) => setTimeout(resolve, 2000))
                }
                try {
                  content = await transcriptExtractor.getPlainTranscript(lang)
                  if (content) {
                    console.log(
                      'Udemy content fetched successfully after retry.'
                    )
                    break // Thoát vòng lặp nếu thành công
                  }
                } catch (error) {
                  lastError = error
                  console.error(`Attempt ${retries + 1} failed:`, error)
                }
                retries++
              }

              if (content) {
                console.log('Udemy content fetched successfully')
                sendResponse({ success: true, content })

                // Gửi content đến background script hoặc sidepanel với courseType
                chrome.runtime.sendMessage({
                  action: 'courseContentFetched', // Đổi tên action
                  content: content,
                  lang: lang,
                  courseType: 'udemy', // Thêm loại khóa học
                })
              } else {
                console.log(
                  'Failed to get Udemy content after multiple attempts, sending error response'
                )
                sendResponse({
                  success: false,
                  error: lastError
                    ? lastError.message
                    : 'Failed to get Udemy content after multiple attempts.',
                })
              }
            } catch (error) {
              console.error('Error handling fetchCourseContent message:', error)
              sendResponse({ success: false, error: error.message })
            }
            break

          case 'pingCourseScript': // Đổi tên action
            console.log('Content script received ping request, responding.')
            sendResponse({ success: true, message: 'pong' })
            break

          default:
            console.log(`Unknown action: ${request.action}`)
            sendResponse({
              success: false,
              error: `Unknown action: ${request.action}`,
            })
        }
      }

      handleRequest()
      return true
    })
  },
})
