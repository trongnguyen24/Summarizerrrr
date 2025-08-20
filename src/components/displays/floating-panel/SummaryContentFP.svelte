<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import 'highlight.js/styles/github-dark.css'
  import { settings } from '@/stores/settingsStore.svelte.js'

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
      parsedContent = marked.parse(summary)
    }
  }

  $effect(() => {
    parseMarkdown()
  })

  $effect(() => {
    if (parsedContent && container) {
      container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
</script>

<div id={targetId}>
  {#if isLoading}
    <div class="loading-skeleton">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>
  {:else if error}
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

<style>
  .prose {
    max-width: none;
  }
  .loading-skeleton {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .skeleton-line {
    height: 1rem;
    background-color: #e0e0e0;
    border-radius: 4px;
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .skeleton-line:nth-child(1) {
    width: 90%;
  }
  .skeleton-line:nth-child(2) {
    width: 100%;
  }
  .skeleton-line:nth-child(3) {
    width: 60%;
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
</style>
