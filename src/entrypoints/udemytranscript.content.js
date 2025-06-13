// @ts-nocheck
export default defineContentScript({
  matches: ['*://*.udemy.com/course/*/learn/*'],
  main() {
    console.log('Udemy Transcript Content Script ready for use.')
    class UdemyTranscriptExtractor {
      constructor(defaultLang = 'en') {
        this.defaultLang = defaultLang
      }

      async getTranscriptFromDOM() {
        try {
          // Chờ nút 'Transcript' xuất hiện và nhấp vào nó nếu panel chưa mở
          await new Promise((resolve) => {
            const checkButton = () => {
              const button = document.querySelector(
                'button[data-purpose="transcript-toggle"]'
              )
              if (button) {
                // Kiểm tra xem panel đã hiện chưa
                const isExpanded =
                  button.getAttribute('aria-expanded') === 'true'
                if (!isExpanded) {
                  button.click()
                }
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
              const container = document.querySelector(
                'div[data-purpose="transcript-panel"]'
              )
              if (container) {
                resolve()
              } else {
                setTimeout(checkContainer, 500) // Kiểm tra lại sau 500ms
              }
            }
            checkContainer()
          })

          // Phân tích tất cả các đoạn văn bản từ vùng chứa bản ghi
          const transcriptText = Array.from(
            document.querySelectorAll('.transcript--cue-container--Vuwj6')
          )
            .map((element) => element.textContent?.trim())
            .filter(Boolean) // Lọc bỏ các giá trị null/undefined
            .join('\n') // Nối các đoạn bằng một dòng mới

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
          case 'fetchUdemyTranscript':
            console.log(
              'Content script received fetchUdemyTranscript request',
              request
            )
            try {
              const lang = request.lang || transcriptExtractor.defaultLang
              const transcript = await transcriptExtractor.getPlainTranscript(
                lang
              )
              if (transcript) {
                console.log('Udemy Transcript fetched successfully')
                sendResponse({ success: true, transcript })

                // Gửi transcript đến background script hoặc sidepanel
                chrome.runtime.sendMessage({
                  action: 'udemyTranscriptFetched',
                  transcript: transcript,
                  lang: lang,
                })
              } else {
                console.log(
                  'Failed to get Udemy transcript, sending error response'
                )
                sendResponse({
                  success: false,
                  error: 'Failed to get Udemy transcript.',
                })
              }
            } catch (error) {
              console.error(
                'Error handling fetchUdemyTranscript message:',
                error
              )
              sendResponse({ success: false, error: error.message })
            }
            break

          case 'pingUdemyScript':
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
