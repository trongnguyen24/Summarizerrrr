// @ts-nocheck
import { MessageBasedTranscriptExtractor } from './content/extractors/MessageBasedTranscriptExtractor.js'

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  async main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.youtubeTranscriptListenerAdded) return
    window.youtubeTranscriptListenerAdded = true

    // Inject youtube_transcript.js if not already loaded
    if (typeof getCaptions === 'undefined') {
      const script = document.createElement('script')
      script.src = browser.runtime.getURL('youtube_transcript.js')
      script.onload = () => {
        console.log('[YouTubeTranscript] Transcript script injected successfully')
      }
      script.onerror = () => {
        console.error('[YouTubeTranscript] Failed to inject transcript script')
      }
      ;(document.head || document.documentElement).appendChild(script)
    }

    // Inject youtube_player_control.js for seeking functionality
    if (!window.youtubePlayerControlInjected) {
      const controlScript = document.createElement('script')
      controlScript.src = browser.runtime.getURL('youtube_player_control.js')
      controlScript.onload = () => {
        console.log('[YouTubeTranscript] Player control script injected successfully')
        window.youtubePlayerControlInjected = true
      }
      controlScript.onerror = () => {
        console.error('[YouTubeTranscript] Failed to inject player control script')
      }
      ;(document.head || document.documentElement).appendChild(controlScript)
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

          case 'seekToTimestamp':
            try {
              // Dispatch a custom event that youtube_transcript.js (running in Main World) will listen to
              const event = new CustomEvent('Summarizerrrr_Seek', {
                detail: { seconds: request.seconds }
              })
              window.dispatchEvent(event)

              sendResponse({ success: true })
            } catch (error) {
              console.error(
                '[YouTubeTranscript] Error in seekToTimestamp:',
                error
              )
              sendResponse({ success: false, error: error.message })
            }
            break

          default:
            return false // Let other listeners handle unknown actions
        }
      }

      handleRequest()
      return true
    })

    console.log('[YouTubeTranscript] Ready')
  },
})
