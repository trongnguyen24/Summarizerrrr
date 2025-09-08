// @ts-nocheck
import { MessageBasedTranscriptExtractor } from './content/extractors/MessageBasedTranscriptExtractor.js'
export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  async main() {
    // Inject youtube_transcript.js if not already loaded
    if (typeof getCaptions === 'undefined') {
      const script = document.createElement('script')
      script.src = browser.runtime.getURL('youtube_transcript.js')
      script.onload = () => {
        console.log('YouTube transcript script injected successfully')
      }
      script.onerror = () => {
        console.error('Failed to inject YouTube transcript script')
      }
      ;(document.head || document.documentElement).appendChild(script)
    } else {
      console.log('YouTube transcript script already loaded')
    }
    console.log('YouTube Transcript Content Script ready for use.')
    console.log('YouTube Transcript Content Script ready for use.')

    const transcriptExtractor = new MessageBasedTranscriptExtractor('en')

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handleRequest = async () => {
        switch (request.action) {
          case 'fetchTranscript':
            console.log(
              'Content script received fetchTranscript request',
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
