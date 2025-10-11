<!-- @ts-nocheck -->
<script>
  import { MessageBasedTranscriptExtractor } from '../../entrypoints/content/extractors/MessageBasedTranscriptExtractor.js'

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

<button
  class="copy-transcript-btn"
  title="Copy Transcript"
  aria-label="Copy Transcript"
  on:click={handleCopyTranscript}
  disabled={isLoading}
>
  {#if isLoading}
    <!-- Loading spinner -->
    <svg class="spinner" width="24" height="24" viewBox="0 0 24 24" fill="none">
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
    <!-- Copy icon -->
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
        fill="currentColor"
      />
    </svg>
  {/if}
</button>

<style>
  .copy-transcript-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 48px;
    background: transparent;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 24px;
    transition: all 0.2s ease;
    opacity: 0.9;
    margin: 0 4px;
  }

  .copy-transcript-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
    opacity: 1;
  }

  .copy-transcript-btn:active {
    background-color: rgba(255, 255, 255, 0.2);
  }

  .copy-transcript-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .copy-transcript-btn svg {
    width: 24px;
    height: 24px;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive adjustments for mobile */
  @media (max-width: 768px) {
    .copy-transcript-btn {
      width: 56px;
      height: 44px;
      margin: 0 2px;
    }

    .copy-transcript-btn svg {
      width: 20px;
      height: 20px;
    }
  }
</style>
