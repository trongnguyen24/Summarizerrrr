// Content script for YouTube Mobile Transcript Extractor
// This script automatically extracts and logs transcripts from YouTube videos

;(function () {
  'use strict'

  // Function to extract video ID from current URL
  function getVideoId() {
    const url = window.location.href
    const match = url.match(/[?&]v=([^&]+)/)
    return match ? match[1] : null
  }

  // Function to get the current video URL
  function getCurrentVideoUrl() {
    return window.location.href
  }

  // Function to extract and log transcripts
  async function extractAndLogTranscript() {
    try {
      const videoUrl = getCurrentVideoUrl()
      const videoId = getVideoId()

      if (!videoId) {
        console.log('YouTube Transcript Extractor: No video ID found')
        return
      }

      console.log(
        `YouTube Transcript Extractor: Extracting transcript for video ID: ${videoId}`
      )
      console.log(`YouTube Transcript Extractor: Video URL: ${videoUrl}`)

      // Check if getCaptions function is available
      if (typeof getCaptions === 'undefined') {
        console.error(
          'YouTube Transcript Extractor: getCaptions function not available'
        )
        return
      }

      // Try to extract captions with different language codes
      const languageCodes = ['en', 'vi', 'zz'] // English, Vietnamese, auto-generated

      for (const langCode of languageCodes) {
        try {
          console.log(
            `YouTube Transcript Extractor: Trying language code: ${langCode}`
          )
          const transcriptData = await getCaptions(videoUrl, langCode)

          if (
            transcriptData &&
            Array.isArray(transcriptData) &&
            transcriptData.length > 0
          ) {
            console.log('=== YOUTUBE TRANSCRIPT WITH TIMESTAMPS EXTRACTED ===')
            console.log(`Video ID: ${videoId}`)
            console.log(`Language: ${langCode}`)
            console.log(`Total Segments: ${transcriptData.length}`)

            // Log full transcript text
            const fullText = transcriptData
              .map((segment) => segment.text)
              .join(' ')
            console.log(`Full Transcript (${fullText.length} characters):`)
            console.log(fullText)

            console.log('--- TIMESTAMPED SEGMENTS ---')
            const unifiedTimestampedText = transcriptData
              .map((segment) => {
                const timeRange =
                  segment.startTime && segment.endTime
                    ? `[${segment.startTime} → ${segment.endTime}]`
                    : segment.startTime
                    ? `[${segment.startTime}]`
                    : '[No timestamp]'
                return `${timeRange} ${segment.text}`
              })
              .join('\n')
            console.log(unifiedTimestampedText)

            console.log('--- STRUCTURED DATA ---')
            console.log('JSON Format:', JSON.stringify(transcriptData, null, 2))
            console.log('--- END TRANSCRIPT ---')
            return // Success, exit the loop
          }
        } catch (error) {
          console.log(
            `YouTube Transcript Extractor: Failed with language ${langCode}:`,
            error.message
          )
        }
      }

      console.log(
        'YouTube Transcript Extractor: No transcript found for any language'
      )
    } catch (error) {
      console.error(
        'YouTube Transcript Extractor: Error extracting transcript:',
        error
      )
    }
  }

  // Function to wait for dependencies to load
  function waitForDependencies() {
    return new Promise((resolve) => {
      const checkDependencies = () => {
        if (
          typeof protobuf !== 'undefined' &&
          typeof getCaptions !== 'undefined' &&
          protobuf.roots &&
          protobuf.roots['default'] &&
          protobuf.roots['default'].VideoMetadata
        ) {
          resolve()
        } else {
          setTimeout(checkDependencies, 100)
        }
      }
      checkDependencies()
    })
  }

  // Function to handle URL changes (for YouTube's SPA navigation)
  function handleUrlChange() {
    const videoId = getVideoId()
    if (videoId) {
      console.log(
        'YouTube Transcript Extractor: New video detected, waiting for dependencies...'
      )
      waitForDependencies().then(() => {
        // Wait a bit more for the video to load
        setTimeout(extractAndLogTranscript, 2000)
      })
    }
  }

  // Monitor URL changes for YouTube's single-page application
  let currentUrl = window.location.href
  const observer = new MutationObserver(() => {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href
      handleUrlChange()
    }
  })

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Initial check
  console.log('YouTube Transcript Extractor: Content script loaded')
  if (getVideoId()) {
    handleUrlChange()
  }

  // Also listen for YouTube's navigation events if available
  window.addEventListener('yt-navigate-finish', handleUrlChange)
  window.addEventListener('popstate', handleUrlChange)
})()
