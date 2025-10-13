<!-- @ts-nocheck -->
<script>
  import { MessageBasedTranscriptExtractor } from '../../entrypoints/content/extractors/MessageBasedTranscriptExtractor.js'
  import './styles/copy-transcript-button.css'
  import { onMount } from 'svelte'

  let isLoading = $state(false)
  let isGeminiLoading = $state(false)
  let isChatGPTLoading = $state(false)
  let showPopover = $state(false)
  let wrapElement = $state()

  const handleCopyTranscript = async () => {
    if (isLoading) return

    isLoading = true
    try {
      const transcriptExtractor = new MessageBasedTranscriptExtractor('en')
      const transcript = await transcriptExtractor.getPlainTranscript()

      if (transcript && transcript.trim().length > 0) {
        await navigator.clipboard.writeText(transcript.trim())
        console.log('Transcript copied to clipboard')
      } else {
        console.log('No transcript available to copy')
      }
    } catch (error) {
      console.error('Error copying transcript:', error)
    } finally {
      isLoading = false
    }
  }

  const handleSummarizeOnGemini = async () => {
    if (isGeminiLoading) return

    isGeminiLoading = true
    try {
      console.log('[CopyTranscriptIcon] Starting Gemini summarization...')

      // Get transcript
      const transcriptExtractor = new MessageBasedTranscriptExtractor('en')
      const transcript = await transcriptExtractor.getPlainTranscript()

      if (!transcript || transcript.trim().length === 0) {
        console.warn('[CopyTranscriptIcon] No transcript available')
        return
      }

      console.log(
        `[CopyTranscriptIcon] Transcript extracted: ${transcript.length} characters`
      )

      // Send simple message to background script
      chrome.runtime.sendMessage(
        {
          type: 'SUMMARIZE_ON_GEMINI',
          transcript: transcript.trim(),
        },
        (response) => {
          if (response && response.success) {
            console.log('[CopyTranscriptIcon] Gemini tab opened successfully')
            showPopover = false // Hide popover after success
          } else {
            console.error(
              '[CopyTranscriptIcon] Failed to open Gemini:',
              response?.error
            )
          }
        }
      )
    } catch (error) {
      console.error(
        '[CopyTranscriptIcon] Error in Gemini summarization:',
        error
      )
    } finally {
      isGeminiLoading = false
    }
  }

  const handleSummarizeOnChatGPT = async () => {
    if (isChatGPTLoading) return

    isChatGPTLoading = true
    try {
      console.log('[CopyTranscriptIcon] Starting ChatGPT summarization...')

      // Get transcript
      const transcriptExtractor = new MessageBasedTranscriptExtractor('en')
      const transcript = await transcriptExtractor.getPlainTranscript()

      if (!transcript || transcript.trim().length === 0) {
        console.warn('[CopyTranscriptIcon] No transcript available')
        return
      }

      console.log(
        `[CopyTranscriptIcon] Transcript extracted: ${transcript.length} characters`
      )

      // Send simple message to background script
      chrome.runtime.sendMessage(
        {
          type: 'SUMMARIZE_ON_CHATGPT',
          transcript: transcript.trim(),
        },
        (response) => {
          if (response && response.success) {
            console.log('[CopyTranscriptIcon] ChatGPT tab opened successfully')
            showPopover = false // Hide popover after success
          } else {
            console.error(
              '[CopyTranscriptIcon] Failed to open ChatGPT:',
              response?.error
            )
          }
        }
      )
    } catch (error) {
      console.error(
        '[CopyTranscriptIcon] Error in ChatGPT summarization:',
        error
      )
    } finally {
      isChatGPTLoading = false
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

<div class="summarizerrrr-wrap" bind:this={wrapElement}>
  <button
    class="summarizerrrr-btn"
    onclick={handleTogglePopover}
    aria-label="summarizerrrr"
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
        <button
          class="copy-transcript-btn summarizerrrr-btn-item"
          title="Copy Transcript"
          aria-label="Copy Transcript"
          onclick={handleCopyTranscript}
          disabled={isLoading}
        >
          {#if isLoading}
            <svg
              class="copy-transcript-spinner"
              viewBox="0 0 24 24"
              fill="none"
            >
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
          title="Summarize on Gemini"
          aria-label="Summarize on Gemini"
          onclick={handleSummarizeOnGemini}
          disabled={isGeminiLoading}
        >
          {#if isGeminiLoading}
            <svg
              class="copy-transcript-spinner"
              viewBox="0 0 24 24"
              fill="none"
            >
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
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 16 16"
              ><path
                fill="#448aff"
                d="M15 8.014A7.457 7.457 0 0 0 8.014 15h-.028A7.456 7.456 0 0 0 1 8.014v-.028A7.456 7.456 0 0 0 7.986 1h.028A7.457 7.457 0 0 0 15 7.986z"
              /></svg
            >
          {/if}
          Summarize on Gemini
        </button>

        <button
          class="summarizerrrr-btn-item"
          title="Summarize on ChatGPT"
          aria-label="Summarize on ChatGPT"
          onclick={handleSummarizeOnChatGPT}
          disabled={isChatGPTLoading}
        >
          {#if isChatGPTLoading}
            <svg
              class="copy-transcript-spinner"
              viewBox="0 0 24 24"
              fill="none"
            >
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
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zm-2.3751-7.2328a4.5006 4.5006 0 0 1 2.3257-1.9752V11.6a.7783.7783 0 0 0 .3927.6813l5.8359 3.3685-2.02 1.1686a.0757.0757 0 0 1-.071 0L8.458 15.6212a4.5 4.5 0 0 1-1.9893-5.5925zm16.5068 3.8838l-5.8428-3.3685L18.4598 8.68a.0757.0757 0 0 1 .071 0l4.8955 2.8248a4.5118 4.5118 0 0 1-.6772 8.1079v-2.6107a.7825.7825 0 0 0-.3927-.6813zm2.0107-3.0231l-.142-.0852L14.8909 9.6a.7712.7712 0 0 0-.7806 0L8.2675 12.9685V10.636a.0804.0804 0 0 1 .0332-.0615l4.8638-2.8094a4.5 4.5 0 0 1 6.6802 4.66zm-12.14 4.4947l-2.02-1.1686a.071.071 0 0 1-.038-.052V9.86a4.4944 4.4944 0 0 1 7.3665-3.4375l-.142.0804L9.46 9.174a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9996l-2.6069 1.4998-2.602-1.4998z"
                fill="#10a37f"
              />
            </svg>
          {/if}
          Summarize on ChatGPT
        </button>
      </div>
    </div>
  {/if}
</div>
