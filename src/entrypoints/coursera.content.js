// @ts-nocheck
export default defineContentScript({
  matches: ['*://*.coursera.org/learn/*'],
  main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.courseraListenerAdded) return
    window.courseraListenerAdded = true

    console.log('Coursera Content Script ready for use.')
    window.isCourseraContentScriptReady = true // Đặt cờ để background script biết script đã sẵn sàng
    class CourseraContentExtractor {
      constructor(defaultLang = 'en') {
        this.defaultLang = defaultLang
      }

      /**
       * Chờ một phần tử DOM xuất hiện.
       * @param {string} selector - Bộ chọn CSS của phần tử.
       * @param {number} timeout - Thời gian chờ tối đa bằng milliseconds.
       * @returns {Promise<Element|null>} - Phần tử hoặc null nếu hết thời gian chờ.
       */
      async waitForElement(selector, timeout = 15000, initialInterval = 50) {
        const startTime = Date.now()

        // Immediate check trước khi bắt đầu polling
        const immediateElement = document.querySelector(selector)
        if (immediateElement) {
          return immediateElement
        }

        return new Promise((resolve) => {
          let currentInterval = initialInterval
          const maxInterval = 200

          const check = () => {
            const element = document.querySelector(selector)
            if (element) {
              resolve(element)
            } else if (Date.now() - startTime > timeout) {
              resolve(null)
            } else {
              // Dynamic interval: tăng dần để giảm CPU usage
              currentInterval = Math.min(currentInterval * 1.2, maxInterval)
              setTimeout(check, currentInterval)
            }
          }
          setTimeout(check, currentInterval)
        })
      }

      async getTranscriptOrContentFromDOM() {
        console.log('Searching for content containers in parallel...')
        // Định nghĩa tất cả các selectors cần tìm và loại nội dung tương ứng
        const contentFinders = [
          { type: 'transcript', selector: '.rc-Transcript' },
          { type: 'transcript', selector: '.rc-TranscriptHighlighter' },
          { type: 'reading', selector: '[data-testid="cml-viewer"]' },
        ]

        // Immediate check - kiểm tra ngay lập tức xem có element nào đã có sẵn không
        for (const finder of contentFinders) {
          const immediateElement = document.querySelector(finder.selector)
          if (immediateElement) {
            console.log(`Found immediate content of type: ${finder.type}`)
            // Process ngay lập tức mà không cần wait
            if (finder.type === 'transcript') {
              const transcriptText = Array.from(
                immediateElement.querySelectorAll('.rc-Phrase span')
              )
                .map((element) => element.textContent?.trim())
                .filter(Boolean)
                .join('\n')

              if (transcriptText) {
                return transcriptText
              }
            } else if (finder.type === 'reading') {
              const readingText = immediateElement.textContent?.trim()
              if (readingText) {
                return readingText
              }
            }
          }
        }

        // Nếu không tìm thấy immediate element, fallback về parallel search
        console.log('No immediate content found, starting parallel search...')
        // Tạo một mảng các promise, mỗi promise sẽ tìm một selector
        // Tất cả sẽ chạy song song, với timeout được tối ưu xuống 3 giây
        const searchPromises = contentFinders.map((finder) =>
          this.waitForElement(finder.selector, 3000)
        )

        try {
          // Đợi tất cả các cuộc tìm kiếm hoàn tất
          const results = await Promise.all(searchPromises)

          // Tìm xem cuộc tìm kiếm nào thành công đầu tiên
          const firstFoundIndex = results.findIndex(
            (element) => element !== null
          )

          if (firstFoundIndex !== -1) {
            const foundElement = results[firstFoundIndex]
            const contentType = contentFinders[firstFoundIndex].type

            console.log(`Found content of type: ${contentType}`)

            if (contentType === 'transcript') {
              const transcriptText = Array.from(
                foundElement.querySelectorAll('.rc-Phrase span')
              )
                .map((element) => element.textContent?.trim())
                .filter(Boolean)
                .join('\n')

              if (!transcriptText) {
                console.warn('Transcript container found, but no text inside.')
                return null
              }
              return transcriptText
            } else if (contentType === 'reading') {
              const readingText = foundElement.textContent?.trim()
              if (!readingText) {
                console.warn('Reading container found, but no text inside.')
                return null
              }
              return readingText
            }
          }

          // Nếu không tìm thấy bất kỳ selector nào
          console.warn(
            'No relevant content container found on Coursera page after parallel search.'
          )
          return null
        } catch (error) {
          console.error(
            'An error occurred during parallel content search:',
            error
          )
          return null
        }
      }

      cleanContentText(text) {
        return text
          .replace(/\n/g, ' ')
          .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }

      async getPlainContent(preferredLang = this.defaultLang) {
        console.log(
          `Attempting to get plain content for language: ${preferredLang} from Coursera DOM.`
        )
        try {
          const rawContent = await this.getTranscriptOrContentFromDOM()
          if (rawContent) {
            const cleanedContent = this.cleanContentText(rawContent)
            console.log(
              'Coursera content extracted and processed successfully from DOM.'
            )
            return cleanedContent
          } else {
            console.error(
              'Failed to get Coursera content from DOM interaction.'
            )
            return null
          }
        } catch (error) {
          console.error(
            `An unexpected error occurred in getPlainContent for Coursera:`,
            error
          )
          return null
        }
      }
    }

    const courseraContentExtractor = new CourseraContentExtractor('en')

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handleRequest = async () => {
        switch (request.action) {
          case 'fetchCourseContent': // Đổi tên action
            console.log(
              'Content script received fetchCourseContent request for Coursera',
              request
            )
            try {
              const lang = request.lang || courseraContentExtractor.defaultLang
              let content = null
              const maxRetries = 1 // Reduced from 3 to 1 to avoid long waits
              let retries = 0
              let lastError = null

              while (content === null && retries < maxRetries) {
                if (retries > 0) {
                  console.log(
                    `Retrying to get Coursera content (attempt ${
                      retries + 1
                    }/${maxRetries})...`
                  )
                  // Exponential backoff: 500ms, 750ms, 1000ms
                  const retryDelay = Math.min(500 * (1 + retries * 0.5), 1000)
                  await new Promise((resolve) =>
                    setTimeout(resolve, retryDelay)
                  )
                }
                try {
                  content = await courseraContentExtractor.getPlainContent(lang)
                  if (content) {
                    console.log(
                      'Coursera content fetched successfully after retry.'
                    )
                    break
                  }
                } catch (error) {
                  lastError = error
                  console.error(`Attempt ${retries + 1} failed:`, error)
                }
                retries++
              }

              if (content) {
                console.log('Coursera content fetched successfully: ' + content)
                sendResponse({ success: true, content })

                chrome.runtime.sendMessage({
                  action: 'courseContentFetched', // Đổi tên action
                  content: content,
                  lang: lang,
                  courseType: 'coursera', // Thêm loại khóa học
                })
              } else {
                console.log(
                  'Failed to get Coursera content after multiple attempts, sending error response'
                )
                sendResponse({
                  success: false,
                  error: lastError
                    ? lastError.message
                    : 'Failed to get Coursera content after multiple attempts.',
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
