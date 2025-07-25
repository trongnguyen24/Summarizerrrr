// @ts-nocheck
export default defineContentScript({
  matches: ['*://*.coursera.org/learn/*'],
  main() {
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

      async getTranscriptOrContentFromDOM() {
        console.log('Searching for content containers in parallel...')
        // Định nghĩa tất cả các selectors cần tìm và loại nội dung tương ứng
        const contentFinders = [
          { type: 'transcript', selector: '.rc-Transcript' },
          { type: 'transcript', selector: '.rc-TranscriptHighlighter' },
          { type: 'reading', selector: '[data-testid="cml-viewer"]' },
        ]

        // Tạo một mảng các promise, mỗi promise sẽ tìm một selector
        // Tất cả sẽ chạy song song, với timeout là 5 giây
        const searchPromises = contentFinders.map((finder) =>
          this.waitForElement(finder.selector, 5000)
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
              const maxRetries = 3
              let retries = 0
              let lastError = null

              while (content === null && retries < maxRetries) {
                if (retries > 0) {
                  console.log(
                    `Retrying to get Coursera content (attempt ${
                      retries + 1
                    }/${maxRetries})...`
                  )
                  await new Promise((resolve) => setTimeout(resolve, 2000))
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
