// @ts-nocheck
import { MessageBasedTranscriptExtractor } from './content/extractors/MessageBasedTranscriptExtractor.js'

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  async main() {
    // Inject youtube_transcript.js if not already loaded
    if (typeof getCaptions === 'undefined') {
      const script = document.createElement('script')
      script.src = browser.runtime.getURL('youtube_transcript.js')
      script.onload = () => {
        console.log('[YouTubeTranscript] Script injected successfully')
      }
      script.onerror = () => {
        console.error('[YouTubeTranscript] Failed to inject script')
      }
      ;(document.head || document.documentElement).appendChild(script)
    }

    const transcriptExtractor = new MessageBasedTranscriptExtractor('en')

    // Setup message listener (registered once, handles all navigation states)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Only handle messages when on watch page
      if (!location.href.includes('/watch')) {
        return false
      }

      const handleRequest = async () => {
        switch (request.action) {
          case 'fetchTranscript':
            try {
              const lang = request.lang || transcriptExtractor.defaultLang
              const transcript = await transcriptExtractor.getPlainTranscript(
                lang
              )
              if (transcript) {
                sendResponse({ success: true, transcript })
              } else {
                sendResponse({
                  success: false,
                  error: 'Failed to get transcript.',
                })
              }
            } catch (error) {
              console.error(
                '[YouTubeTranscript] Error in fetchTranscript:',
                error
              )
              sendResponse({ success: false, error: error.message })
            }
            break

          case 'fetchTranscriptWithTimestamp':
            try {
              const lang = request.lang || transcriptExtractor.defaultLang
              const transcript =
                await transcriptExtractor.getTimestampedTranscript(lang)
              if (transcript) {
                sendResponse({ success: true, transcript })
              } else {
                sendResponse({
                  success: false,
                  error: 'Failed to get timestamped transcript.',
                })
              }
            } catch (error) {
              console.error(
                '[YouTubeTranscript] Error in fetchTranscriptWithTimestamp:',
                error
              )
              sendResponse({ success: false, error: error.message })
            }
            break

          case 'pingYouTubeScript':
            sendResponse({ success: true, message: 'pong' })
            break

          default:
            sendResponse({
              success: false,
              error: `Unknown action: ${request.action}`,
            })
        }
      }

      handleRequest()
      return true
    })

    console.log('[YouTubeTranscript] Ready')
  },
})
