<!-- @ts-nocheck -->
<script>
  import { MessageBasedTranscriptExtractor } from '../../entrypoints/content/extractors/MessageBasedTranscriptExtractor.js'
  import './styles/floating-ui.css'
  import './styles/copy-transcript-button.css'
  let isLoading = false

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
</script>

<div class="summarizerrrr-btn">
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
    ><circle cx="10" cy="10" r="9.5" stroke="#fff" /><path
      fill="#fff"
      d="m10 17 .483-1.932a6.3 6.3 0 0 1 4.585-4.585L17 10l-1.932-.483a6.3 6.3 0 0 1-4.585-4.585L10 3l-.483 1.932a6.3 6.3 0 0 1-4.583 4.585L3 10l1.934.483a6.3 6.3 0 0 1 4.583 4.585L10 17Z"
    /></svg
  >
  <div class="summarizerrrr-popover">
    <div class="summarizerrrr-background">
      <button
        class="copy-transcript-btn"
        title="Copy Transcript"
        aria-label="Copy Transcript"
        onclick={handleCopyTranscript}
        disabled={isLoading}
      >
        {#if isLoading}
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
        class="copy-transcript-btn"
        title="Summarize on Gemini"
        aria-label="Summarize on Gemini"
        onclick={handleCopyTranscript}
        disabled={isLoading}
      >
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
        Summarize on Gemini
      </button>
    </div>
  </div>
</div>
