<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'

  /**
   * Props của component, sử dụng cú pháp Svelte 5
   * @type {{
   *   sourceMarkdown: string;
   *   speed?: number;
   *   class?: string;
   *   onFinishTyping?: () => void;
   * }}
   */
  let {
    sourceMarkdown, // BẮT BUỘC: Chuỗi markdown đầy đủ từ stream
    speed = 10, // TÙY CHỌN: Tốc độ gõ chữ (ms/ký tự)
    class: className = '', // TÙY CHỌN: Các class CSS để tùy chỉnh từ bên ngoài
    onFinishTyping, // Callback khi hoàn thành typing
  } = $props()

  // === State nội bộ của component ===
  let displayedMarkdown = $state('')
  let currentIndex = $state(0)
  let isTyping = $state(false)
  let container = $state()
  let parsedHtml = $state('') // Cached parsed HTML
  let parseTimeout = null // Debounce timeout cho parsing

  // Cache cho highlighted code blocks
  const highlightCache = new Map()
  let highlightTimeout = null
  const highlightedElements = new WeakSet() // Track đã highlight elements

  // Debounce function cho markdown parsing
  function debouncedParse(markdown, delay = 16) {
    // ~60fps
    clearTimeout(parseTimeout)
    parseTimeout = setTimeout(() => {
      try {
        parsedHtml = marked.parse(markdown)
        // Schedule highlight sau khi parse xong
        scheduleHighlight()
      } catch (error) {
        console.warn('Markdown parse error:', error)
        parsedHtml = markdown // Fallback to raw text
      }
    }, delay)
  }

  // Configure marked với caching để tối ưu hiệu năng
  marked.setOptions({
    highlight: function (code, lang) {
      const cacheKey = `${lang}:${code.substring(0, 50)}`

      if (highlightCache.has(cacheKey)) {
        return highlightCache.get(cacheKey)
      }

      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      const result = hljs.highlight(code, { language }).value

      // Limit cache size để tránh memory leak
      if (highlightCache.size > 100) {
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

  // Optimized highlight function với debouncing
  function scheduleHighlight() {
    clearTimeout(highlightTimeout)
    highlightTimeout = setTimeout(() => {
      if (container) {
        // Chỉ lấy các code blocks chưa được highlight và chưa có class hljs
        const codeBlocks = Array.from(
          container.querySelectorAll('pre code:not(.hljs)')
        ).filter((el) => !highlightedElements.has(el))

        // Process code blocks in small batches để tránh blocking UI
        let index = 0
        function processNext() {
          if (index < codeBlocks.length) {
            const element = codeBlocks[index]
            try {
              hljs.highlightElement(element)
              highlightedElements.add(element) // Mark as highlighted
            } catch (error) {
              console.warn('Highlight error:', error)
            }
            index++

            // Process next block in next frame
            if (index < codeBlocks.length) {
              requestAnimationFrame(processNext)
            }
          }
        }

        if (codeBlocks.length > 0) {
          requestAnimationFrame(processNext)
        }
      }
    }, 100) // Debounce 100ms
  }

  // Typing effect với tối ưu hiệu năng
  let typingInterval = null

  function startTyping() {
    if (typingInterval) {
      clearInterval(typingInterval)
    }

    typingInterval = setInterval(() => {
      if (currentIndex < sourceMarkdown.length) {
        isTyping = true

        // Adaptive speed: tăng số ký tự được thêm để tối ưu với debounced parsing
        const remainingChars = sourceMarkdown.length - currentIndex
        let charsToAdd = 1

        // Tăng tốc độ dựa trên số ký tự còn lại và tốc độ hiện tại
        if (remainingChars > 2000) {
          charsToAdd = Math.min(10, remainingChars) // Tăng tốc nhiều hơn cho văn bản dài
        } else if (remainingChars > 500) {
          charsToAdd = Math.min(5, remainingChars)
        } else if (remainingChars > 50) {
          charsToAdd = Math.min(2, remainingChars)
        }

        // Điều chỉnh dựa trên tốc độ typing được set
        if (speed > 30) {
          // Nếu speed chậm (>30ms), thêm nhiều ký tự hơn
          charsToAdd = Math.min(charsToAdd * 2, remainingChars)
        }

        const newContent = sourceMarkdown.substring(
          currentIndex,
          currentIndex + charsToAdd
        )

        displayedMarkdown += newContent
        currentIndex += charsToAdd
      } else {
        // Hoàn thành typing
        if (isTyping) {
          isTyping = false
          if (onFinishTyping) {
            onFinishTyping()
          }
        }
      }
    }, speed)
  }

  // Effect để start/restart typing khi sourceMarkdown thay đổi
  let previousSourceMarkdown = ''

  $effect(() => {
    // Reset nếu sourceMarkdown bị clear
    if (sourceMarkdown === '') {
      displayedMarkdown = ''
      currentIndex = 0
      isTyping = false
      parsedHtml = ''
      highlightedElements.clear() // Reset highlighted elements tracking
      if (typingInterval) {
        clearInterval(typingInterval)
        typingInterval = null
      }
      return
    }

    // Chỉ restart typing khi có thay đổi thực sự
    if (sourceMarkdown !== previousSourceMarkdown) {
      previousSourceMarkdown = sourceMarkdown

      // Nếu content mới dài hơn content hiện tại, tiếp tục typing
      if (sourceMarkdown.length > displayedMarkdown.length) {
        startTyping()
      }
    }
  })

  // Effect để parse markdown với debounce khi displayedMarkdown thay đổi
  $effect(() => {
    if (displayedMarkdown) {
      debouncedParse(displayedMarkdown)
    } else {
      parsedHtml = ''
    }
  })

  // Cleanup khi component bị destroy
  $effect(() => {
    return () => {
      if (typingInterval) {
        clearInterval(typingInterval)
      }
      if (highlightTimeout) {
        clearTimeout(highlightTimeout)
      }
      if (parseTimeout) {
        clearTimeout(parseTimeout)
      }
      highlightCache.clear()
    }
  })
</script>

<div
  bind:this={container}
  class="markdown-container {isTyping ? 'blinking-cursor' : ''} {className}"
  style="--cursor-color: #555;"
>
  {@html parsedHtml}
</div>

<style>
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

  /* Optimize code block rendering */
  :global(.markdown-container pre) {
    contain: layout;
    overflow-x: auto;
    background-color: #f8f8f8;
    border-radius: 4px;
    padding: 1rem;
    margin: 0.5rem 0;
  }
</style>
