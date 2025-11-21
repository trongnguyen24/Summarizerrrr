<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import 'highlight.js/styles/github-dark.css'
  import TocMobile from '@/components/navigation/TOCMobile.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import { processThinkTags } from '@/lib/utils/thinkTagProcessor.js'
  import { processTimestamps } from '@/lib/utils/timestampProcessor.js'

  let { summary, isLoading, targetId, showTOC = false, error } = $props()

  let parsedContent = $state('')
  let container = $state()

  function parseMarkdown() {
    if (summary) {
      const renderer = new marked.Renderer()
      const originalLink = renderer.link.bind(renderer)

      renderer.link = ({ href, title, text }) => {
        if (href && href.startsWith('timestamp:')) {
          // Match the UI of TimestampLink.svelte
          return `
            <a href="${href}" title="Jump to ${text}" class="timestamp-link flex w-fit items-center font-medium rounded-md bg-blackwhite/5 text-text-primary mb-2 font-mono hover:bg-blackwhite/10 transition-colors cursor-pointer no-underline border border-border">
              <span class="border-r w-full py-1 px-2 text-base border-border">${text}</span>
              <span class="flex justify-center shrink-0 items-center w-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide text-primary lucide-play">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </span>
            </a>
          `
        }
        return originalLink.call(renderer, { href, title, text })
      }

      marked.use({ renderer })
      marked.setOptions({
        highlight: function (code, lang) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext'
          return hljs.highlight(code, { language }).value
        },
      })

      try {
        // Process <think> tags before parsing markdown with error handling
        if (typeof summary !== 'string') {
          console.warn(
            'SummaryContentFP: summary is not a string:',
            typeof summary,
            summary,
          )
          parsedContent = marked.parse(String(summary || ''))
          return
        }

        let processedSummary = processThinkTags(summary)
        processedSummary = processTimestamps(processedSummary)
        parsedContent = marked.parse(processedSummary)
      } catch (error) {
        console.warn('SummaryContentFP: Think tag processing error:', error)
        // Fallback to original content if processing fails
        parsedContent = marked.parse(summary)
      }
    }
  }

  $effect(() => {
    parseMarkdown()
  })

  $effect(() => {
    if (parsedContent && container) {
      // Highlight code blocks in main content and think sections
      container
        .querySelectorAll('pre code, .think-content pre code')
        .forEach((block) => {
          hljs.highlightElement(block)
        })
    }
  })

  function handleContentClick(event) {
    const link = event.target.closest('a')
    if (!link) return

    const href = link.getAttribute('href')
    if (href && href.startsWith('timestamp:')) {
      event.preventDefault()
      const seconds = parseFloat(href.split(':')[1])

      if (!isNaN(seconds)) {
        // Dispatch event directly since we are already in the content script context
        // This communicates with youtube_player_control.js in the Main World
        const customEvent = new CustomEvent('Summarizerrrr_Seek', {
          detail: { seconds: seconds },
        })
        window.dispatchEvent(customEvent)
      }
    }
  }
</script>

<div id={targetId}>
  {#if error}
    <div class="error-message">
      <h4>Error</h4>
      <p>{error.message || 'An unexpected error occurred.'}</p>
    </div>
  {:else if parsedContent}
    <div
      id="fp-generic-summary"
      style="font-size: 16px;"
      bind:this={container}
      class="prose"
      onclick={handleContentClick}
      role="presentation"
    >
      {@html parsedContent}
    </div>
  {:else}
    <!-- <p>No summary available.</p> -->
  {/if}
</div>
{#if showTOC}
  <TocMobile targetDivId={targetId} />
{/if}

<style>
  .prose {
    max-width: none;
  }

  .error-message {
    color: #ef4444;
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    padding: 1rem;
    border-radius: 8px;
  }

  .error-message h4 {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Think section styling */
  :global(.think-section) {
    opacity: 0.75;
    margin-bottom: 1em;
    overflow: hidden;
  }
</style>
