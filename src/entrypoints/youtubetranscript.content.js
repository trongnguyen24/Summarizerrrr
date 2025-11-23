// @ts-nocheck
import { MessageBasedTranscriptExtractor } from './content/extractors/MessageBasedTranscriptExtractor.js'

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  async main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.youtubeTranscriptListenerAdded) return
    window.youtubeTranscriptListenerAdded = true

    // youtube_transcript.js is already loaded via content_scripts in wxt.config.ts
    // No need to inject it into the main world.


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
              const detail = { seconds: request.seconds }
              let event

              // Firefox requires cloneInto for CustomEvent details to be accessible in the main world
              if (typeof cloneInto !== 'undefined') {
                const clonedDetail = cloneInto(detail, document.defaultView)
                event = new CustomEvent('Summarizerrrr_Seek', {
                  detail: clonedDetail,
                })
              } else {
                event = new CustomEvent('Summarizerrrr_Seek', {
                  detail: detail,
                })
              }

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
