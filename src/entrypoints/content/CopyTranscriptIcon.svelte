<script>
  import { MessageBasedTranscriptExtractor } from '../../entrypoints/content/extractors/MessageBasedTranscriptExtractor.js'
  import './styles/copy-transcript-button.css'
  import { onMount } from 'svelte'

  let { videoTitle = '' } = $props()
  let isLoading = $state(false)
  let isGeminiLoading = $state(false)
  let isChatGPTLoading = $state(false)
  let isPerplexityLoading = $state(false)
  let isGrokLoading = $state(false)
  let showPopover = $state(false)
  let wrapElement = $state()

  const handleCopyTranscript = async () => {
    if (isLoading) return

    isLoading = true
    try {
      const transcriptExtractor = new MessageBasedTranscriptExtractor('en')
      const transcript = await transcriptExtractor.getPlainTranscript()

      if (transcript && transcript.trim().length > 0) {
        const fullContent = `<title>${videoTitle}</title>\n\n<transcript>${transcript.trim()}</transcript>`
        await navigator.clipboard.writeText(fullContent)
        console.log('Transcript with title copied to clipboard')
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

      const fullContent = `<title>${videoTitle}</title>\n\n<transcript>${transcript.trim()}</transcript>`
      console.log(
        `[CopyTranscriptIcon] Transcript extracted: ${fullContent.length} characters`
      )

      // Send simple message to background script
      chrome.runtime.sendMessage(
        {
          type: 'SUMMARIZE_ON_GEMINI',
          transcript: fullContent,
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

      const fullContent = `<title>${videoTitle}</title>\n\n<transcript>${transcript.trim()}</transcript>`
      console.log(
        `[CopyTranscriptIcon] Transcript extracted: ${fullContent.length} characters`
      )

      // Send simple message to background script
      chrome.runtime.sendMessage(
        {
          type: 'SUMMARIZE_ON_CHATGPT',
          transcript: fullContent,
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

  const handleSummarizeOnPerplexity = async () => {
    if (isPerplexityLoading) return

    isPerplexityLoading = true
    try {
      console.log('[CopyTranscriptIcon] Starting Perplexity summarization...')

      // Get transcript
      const transcriptExtractor = new MessageBasedTranscriptExtractor('en')
      const transcript = await transcriptExtractor.getPlainTranscript()

      if (!transcript || transcript.trim().length === 0) {
        console.warn('[CopyTranscriptIcon] No transcript available')
        return
      }

      const fullContent = `<title>${videoTitle}</title>\n\n<transcript>${transcript.trim()}</transcript>`
      console.log(
        `[CopyTranscriptIcon] Transcript extracted: ${fullContent.length} characters`
      )

      // Send simple message to background script
      chrome.runtime.sendMessage(
        {
          type: 'SUMMARIZE_ON_PERPLEXITY',
          transcript: fullContent,
        },
        (response) => {
          if (response && response.success) {
            console.log(
              '[CopyTranscriptIcon] Perplexity tab opened successfully'
            )
            showPopover = false // Hide popover after success
          } else {
            console.error(
              '[CopyTranscriptIcon] Failed to open Perplexity:',
              response?.error
            )
          }
        }
      )
    } catch (error) {
      console.error(
        '[CopyTranscriptIcon] Error in Perplexity summarization:',
        error
      )
    } finally {
      isPerplexityLoading = false
    }
  }

  const handleSummarizeOnGrok = async () => {
    if (isGrokLoading) return

    isGrokLoading = true
    try {
      console.log('[CopyTranscriptIcon] Starting Grok summarization...')

      // Get transcript
      const transcriptExtractor = new MessageBasedTranscriptExtractor('en')
      const transcript = await transcriptExtractor.getPlainTranscript()

      if (!transcript || transcript.trim().length === 0) {
        console.warn('[CopyTranscriptIcon] No transcript available')
        return
      }

      const fullContent = `<title>${videoTitle}</title>\n\n<transcript>${transcript.trim()}</transcript>`
      console.log(
        `[CopyTranscriptIcon] Transcript extracted: ${fullContent.length} characters`
      )

      // Send simple message to background script
      chrome.runtime.sendMessage(
        {
          type: 'SUMMARIZE_ON_GROK',
          transcript: fullContent,
        },
        (response) => {
          if (response && response.success) {
            console.log('[CopyTranscriptIcon] Grok tab opened successfully')
            showPopover = false // Hide popover after success
          } else {
            console.error(
              '[CopyTranscriptIcon] Failed to open Grok:',
              response?.error
            )
          }
        }
      )
    } catch (error) {
      console.error('[CopyTranscriptIcon] Error in Grok summarization:', error)
    } finally {
      isGrokLoading = false
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
          title="Summarize on Gemini"
          aria-label="Summarize on Gemini"
          onclick={handleSummarizeOnGemini}
          disabled={isGeminiLoading}
        >
          {#if isGeminiLoading}
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
          onclick={handleSummarizeOnChatGPT}
          disabled={isChatGPTLoading}
        >
          {#if isChatGPTLoading}
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
          onclick={handleSummarizeOnPerplexity}
          disabled={isPerplexityLoading}
        >
          {#if isPerplexityLoading}
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
          onclick={handleSummarizeOnGrok}
          disabled={isGrokLoading}
        >
          {#if isGrokLoading}
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
      </div>
    </div>
  {/if}
</div>
