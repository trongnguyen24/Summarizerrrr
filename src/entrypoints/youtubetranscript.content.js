// @ts-nocheck
import { MessageBasedTranscriptExtractor } from './content/extractors/MessageBasedTranscriptExtractor.js'
import { seekToTimestamp } from '@/lib/utils/videoSeeker.js'

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  async main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.youtubeTranscriptListenerAdded) return
    window.youtubeTranscriptListenerAdded = true

    // youtube_transcript.js is already loaded via content_scripts in wxt.config.ts
    // No need to inject it into the main world.

    const transcriptExtractor = new MessageBasedTranscriptExtractor('en')

    // Setup message listener (registered once, handles all navigation states)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Only handle messages when on watch page
      if (!location.href.includes('/watch') && !location.href.includes('/live/')) {
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
              seekToTimestamp(request.seconds)
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
