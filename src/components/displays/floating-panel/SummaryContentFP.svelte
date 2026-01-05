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

  // Font size levels in em units for shadow DOM
  const fontSizeLevels = [0.875, 1, 1.125, 1.25] // 14px, 16px, 18px, 20px at base 16px

  const fontMap = {
    default: 'font-default',
    'noto-serif': 'font-noto-serif',
    opendyslexic: 'font-opendyslexic',
    mali: 'font-mali',
  }

  let parsedContent = $state('')
  let container = $state()

  function parseMarkdown() {
    if (summary) {
      // Create custom renderer for marked v15+ compatible
      const renderer = {
        link({ href, title, text }) {
          if (href && href.startsWith('timestamp:')) {
            // Match the UI of TimestampLink.svelte
            return `
              &nbsp;<a href="${href}" title="Jump to ${text}" class="ttimestamp-link inline-flex text-muted w-fit group items-baseline font-normal rounded-md text-text-muted hover:text-primary font-mono transition-colors cursor-pointer no-underline">
                <span class="flex relative rounded-full overflow-hidden self-center justify-center shrink-0 items-center w-6 h-6">
                  <span class="absolute top-0 left-0 h-full bg-blackwhite/5 w-full group-hover:translate-x-0 -translate-x-full group-hover:bg-primary/10 group-hover:rounded-full transition-all duration-300 ease-in-out"></span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play">
                    <polygon points="6 3 20 12 6 21 6 3" />
                  </svg>
                </span>
                <span class="w-full px-1">${text}</span>
              </a>
            `
          }
          // Return false to use default link rendering
          return false
        },
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

  import { seekToTimestamp } from '@/lib/utils/videoSeeker.js'

  function handleContentClick(event) {
    const link = event.target.closest('a')
    if (!link) return

    const href = link.getAttribute('href')
    if (href && href.startsWith('timestamp:')) {
      event.preventDefault()
      const seconds = parseFloat(href.split(':')[1])

      if (!isNaN(seconds)) {
        seekToTimestamp(seconds)
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
      style="font-size: {fontSizeLevels[settings.fontSizeIndex]}em;"
      bind:this={container}
      class="prose markdown-container-v2 {fontMap[settings.selectedFont]}"
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

  /* === Table Styling - Horizontal Scroll === */
  .markdown-container-v2 :global(table) {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    border: 1px solid var(--color-border);
    border-radius: 0.5em;
    padding: 0.5em 0;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  .markdown-container-v2 :global(table thead),
  .markdown-container-v2 :global(table tbody),
  .markdown-container-v2 :global(table tr) {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  .markdown-container-v2 :global(table:hover) {
    scrollbar-color: var(--color-border) transparent;
  }

  .markdown-container-v2 :global(table::-webkit-scrollbar) {
    height: 6px;
    background: transparent;
  }

  .markdown-container-v2 :global(table::-webkit-scrollbar-track) {
    background: transparent;
  }

  .markdown-container-v2 :global(table::-webkit-scrollbar-thumb) {
    background: transparent;
    border-radius: 3px;
  }

  .markdown-container-v2 :global(table:hover::-webkit-scrollbar-thumb) {
    background: var(--color-border);
  }

  .markdown-container-v2 :global(th) {
    min-width: 100px;
    white-space: nowrap;
  }

  .markdown-container-v2 :global(td) {
    min-width: 80px;
  }

  .markdown-container-v2 :global(th:first-child),
  .markdown-container-v2 :global(td:first-child) {
    padding-left: 0.5em;
  }

  .markdown-container-v2 :global(th:last-child),
  .markdown-container-v2 :global(td:last-child) {
    padding-right: 0.5em;
  }
</style>
