<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'

  /**
   * Props của component - Hybrid approach với AI SDK v5 smoothing
   * @type {{
   *   sourceMarkdown: string;
   *   class?: string;
   *   onFinishTyping?: () => void;
   *   enableCursor?: boolean;
   *   enableHighlight?: boolean;
   * }}
   */
  let {
    sourceMarkdown, // BẮT BUỘC: Chuỗi markdown từ smoothing stream
    class: className = '', // TÙY CHỌN: CSS classes
    onFinishTyping, // Callback khi hoàn thành
    enableCursor = true, // TÙY CHỌN: Hiển thị cursor animation
    enableHighlight = true, // TÙY CHỌN: Enable code highlighting
  } = $props()

  // === State nội bộ ===
  let container = $state()
  let parsedHtml = $state('')
  let isStreaming = $state(true)
  let parseTimeout = null

  // Cache cho highlighted code blocks
  const highlightCache = new Map()
  let highlightTimeout = null
  const highlightedElements = new Set()

  // Debounced markdown parsing - tối ưu cho smoothing streams
  function debouncedParse(markdown, delay = 8) {
    // Faster parsing cho smoothing streams
    clearTimeout(parseTimeout)
    parseTimeout = setTimeout(() => {
      try {
        parsedHtml = marked.parse(markdown)
      } catch (error) {
        console.warn('Markdown parse error:', error)
        parsedHtml = markdown // Fallback
      }
    }, delay)
  }

  // Configure marked với optimized settings cho smoothing
  marked.setOptions({
    highlight: function (code, lang) {
      if (!enableHighlight) return code

      const cacheKey = `${lang}:${code.substring(0, 50)}`

      if (highlightCache.has(cacheKey)) {
        return highlightCache.get(cacheKey)
      }

      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      const result = hljs.highlight(code, { language }).value

      // Manage cache size
      if (highlightCache.size > 50) {
        const firstKey = highlightCache.keys().next().value
        highlightCache.delete(firstKey)
      }
      highlightCache.set(cacheKey, result)

      return result
    },
    langPrefix: 'hljs language-',
    breaks: true,
    gfm: true,
  })

  // Optimized highlight function cho smoothing streams
  function scheduleHighlight() {
    if (!enableHighlight) return

    clearTimeout(highlightTimeout)
    highlightTimeout = setTimeout(() => {
      if (container) {
        const codeBlocks = Array.from(
          container.querySelectorAll('pre code:not(.hljs)')
        ).filter((el) => !highlightedElements.has(el))

        // Batch processing với smaller delays cho smoothing
        let index = 0
        function processNext() {
          if (index < codeBlocks.length) {
            const element = codeBlocks[index]
            try {
              hljs.highlightElement(element)
              highlightedElements.add(element)
            } catch (error) {
              console.warn('Highlight error:', error)
            }
            index++

            if (index < codeBlocks.length) {
              requestAnimationFrame(processNext)
            }
          }
        }

        if (codeBlocks.length > 0) {
          requestAnimationFrame(processNext)
        }
      }
    }, 50) // Reduced debounce cho smoothing
  }

  // Simplified completion detection
  let hasCalledFinish = false
  let completionTimeout = null

  function markComplete() {
    if (!hasCalledFinish) {
      hasCalledFinish = true
      isStreaming = false
      console.log(
        '[StreamingMarkdownV2] Marking complete, calling onFinishTyping'
      )
      if (onFinishTyping) {
        onFinishTyping()
      }
    }
  }

  function scheduleCompletion() {
    clearTimeout(completionTimeout)
    if (sourceMarkdown && sourceMarkdown.length > 0) {
      completionTimeout = setTimeout(() => {
        markComplete()
      }, 500) // Wait 500ms after last change
    }
  }

  // Effect để parse markdown khi sourceMarkdown thay đổi
  $effect(() => {
    if (sourceMarkdown) {
      debouncedParse(sourceMarkdown)
      scheduleCompletion()
    } else {
      parsedHtml = ''
      isStreaming = true
      hasCalledFinish = false
      highlightedElements.clear()
      clearTimeout(completionTimeout)
    }
  })

  // Effect để highlight sau khi parse
  $effect(() => {
    if (parsedHtml && container) {
      scheduleHighlight()
    }
  })

  // Immediate completion for non-cursor mode
  $effect(() => {
    if (sourceMarkdown && !enableCursor) {
      setTimeout(() => {
        markComplete()
      }, 100)
    }
  })

  // Cleanup
  $effect(() => {
    return () => {
      if (highlightTimeout) clearTimeout(highlightTimeout)
      if (parseTimeout) clearTimeout(parseTimeout)
      if (completionTimeout) clearTimeout(completionTimeout)
      highlightCache.clear()
    }
  })
</script>

<div
  bind:this={container}
  class="markdown-container-v2 {isStreaming && enableCursor
    ? 'blinking-cursor'
    : ''} {className}"
>
  {@html parsedHtml}
</div>

<style>
  .markdown-container-v2 {
    /* Smooth transitions cho AI SDK smoothing */
    transition: opacity 0.2s ease-in-out;
  }

  /* CSS để tạo con trỏ nhấp nháy được tối ưu */
  .blinking-cursor::after {
    content: '✢';
    display: block;
    margin: auto;
    text-align: center !important;
    /* Sử dụng transform thay vì thay đổi content để tối ưu hiệu năng */
    animation: cyberpunk-blink 1.2s linear infinite;

    color: var(--cursor-color, #333);
    /* GPU acceleration */
    will-change: transform;
    transform: translateZ(0);
  }

  /* Optimized keyframes - giảm số frame để tối ưu hiệu năng */
  @keyframes cyberpunk-blink {
    0%,
    10% {
      content: '×';
    }
    15% {
      content: '✢';
    }
    25% {
      content: '✣';
    }
    35% {
      content: '✥';
    }
    45% {
      content: '✶';
    }
    55% {
      content: '❉';
    }
    65% {
      content: '❆';
    }
    75% {
      content: '✺';
    }
    85% {
      content: '❃';
    }
    95%,
    100% {
      content: '✽';
    }
  }

  /* Enhanced markdown styling */
  .markdown-container-v2 :global(h1),
  .markdown-container-v2 :global(h2),
  .markdown-container-v2 :global(h3) {
    transition: all 0.3s ease-in-out;
  }

  .markdown-container-v2 :global(pre) {
    border-radius: 8px;
    transition: background-color 0.2s ease-in-out;
  }

  .markdown-container-v2 :global(code) {
    transition: all 0.2s ease-in-out;
  }
</style>
