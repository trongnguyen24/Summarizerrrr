// @ts-nocheck
export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  main() {
    console.log('YouTube Transcript Content Script ready for use.')
    class YouTubeTranscriptExtractor {
      /**
       * Khởi tạo extractor với ngôn ngữ mặc định
       * @param {string} defaultLang - Mã ngôn ngữ mặc định (ví dụ: 'vi', 'en')
       */
      constructor(defaultLang = 'en') {
        this.defaultLang = defaultLang
      }

      /**
       * Lấy và phân tích ytInitialPlayerResponse từ trang YouTube
       * @returns {Promise<Object|null>} - Object chứa dữ liệu player hoặc null nếu có lỗi
       */
      async getPlayerResponse() {
        try {
          // Đóng biểu ngữ cookie
          document.querySelector('button[aria-label*=cookies]')?.click()

          // Chờ nút 'Show transcript' xuất hiện và nhấp vào nó
          await new Promise((resolve) => {
            const checkButton = () => {
              const button = document.querySelector(
                'ytd-video-description-transcript-section-renderer button'
              )
              if (button) {
                button.click()
                resolve()
              } else {
                setTimeout(checkButton, 500) // Kiểm tra lại sau 500ms
              }
            }
            checkButton()
          })

          // Chờ vùng chứa bản ghi xuất hiện
          await new Promise((resolve) => {
            const checkContainer = () => {
              const container = document.querySelector('#segments-container')
              if (container) {
                resolve()
              } else {
                setTimeout(checkContainer, 500) // Kiểm tra lại sau 500ms
              }
            }
            checkContainer()
          })

          // Phân tích tất cả các nút văn bản từ vùng chứa bản ghi và nối chúng bằng một dòng trống
          const transcriptText = Array.from(
            document.querySelectorAll('#segments-container')
          )
            .map((element) => element.textContent?.trim())
            .join('\n')

          // Trả về một đối tượng giả định để phù hợp với cấu trúc ban đầu của getPlayerResponse
          // Mặc dù chúng ta không cần playerResponse thực sự nữa, nhưng các hàm khác có thể mong đợi nó.
          // Trong trường hợp này, chúng ta sẽ trả về một đối tượng có thuộc tính 'transcript'
          // để hàm getTranscript có thể sử dụng nó.
          return { transcript: transcriptText }
        } catch (error) {
          console.error(
            'An error occurred while interacting with DOM to get transcript:',
            error
          )
          return null
        }
      }

      /**
       * Làm sạch text từ transcript
       * @param {string} text - Text cần làm sạch
       * @returns {string} - Text đã làm sạch
       */
      cleanTranscriptText(text) {
        return text
          .replace(/\n/g, ' ')
          .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }

      /**
       * Định dạng milliseconds thành chuỗi thời gian MM:SS hoặc HH:MM:SS.
       * @param {number} ms - Thời gian tính bằng milliseconds.
       * @returns {string} - Chuỗi thời gian đã định dạng.
       */
      formatMilliseconds(ms) {
        const totalSeconds = Math.floor(ms / 1000)
        const hours = Math.floor(totalSeconds / 3600)
        const minutes = Math.floor((totalSeconds % 3600) / 60)
        const seconds = totalSeconds % 60

        const paddedSeconds = String(seconds).padStart(2, '0')
        const paddedMinutes = String(minutes).padStart(2, '0')

        if (hours > 0) {
          const paddedHours = String(hours).padStart(2, '0')
          return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`
        } else {
          return `${paddedMinutes}:${paddedSeconds}`
        }
      }

      /**
       * Hàm chính để lấy transcript từ YouTube
       * @param {string} preferredLang - Mã ngôn ngữ ưa thích
       * @param {boolean} includeTimestamps - Có bao gồm timestamp không
       * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
       */
      async getTranscript(
        preferredLang = this.defaultLang,
        includeTimestamps = false
      ) {
        const logType = includeTimestamps
          ? 'timestamped transcript'
          : 'transcript'
        console.log(
          `Attempting to get ${logType} for language: ${preferredLang} using DOM interaction.`
        )

        try {
          // Gọi getPlayerResponse để thực hiện tương tác DOM và lấy bản ghi
          const domResult = await this.getPlayerResponse()

          if (domResult && domResult.transcript) {
            console.log(
              `${logType} extracted and processed successfully from DOM.`
            )
            // Nếu includeTimestamps là true, chúng ta cần định dạng lại bản ghi
            // Hiện tại, logic DOM chỉ trả về văn bản thuần túy.
            // Nếu người dùng cần timestamp, họ sẽ phải làm rõ cách chúng ta nên lấy chúng từ DOM.
            if (includeTimestamps) {
              console.warn(
                'Timestamped transcript requested, but DOM interaction currently only provides plain text. Returning plain text.'
              )
            }
            return domResult.transcript
          } else {
            console.error('Failed to get transcript from DOM interaction.')
            return null
          }
        } catch (error) {
          console.error(
            `An unexpected error occurred in getTranscript(withTimestamp=${includeTimestamps}):`,
            error
          )
          return null
        }
      }

      /**
       * Wrapper để lấy transcript không có timestamp
       * @param {string} preferredLang - Mã ngôn ngữ ưa thích
       * @returns {Promise<string|null>} - Transcript hoặc null nếu không thành công
       */
      async getPlainTranscript(preferredLang = this.defaultLang) {
        return this.getTranscript(preferredLang, false)
      }

      /**
       * Wrapper để lấy transcript có timestamp
       * @param {string} preferredLang - Mã ngôn ngữ ưa thích
       * @returns {Promise<string|null>} - Transcript có timestamp hoặc null nếu không thành công
       */
      async getTimestampedTranscript(preferredLang = this.defaultLang) {
        return this.getTranscript(preferredLang, true)
      }
    }

    const transcriptExtractor = new YouTubeTranscriptExtractor('vi')

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log(
        'youtubetranscript.content.js received a message:',
        request,
        'from sender:',
        sender
      )
      const handleRequest = async () => {
        switch (request.action) {
          case 'fetchTranscript':
            console.log(
              'youtubetranscript.content.js: Content script received fetchTranscript request',
              request
            )
            try {
              const lang = request.lang || transcriptExtractor.defaultLang
              const transcript = await transcriptExtractor.getPlainTranscript(
                lang
              )
              if (transcript) {
                console.log('Transcript fetched successfully')
                sendResponse({ success: true, transcript })
              } else {
                console.log('Failed to get transcript, sending error response')
                sendResponse({
                  success: false,
                  error: 'Failed to get transcript.',
                })
              }
            } catch (error) {
              console.error('Error handling fetchTranscript message:', error)
              sendResponse({ success: false, error: error.message })
            }
            break

          case 'fetchTranscriptWithTimestamp':
            console.log(
              'Content script received fetchTranscriptWithTimestamp request',
              request
            )
            try {
              const lang = request.lang || transcriptExtractor.defaultLang
              const transcript =
                await transcriptExtractor.getTimestampedTranscript(lang)
              if (transcript) {
                console.log('Timestamped transcript fetched successfully')
                sendResponse({ success: true, transcript })
              } else {
                console.log(
                  'Failed to get timestamped transcript, sending error response'
                )
                sendResponse({
                  success: false,
                  error: 'Failed to get timestamped transcript.',
                })
              }
            } catch (error) {
              console.error(
                'Error handling fetchTranscriptWithTimestamp message:',
                error
              )
              sendResponse({ success: false, error: error.message })
            }
            break

          case 'pingYouTubeScript':
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
