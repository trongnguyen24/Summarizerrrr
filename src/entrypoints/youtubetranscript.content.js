export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],

  main() {
    console.log('Summarizerrrr: YouTube Transcript Content Script loaded.')

    /**
     * Extracts the video ID from the current URL.
     * @returns {string|null} The video ID or null if not found.
     */
    function getVideoId() {
      const url = window.location.href
      const match = url.match(/[?&]v=([^&]+)/)
      return match ? match[1] : null
    }

    /**
     * Retrieves the transcript for a given video.
     * It tries multiple language codes to find an available transcript.
     * @param {boolean} includeTimestamps - Whether to return a timestamped string or plain text.
     * @param {string} preferredLang - The preferred language code (e.g., 'en', 'vi').
     * @returns {Promise<string|null>} The transcript text or null if not found.
     */
    async function fetchTranscript(
      includeTimestamps = false,
      preferredLang = 'en'
    ) {
      try {
        const videoUrl = window.location.href
        const videoId = getVideoId()

        if (!videoId) {
          console.log('Summarizerrrr: No video ID found.')
          return null
        }

        if (typeof getCaptions === 'undefined') {
          console.error(
            'Summarizerrrr: getCaptions function is not available. This should not happen if scripts are imported correctly.'
          )
          return null
        }

        // Prioritize the preferred language, then fall back to others
        const languageCodes = [preferredLang, 'en', 'vi', 'zz']
        const uniqueLanguageCodes = [...new Set(languageCodes)]

        for (const langCode of uniqueLanguageCodes) {
          try {
            const transcriptData = await getCaptions(videoUrl, langCode)

            if (
              transcriptData &&
              Array.isArray(transcriptData) &&
              transcriptData.length > 0
            ) {
              console.log(
                `Summarizerrrr: Transcript found for language: ${langCode}`
              )

              if (includeTimestamps) {
                return transcriptData
                  .map((segment) => {
                    const timeRange =
                      segment.startTime && segment.endTime
                        ? `[${segment.startTime} → ${segment.endTime}]`
                        : segment.startTime
                        ? `[${segment.startTime}]`
                        : ''
                    return `${timeRange} ${segment.text}`.trim()
                  })
                  .join('\n')
              } else {
                return transcriptData.map((segment) => segment.text).join(' ')
              }
            }
          } catch (error) {
            // This is expected if a transcript for a language doesn't exist.
            // console.log(`Summarizerrrr: No transcript for language ${langCode}.`);
          }
        }

        console.log(
          'Summarizerrrr: No transcript found for any attempted language.'
        )
        return null
      } catch (error) {
        console.error(
          'Summarizerrrr: An error occurred while fetching transcript:',
          error
        )
        return null
      }
    }

    // Listen for messages from other parts of the extension
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      const handleRequest = async () => {
        switch (request.action) {
          case 'fetchTranscript':
            try {
              const transcript = await fetchTranscript(false, request.lang)
              if (transcript) {
                sendResponse({ success: true, transcript })
              } else {
                sendResponse({
                  success: false,
                  error: 'Failed to get transcript.',
                })
              }
            } catch (error) {
              sendResponse({ success: false, error: error.message })
            }
            break

          case 'fetchTranscriptWithTimestamp':
            try {
              const transcript = await fetchTranscript(true, request.lang)
              if (transcript) {
                sendResponse({ success: true, transcript })
              } else {
                sendResponse({
                  success: false,
                  error: 'Failed to get timestamped transcript.',
                })
              }
            } catch (error) {
              sendResponse({ success: false, error: error.message })
            }
            break

          case 'pingYouTubeScript':
            sendResponse({ success: true, message: 'pong' })
            break

          default:
            // Do nothing for unknown actions
            break
        }
      }

      handleRequest()
      return true // Keep the message channel open for async response
    })
  },
})
