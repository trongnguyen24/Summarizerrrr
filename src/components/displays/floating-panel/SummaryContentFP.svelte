<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import 'highlight.js/styles/github-dark.css'
  import TocMobile from '@/components/navigation/TOCMobile.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import { processThinkTags } from '@/lib/utils/thinkTagProcessor.js'

  let { summary, isLoading, targetId, showTOC = false, error } = $props()

  let parsedContent = $state('')
  let container = $state()

  function parseMarkdown() {
    if (summary) {
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
            summary
          )
          parsedContent = marked.parse(String(summary || ''))
          return
        }

        const processedSummary = processThinkTags(summary)
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
    overflow: hidden;
  }
</style>
