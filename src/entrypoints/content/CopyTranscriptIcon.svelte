<script>
  import { MessageBasedTranscriptExtractor } from '../../entrypoints/content/extractors/MessageBasedTranscriptExtractor.js'
  import './styles/copy-transcript-button.css'
  import { onMount, onDestroy } from 'svelte'

  let { videoTitle = '', hasTranscript = true, videoUrl = '' } = $props()
  let currentVideoTitle = $state(videoTitle) // Reactive state for video title
  let currentHasTranscript = $state(hasTranscript) // Track transcript availability
  let currentVideoUrl = $state(videoUrl) // Track video URL
  let isLoading = $state(false)
  let loadingStates = $state({
    gemini: false,
    chatgpt: false,
    perplexity: false,
    grok: false,
    copyWithTimestamp: false,
    downloadSRT: false,
  })
  let showPopover = $state(false)
  let wrapElement = $state()
  let currentVideoId = $state('')
  let currentTranscriptExtractor = $state(null)

  // Function to check if transcript is available for current video
  const checkTranscriptAvailability = async () => {
    try {
      // Wait for DOM to be ready
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Check using YouTube's standard transcript button selector (language-independent)
      let showButton = document.querySelector(
        'ytd-video-description-transcript-section-renderer button',
      )

      // If not found, try expanding description
      if (!showButton) {
        const expandButton = document.querySelector('#expand')
        if (expandButton && expandButton.offsetParent !== null) {
          expandButton.click()
          await new Promise((resolve) => setTimeout(resolve, 800))

          // Try again after expanding
          showButton = document.querySelector(
            'ytd-video-description-transcript-section-renderer button',
          )
        }
      }

      // Fallback to old selectors
      if (!showButton) {
        showButton = document.querySelector(
          'button[aria-label="Show transcript"]',
        )

        if (!showButton) {
          const buttons = Array.from(document.querySelectorAll('button'))
          showButton = buttons.find((btn) =>
            btn.textContent.toLowerCase().includes('transcript'),
          )
        }
      }

      const hasTranscriptResult = !!showButton
      console.log(
        '[CopyTranscriptIcon] Transcript availability check:',
        hasTranscriptResult,
      )
      return hasTranscriptResult
    } catch (error) {
      console.error('[CopyTranscriptIcon] Error checking transcript:', error)
      return false
    }
  }

  // Reactive video tracking
  $effect(() => {
    const newVideoId = getCurrentVideoId()
    if (newVideoId && newVideoId !== currentVideoId) {
      console.log(
        '[CopyTranscriptIcon] Video changed:',
        currentVideoId,
        '->',
        newVideoId,
      )
      currentVideoId = newVideoId

      // Update video title from DOM
      currentVideoTitle = getVideoTitleFromDOM()

      // Update video URL
      currentVideoUrl = window.location.href

      // Reset transcript extractor to clear any cached data
      currentTranscriptExtractor = new MessageBasedTranscriptExtractor('en')

      // Re-check transcript availability for new video
      checkTranscriptAvailability().then((result) => {
        currentHasTranscript = result
        console.log('[CopyTranscriptIcon] Updated hasTranscript:', result)
      })

      // Close popover if open when video changes
      showPopover = false
    }
  })

  // Function to get current video ID from URL
  const getCurrentVideoId = () => {
    const url = window.location.href
    const match = url.match(/[?&]v=([^&]+)/)
    return match ? match[1] : null
  }

  // Function to get video title from DOM
  const getVideoTitleFromDOM = () => {
    return (
      document.querySelector('h1.ytd-watch-metadata')?.textContent?.trim() ||
      document.title
    )
  }

  // Initialize video tracking
  onMount(() => {
    currentVideoId = getCurrentVideoId()
    currentVideoTitle = getVideoTitleFromDOM() // Initialize video title from DOM
    currentTranscriptExtractor = new MessageBasedTranscriptExtractor('en')
  })

  const handleCopyTranscript = async () => {
    if (isLoading) return

    // Check if transcript is available
    if (!currentHasTranscript) {
      console.log('[CopyTranscriptIcon] No transcript available to copy')
      alert(
        'No transcript available for this video. You can still use "Summarize on Gemini" which can process the video directly.',
      )
      return
    }

    isLoading = true
    try {
      // Ensure we use fresh extractor instance
      if (!currentTranscriptExtractor) {
        currentTranscriptExtractor = new MessageBasedTranscriptExtractor('en')
      }
      const transcript = await currentTranscriptExtractor.getPlainTranscript()

      if (transcript && transcript.trim().length > 0) {
        const fullContent = `${transcript.trim()}`
        await navigator.clipboard.writeText(fullContent)
        console.log('Transcript with title copied to clipboard')
      } else {
        console.log('No transcript available to copy')
        alert(
          'Failed to extract transcript. You can still use "Summarize on Gemini" which can process the video directly.',
        )
      }
    } catch (error) {
      console.error('Error copying transcript:', error)
    } finally {
      isLoading = false
    }
  }

  const handleCopyTranscriptWithTimestamp = async () => {
    if (loadingStates.copyWithTimestamp) return

    // Check if transcript is available
    if (!currentHasTranscript) {
      console.log('[CopyTranscriptIcon] No transcript available to copy')
      alert(
        'No transcript available for this video. You can still use "Summarize on Gemini" which can process the video directly.',
      )
      return
    }

    loadingStates.copyWithTimestamp = true
    try {
      // Ensure we use fresh extractor instance
      if (!currentTranscriptExtractor) {
        currentTranscriptExtractor = new MessageBasedTranscriptExtractor('en')
      }
      const transcript =
        await currentTranscriptExtractor.getTimestampedTranscript()

      if (transcript && transcript.trim().length > 0) {
        await navigator.clipboard.writeText(transcript.trim())
        console.log('Transcript with timestamp copied to clipboard')
      } else {
        console.log('No transcript available to copy')
        alert(
          'Failed to extract transcript. You can still use "Summarize on Gemini" which can process the video directly.',
        )
      }
    } catch (error) {
      console.error('Error copying transcript with timestamp:', error)
    } finally {
      loadingStates.copyWithTimestamp = false
    }
  }

  /**
   * Convert timestamp string to SRT format (HH:MM:SS,mmm)
   * Input: "00:00" or "00:00:05"
   * Output: "00:00:00,000" or "00:00:05,000"
   */
  const convertTimestampToSRT = (timestamp) => {
    if (!timestamp) return '00:00:00,000'

    // Remove brackets if present
    const cleanTime = timestamp.replace(/[\[\]]/g, '').trim()

    // Split by colon
    const parts = cleanTime.split(':')

    let hours = '00'
    let minutes = '00'
    let seconds = '00'

    if (parts.length === 2) {
      // MM:SS format
      minutes = parts[0].padStart(2, '0')
      seconds = parts[1].padStart(2, '0')
    } else if (parts.length === 3) {
      // HH:MM:SS format
      hours = parts[0].padStart(2, '0')
      minutes = parts[1].padStart(2, '0')
      seconds = parts[2].padStart(2, '0')
    }

    return `${hours}:${minutes}:${seconds},000`
  }

  /**
   * Convert transcript data to SRT format
   * SRT format:
   * 1
   * 00:00:00,000 --> 00:00:05,000
   * First segment text
   *
   * 2
   * 00:00:05,000 --> 00:00:10,000
   * Second segment text
   */
  const convertToSRT = async () => {
    try {
      if (!currentTranscriptExtractor) {
        currentTranscriptExtractor = new MessageBasedTranscriptExtractor('en')
      }

      // Get raw transcript data with timestamps using the extractor
      const transcriptData =
        await currentTranscriptExtractor.getRawTranscriptData('en')

      if (
        !transcriptData ||
        !Array.isArray(transcriptData) ||
        transcriptData.length === 0
      ) {
        console.warn(
          '[CopyTranscriptIcon] No transcript data for SRT conversion',
        )
        return null
      }

      // Convert to SRT format
      let srtContent = ''
      transcriptData.forEach((segment, index) => {
        const sequenceNumber = index + 1
        const startTime = convertTimestampToSRT(segment.startTime)
        const endTime = convertTimestampToSRT(
          segment.endTime || segment.startTime,
        )
        const text = segment.text.trim()

        srtContent += `${sequenceNumber}\n`
        srtContent += `${startTime} --> ${endTime}\n`
        srtContent += `${text}\n\n`
      })

      return srtContent.trim()
    } catch (error) {
      console.error('[CopyTranscriptIcon] Error converting to SRT:', error)
      return null
    }
  }

  /**
   * Download transcript as SRT file
   */
  const handleDownloadSRT = async () => {
    if (loadingStates.downloadSRT) return

    // Check if transcript is available
    if (!currentHasTranscript) {
      console.log(
        '[CopyTranscriptIcon] No transcript available for SRT download',
      )
      alert(
        'No transcript available for this video. You can still use "Summarize on Gemini" which can process the video directly.',
      )
      return
    }

    loadingStates.downloadSRT = true
    try {
      const srtContent = await convertToSRT()

      if (!srtContent) {
        console.warn('[CopyTranscriptIcon] No SRT content to download')
        alert(
          'Failed to generate SRT file. You can still use "Summarize on Gemini" which can process the video directly.',
        )
        return
      }

      // Create filename from video title
      const sanitizedTitle = currentVideoTitle
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
      const filename = `${sanitizedTitle}.srt`

      // Create blob
      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' })

      // Priority 1: navigator.share (Mobile/iOS)
      try {
        const file = new File([blob], filename, { type: 'text/plain' })
        if (
          navigator.canShare &&
          navigator.canShare({ files: [file] }) &&
          // Check if running on mobile/tablet
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        ) {
          await navigator.share({
            files: [file],
          })
          return
        }
      } catch (error) {
        console.warn('[CopyTranscriptIcon] Share failed, falling back:', error)
      }

      // Priority 2: Fallback to <a> tag
      // Use Data URL for small files (< 10MB) to avoid Blob URL revocation issues on iOS
      let url
      const isSmallFile = blob.size < 10 * 1024 * 1024 // 10MB

      if (isSmallFile) {
        const reader = new FileReader()
        url = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
      } else {
        url = URL.createObjectURL(blob)
      }

      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link)
        if (!isSmallFile) {
          URL.revokeObjectURL(url)
        }
      }, 30000)

      console.log('[CopyTranscriptIcon] SRT file downloaded:', filename)
    } catch (error) {
      console.error('[CopyTranscriptIcon] Error downloading SRT:', error)
    } finally {
      loadingStates.downloadSRT = false
    }
  }

  const handleSummarizeOnAI = async (provider) => {
    if (loadingStates[provider]) return

    loadingStates[provider] = true
    try {
      console.log(`[CopyTranscriptIcon] Starting ${provider} summarization...`)
      console.log(
        `[CopyTranscriptIcon] Has transcript: ${currentHasTranscript}`,
      )

      // Special handling for Gemini when no transcript is available
      if (!currentHasTranscript) {
        if (provider === 'gemini') {
          // Gemini can process YouTube videos directly via URL
          console.log(
            '[CopyTranscriptIcon] No transcript, using YouTube URL for Gemini',
          )

          const videoUrlToSend = currentVideoUrl || window.location.href

          chrome.runtime.sendMessage(
            {
              type: 'SUMMARIZE_ON_GEMINI_WITH_URL',
              youtubeUrl: videoUrlToSend,
            },
            (response) => {
              if (response && response.success) {
                console.log(
                  '[CopyTranscriptIcon] Gemini tab opened successfully with URL',
                )
                showPopover = false
              } else {
                console.error(
                  '[CopyTranscriptIcon] Failed to open Gemini:',
                  response?.error,
                )
              }
            },
          )
          return
        } else {
          // Other providers cannot process YouTube videos without transcript
          console.log(`[CopyTranscriptIcon] ${provider} requires transcript`)
          alert(
            `No transcript available for this video. Only Gemini can process YouTube videos directly. Please use "Summarize on Gemini" instead.`,
          )
          return
        }
      }

      // Normal flow when transcript is available
      // Ensure we use fresh extractor instance
      if (!currentTranscriptExtractor) {
        currentTranscriptExtractor = new MessageBasedTranscriptExtractor('en')
      }

      // Use timestamped transcript for better LLM accuracy
      const transcript =
        await currentTranscriptExtractor.getTimestampedTranscript()

      if (!transcript || transcript.trim().length === 0) {
        console.warn('[CopyTranscriptIcon] No transcript available')

        // Fallback to URL for Gemini
        if (provider === 'gemini') {
          console.log(
            '[CopyTranscriptIcon] Transcript extraction failed, falling back to URL for Gemini',
          )
          const videoUrlToSend = currentVideoUrl || window.location.href

          chrome.runtime.sendMessage(
            {
              type: 'SUMMARIZE_ON_GEMINI_WITH_URL',
              youtubeUrl: videoUrlToSend,
            },
            (response) => {
              if (response && response.success) {
                console.log(
                  '[CopyTranscriptIcon] Gemini tab opened successfully with URL (fallback)',
                )
                showPopover = false
              } else {
                console.error(
                  '[CopyTranscriptIcon] Failed to open Gemini:',
                  response?.error,
                )
              }
            },
          )
          return
        }

        alert('Failed to extract transcript. Please try again.')
        return
      }

      // getTimestampedTranscript() already includes <title>, so wrap with <transcript>
      const fullContent = `<transcript>${transcript.trim()}</transcript>`
      console.log(
        `[CopyTranscriptIcon] Timestamped transcript extracted: ${fullContent.length} characters`,
      )

      // Send simple message to background script
      chrome.runtime.sendMessage(
        {
          type: `SUMMARIZE_ON_${provider.toUpperCase()}`,
          transcript: fullContent,
        },
        (response) => {
          if (response && response.success) {
            console.log(
              `[CopyTranscriptIcon] ${provider} tab opened successfully`,
            )
            showPopover = false // Hide popover after success
          } else {
            console.error(
              `[CopyTranscriptIcon] Failed to open ${provider}:`,
              response?.error,
            )
          }
        },
      )
    } catch (error) {
      console.error(
        `[CopyTranscriptIcon] Error in ${provider} summarization:`,
        error,
      )
    } finally {
      loadingStates[provider] = false
    }
  }

  const handleTogglePopover = (event) => {
    event.stopPropagation()
    showPopover = !showPopover
  }

  const handleClickOutside = (event) => {
    if (wrapElement && !wrapElement.contains(event.target)) {
      showPopover = false
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  })
</script>

<!-- @ts-nocheck -->
{#snippet spinner()}
  <svg class="copy-transcript-spinner" viewBox="0 0 24 24" fill="none">
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-dasharray="31.416"
      stroke-dashoffset="31.416"
    >
      <animate
        attributeName="stroke-dasharray"
        dur="2s"
        values="0 31.416;15.708 15.708;0 31.416"
        repeatCount="indefinite"
      />
      <animate
        attributeName="stroke-dashoffset"
        dur="2s"
        values="0;-15.708;-31.416"
        repeatCount="indefinite"
      />
    </circle>
  </svg>
{/snippet}

<div class="summarizerrrr-wrap" bind:this={wrapElement}>
  <button
    class="summarizerrrr-btn"
    onclick={handleTogglePopover}
    aria-label="summarizerrrr"
  >
    <span class="summarizerrrr-tooltip {showPopover ? 'hidden-tooltip' : ''}"
      >Summarizerrrr</span
    >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
      ><circle cx="10" cy="10" r="9.5" stroke="#fff" /><path
        fill="#fff"
        d="m10 17 .483-1.932a6.3 6.3 0 0 1 4.585-4.585L17 10l-1.932-.483a6.3 6.3 0 0 1-4.585-4.585L10 3l-.483 1.932a6.3 6.3 0 0 1-4.583 4.585L3 10l1.934.483a6.3 6.3 0 0 1 4.583 4.585L10 17Z"
      /></svg
    >
  </button>
  {#if showPopover}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="summarizerrrr-popover visible"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="summarizerrrr-background">
        {#if !currentHasTranscript}
          <!-- No transcript notice -->
          <div class="no-transcript-notice">
            <span>No transcript available, please try</span>
          </div>

          <!-- Only Gemini button when no transcript -->
          <button
            class="summarizerrrr-btn-item gemini-highlight"
            title="Summarize on Gemini (with YouTube URL)"
            aria-label="Summarize on Gemini"
            onclick={() => handleSummarizeOnAI('gemini')}
            disabled={loadingStates.gemini}
          >
            {#if loadingStates.gemini}
              {@render spinner()}
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M21.996 12.018a10.65 10.65 0 0 0-9.98 9.98h-.04c-.32-5.364-4.613-9.656-9.976-9.98v-.04c5.363-.32 9.656-4.613 9.98-9.976h.04c.324 5.363 4.617 9.656 9.98 9.98v.036z"
                />
              </svg>
            {/if}
            Summarize on Gemini
          </button>
        {:else}
          <!-- Full menu when transcript is available -->
          <button
            class="summarizerrrr-btn-item"
            title="Download as SRT"
            aria-label="Download as SRT"
            onclick={handleDownloadSRT}
            disabled={loadingStates.downloadSRT}
          >
            {#if loadingStates.downloadSRT}
              {@render spinner()}
            {:else}
              <svg class="copy-transcript-icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2z"
                  fill="currentColor"
                />
                <path
                  d="M13 12.67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"
                  fill="currentColor"
                />
              </svg>
            {/if}
            Download as SRT
          </button>
          <button
            class="copy-transcript-btn summarizerrrr-btn-item"
            title="Copy Transcript"
            aria-label="Copy Transcript"
            onclick={handleCopyTranscript}
            disabled={isLoading}
          >
            {#if isLoading}
              {@render spinner()}
            {:else}
              <svg class="copy-transcript-icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                  fill="currentColor"
                />
              </svg>
            {/if}
            Copy transcript
          </button>

          <button
            class="summarizerrrr-btn-item"
            title="Copy Transcript with Timestamp"
            aria-label="Copy Transcript with Timestamp"
            onclick={handleCopyTranscriptWithTimestamp}
            disabled={loadingStates.copyWithTimestamp}
          >
            {#if loadingStates.copyWithTimestamp}
              {@render spinner()}
            {:else}
              <svg class="copy-transcript-icon" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"
                  fill="currentColor"
                />
                <path
                  d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
                  fill="currentColor"
                />
              </svg>
            {/if}
            Copy transcript with timestamp
          </button>

          <button
            class="summarizerrrr-btn-item"
            title="Summarize on Gemini"
            aria-label="Summarize on Gemini"
            onclick={() => handleSummarizeOnAI('gemini')}
            disabled={loadingStates.gemini}
          >
            {#if loadingStates.gemini}
              {@render spinner()}
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M21.996 12.018a10.65 10.65 0 0 0-9.98 9.98h-.04c-.32-5.364-4.613-9.656-9.976-9.98v-.04c5.363-.32 9.656-4.613 9.98-9.976h.04c.324 5.363 4.617 9.656 9.98 9.98v.036z"
                />
              </svg>
            {/if}
            Summarize on Gemini
          </button>

          <button
            class="summarizerrrr-btn-item"
            title="Summarize on ChatGPT"
            aria-label="Summarize on ChatGPT"
            onclick={() => handleSummarizeOnAI('chatgpt')}
            disabled={loadingStates.chatgpt}
          >
            {#if loadingStates.chatgpt}
              {@render spinner()}
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="m14.805 10.432l.375-.65zm-8.162-5.32l-.65-.374zm6.18-1.656l.375-.65zm2.463.46v-.75zm4.525 4.525h.75zm.832 2.363l.65-.375zm-1.656 6.182l.375.65zm-1.63 1.901l.65.375zm-6.18 1.657l-.375.65zm-2.463-.46v.75zM4.19 15.559h-.75zm-.832-2.363l-.65.375zm1.656-6.18l-.375-.65zm10.117-.01l.374-.65l-.374-.216l-.376.216zm2.76 5.207h.75v-.433l-.375-.216zM9.195 6.817l-.375-.65a.75.75 0 0 0-.375.65zm5.61 10.364l.375.65a.75.75 0 0 0 .375-.65zm-5.845-.134l-.375.649a.75.75 0 0 0 .75 0zM6.11 11.89h-.75a.75.75 0 0 0 .374.65zM12 8.812l-.375.65l2.805 1.62l.375-.65l.375-.65l-2.805-1.62zm2.805 1.62h-.75v3.24h1.5v-3.24zm0 3.24l-.375-.65l-2.805 1.62l.375.65l.375.649l2.805-1.62zM12 15.292l.375-.65l-2.805-1.62l-.375.65l-.375.65l2.805 1.619zm-2.805-1.62h.75v-3.24h-1.5v3.24zm0-3.24l.375.65l2.805-1.62l-.375-.65l-.375-.65l-2.805 1.62zm-2.552-5.32l.65.376a3.775 3.775 0 0 1 5.155-1.382l.375-.65l.375-.65a5.275 5.275 0 0 0-7.205 1.932zm6.18-1.656l-.375.65q.441.256.786.603l.53-.53l.53-.53a5.3 5.3 0 0 0-1.096-.842zm.941.723l.252.706a3.8 3.8 0 0 1 1.27-.219v-1.5c-.621 0-1.219.108-1.774.307zm1.522-.263v.75a3.775 3.775 0 0 1 3.775 3.775h1.5a5.275 5.275 0 0 0-5.275-5.275zm4.525 4.525h-.75q-.002.511-.13.983l.724.194l.724.195a5.3 5.3 0 0 0 .182-1.372zm-.156 1.177l-.486.572c.321.272.602.603.825.99l.65-.376l.649-.375a5.3 5.3 0 0 0-1.152-1.382zm.988 1.186l-.65.375a3.775 3.775 0 0 1-1.381 5.157l.375.65l.375.65a5.275 5.275 0 0 0 1.93-7.207zm-1.656 6.182l-.375-.65c-.293.17-.6.293-.916.377l.194.725l.194.725c.435-.117.866-.29 1.277-.528zm-1.097.452l-.738-.135a3.8 3.8 0 0 1-.444 1.21l.65.374l.649.375c.31-.538.515-1.11.62-1.69zm-.533 1.45l-.65-.376a3.775 3.775 0 0 1-5.155 1.382l-.375.65l-.375.65a5.275 5.275 0 0 0 7.205-1.932zm-6.18 1.656l.375-.65a3.8 3.8 0 0 1-.787-.604l-.53.53l-.532.53c.32.32.688.606 1.099.843zm-.943-.724l-.252-.706a3.8 3.8 0 0 1-1.268.22v1.5a5.3 5.3 0 0 0 1.772-.308zm-1.52.264v-.75a3.775 3.775 0 0 1-3.775-3.775h-1.5a5.275 5.275 0 0 0 5.275 5.275zM4.19 15.559h.75q.001-.512.13-.983l-.725-.194l-.724-.195a5.3 5.3 0 0 0-.18 1.372zm.155-1.177l.486-.572c-.32-.272-.6-.603-.823-.99l-.65.376l-.65.375c.31.537.703 1 1.151 1.382zm-.987-1.186l.65-.375a3.774 3.774 0 0 1 1.38-5.156l-.374-.65l-.375-.65a5.274 5.274 0 0 0-1.93 7.206zm1.656-6.18l.375.649a3.8 3.8 0 0 1 .915-.38l-.194-.724l-.194-.725a5.3 5.3 0 0 0-1.277.53zm1.096-.455l.738.135c.075-.413.222-.821.445-1.208l-.649-.375l-.65-.375a5.3 5.3 0 0 0-.622 1.688zM12 8.812l.375.65l1.565-.903l1.565-.904l-.376-.65l-.374-.649l-1.565.903l-1.565.904zm2.805 1.62l-.375.65l3.085 1.78l.375-.649l.375-.65l-3.085-1.78zm3.085 7.006h.75v-5.225h-1.5v5.225zm-8.695-7.006h.75V6.817h-1.5v3.615zm5.61 3.24h-.75v3.509h1.5v-3.51zM12 15.292l-.375-.65l-3.04 1.755l.375.65l.375.649l3.04-1.755zM6.11 6.56h-.75v5.33h1.5V6.56zm3.085 7.11l.375-.649l-3.086-1.781l-.375.65l-.375.649L8.82 14.32zm5.935-6.665l-.376.65l4.526 2.612l.375-.65l.375-.65l-4.526-2.612zm-5.935-.189l.375.65l4.57-2.639l-.376-.65l-.375-.649l-4.57 2.639zm1.04 13.003l.374.65l4.571-2.64l-.375-.65l-.375-.649l-4.57 2.64zm-5.89-5.438l-.376.65l4.616 2.664l.375-.65l.375-.649l-4.616-2.665z"
                />
              </svg>
            {/if}
            Summarize on ChatGPT
          </button>

          <button
            class="summarizerrrr-btn-item"
            title="Summarize on Perplexity"
            aria-label="Summarize on Perplexity"
            onclick={() => handleSummarizeOnAI('perplexity')}
            disabled={loadingStates.perplexity}
          >
            {#if loadingStates.perplexity}
              {@render spinner()}
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 16 16"
              >
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  d="M8 .188a.5.5 0 0 1 .503.5V4.03l3.022-2.92l.059-.048a.51.51 0 0 1 .49-.054a.5.5 0 0 1 .306.46v3.247h1.117l.1.01a.5.5 0 0 1 .403.49v5.558a.5.5 0 0 1-.503.5H12.38v3.258a.5.5 0 0 1-.312.462a.51.51 0 0 1-.55-.11l-3.016-3.018v3.448c0 .275-.225.5-.503.5a.5.5 0 0 1-.503-.5v-3.448l-3.018 3.019a.51.51 0 0 1-.548.11a.5.5 0 0 1-.312-.463v-3.258H2.503a.5.5 0 0 1-.503-.5V5.215l.01-.1c.047-.229.25-.4.493-.4H3.62V1.469l.006-.074a.5.5 0 0 1 .302-.387a.51.51 0 0 1 .547.102l3.023 2.92V.687c0-.276.225-.5.503-.5M4.626 9.333v3.984l2.87-2.872v-4.01zm3.877 1.113l2.871 2.871V9.333l-2.87-2.897zm3.733-1.668a.5.5 0 0 1 .145.35v1.145h.612V5.715H9.201zm-9.23 1.495h.613V9.13c0-.131.052-.257.145-.35l3.033-3.064h-3.79zm1.62-5.558H6.76L4.626 2.652zm4.613 0h2.134V2.652z"
                />
              </svg>
            {/if}
            Summarize on Perplexity
          </button>

          <button
            class="summarizerrrr-btn-item"
            title="Summarize on Grok"
            aria-label="Summarize on Grok"
            onclick={() => handleSummarizeOnAI('grok')}
            disabled={loadingStates.grok}
          >
            {#if loadingStates.grok}
              {@render spinner()}
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                width="24"
                height="24"
                fill-rule="evenodd"
                viewBox="0 0 24 24"
                ><path
                  d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815"
                /></svg
              >
            {/if}
            Summarize on Grok
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
