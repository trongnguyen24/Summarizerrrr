<!-- @ts-nocheck -->
<script>
  import 'highlight.js/styles/github-dark.css'
  import hljs from 'highlight.js'
  import SvelteMarkdown from '@humanspeak/svelte-markdown'

  /**
   * Props của component - Hybrid approach: svelte-markdown cho DOM stability
   * và manual highlight.js cho highlighting đáng tin cậy.
   * @type {{
   *   sourceMarkdown: string;
   *   class?: string;
   *   onFinishTyping?: () => void;
   *   enableCursor?: boolean;
   * }}
   */
  let {
    sourceMarkdown, // BẮT BUỘC: Chuỗi markdown từ smoothing stream
    class: className = '', // TÙY CHỌN: CSS classes
    onFinishTyping, // Callback khi hoàn thành
    enableCursor = true, // TÙY CHỌN: Hiển thị cursor animation
  } = $props()

  // === State nội bộ ===
  let container = $state()
  let isStreaming = $state(true)
  let completionTimeout = null
  let hasCalledFinish = false
  let highlightTimeout = null

  // --- Logic phát hiện hoàn thành stream ---

  function markComplete() {
    if (!hasCalledFinish) {
      hasCalledFinish = true
      isStreaming = false
      if (onFinishTyping) {
        onFinishTyping()
      }
      // Chạy highlight lần cuối sau khi stream kết thúc
      scheduleHighlight()
    }
  }

  function scheduleCompletion() {
    clearTimeout(completionTimeout)
    if (sourceMarkdown && sourceMarkdown.length > 0) {
      completionTimeout = setTimeout(markComplete, 500)
    }
  }

  // --- Logic highlight thủ công ---
  function scheduleHighlight() {
    clearTimeout(highlightTimeout)
    highlightTimeout = setTimeout(() => {
      if (container) {
        const blocks = container.querySelectorAll('pre code:not(.hljs)')
        blocks.forEach((block) => {
          try {
            hljs.highlightElement(block)
          } catch (error) {
            console.warn('Highlight.js error:', error)
          }
        })
      }
    }, 100) // Đợi 100ms sau khi DOM cập nhật
  }

  // Effect để theo dõi sourceMarkdown và lên lịch các tác vụ
  $effect(() => {
    if (sourceMarkdown) {
      isStreaming = true
      hasCalledFinish = false
      scheduleCompletion()
      // scheduleHighlight() // Bỏ đi để tránh race condition
    } else {
      isStreaming = true
      hasCalledFinish = false
      clearTimeout(completionTimeout)
      clearTimeout(highlightTimeout)
    }
  })

  // Effect để hoàn thành ngay lập tức nếu cursor bị tắt
  $effect(() => {
    if (sourceMarkdown && !enableCursor) {
      setTimeout(markComplete, 100)
    }
  })

  // Cleanup
  $effect(() => {
    return () => {
      if (completionTimeout) clearTimeout(completionTimeout)
      if (highlightTimeout) clearTimeout(highlightTimeout)
    }
  })
</script>

<div
  bind:this={container}
  class="markdown-container-v2 {isStreaming && enableCursor
    ? 'blinking-cursor'
    : ''} {className}"
>
  <SvelteMarkdown source={sourceMarkdown} />
</div>

<style>
  .markdown-container-v2 {
    position: relative; /* Cần cho blinking-cursor */
  }

  /* CSS để tạo con trỏ nhấp nháy được tối ưu */
  .blinking-cursor::after {
    content: '✢';
    display: block;
    margin: auto;
    text-align: center !important;
    /* Sử dụng transform thay vì thay đổi content để tối ưu hiệu năng */
    animation: cyberpunk-blink 1.2s linear infinite;

    color: var(--cursor-color, #4b4b4b);
    /* GPU acceleration */
    will-change: transform;
    transform: translateZ(0);

    /* Đảm bảo con trỏ luôn ở cuối */
    position: absolute;
    bottom: -5rem;
    left: 50%;
    transform: translateX(-50%);
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

  .markdown-container-v2 :global(pre) {
    border-radius: 8px;
    transition:
      background-color 0.2s ease-in-out,
      padding 0.2s ease-in-out;
  }

  .markdown-container-v2 :global(code) {
    transition:
      background-color 0.2s ease-in-out,
      padding 0.2s ease-in-out;
  }
</style>
