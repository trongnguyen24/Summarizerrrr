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
        return
      }

      console.log(
        `YouTube Transcript Extractor: Extracting transcript for video ID: ${videoId}`
      )

      // Check if getCaptions function is available
      if (typeof getCaptions === 'undefined') {
        return
      }

      // Try to extract captions with different language codes
      const languageCodes = ['en', 'vi', 'zz'] // English, Vietnamese, auto-generated

      for (const langCode of languageCodes) {
        try {
          const transcriptData = await getCaptions(videoUrl, langCode)

          if (
            transcriptData &&
            Array.isArray(transcriptData) &&
            transcriptData.length > 0
          ) {
            // Log full transcript text
            const fullText = transcriptData
              .map((segment) => segment.text)
              .join(' ')

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

            return // Success, exit the loop
          }
        } catch (error) {}
      }
    } catch (error) {}
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
  if (getVideoId()) {
    handleUrlChange()
  }

  // Also listen for YouTube's navigation events if available
  window.addEventListener('yt-navigate-finish', handleUrlChange)
  window.addEventListener('popstate', handleUrlChange)
})()
