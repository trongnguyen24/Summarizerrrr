<!-- @ts-nocheck -->
<script>
  import 'highlight.js/styles/github-dark.css'
  import hljs from 'highlight.js'
  import SvelteMarkdown from 'svelte-markdown'
  import { processThinkTags } from '@/lib/utils/thinkTagProcessor.js'
  import { processTimestamps } from '@/lib/utils/timestampProcessor.js'
  import TimestampLink from './TimestampLink.svelte'
  import TableRenderer from './TableRenderer.svelte'

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

  // === Xử lý think tags ===
  let processedMarkdown = $state('')

  function processMarkdown() {
    if (sourceMarkdown) {
      try {
        // Process <think> tags before streaming with error handling
        if (typeof sourceMarkdown !== 'string') {
          console.warn(
            'StreamingMarkdownV2: sourceMarkdown is not a string:',
            typeof sourceMarkdown,
            sourceMarkdown,
          )
          processedMarkdown = String(sourceMarkdown || '')
          return
        }

        processedMarkdown = processThinkTags(sourceMarkdown)
      } catch (error) {
        console.warn('StreamingMarkdownV2: Think tag processing error:', error)
        // Fallback to original content if processing fails
        processedMarkdown = sourceMarkdown
      }
    } else {
      processedMarkdown = ''
    }
  }

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
    if (processedMarkdown && processedMarkdown.length > 0) {
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

  // Effect để xử lý think tags khi sourceMarkdown thay đổi
  $effect(() => {
    processMarkdown()
  })

  // Effect để theo dõi processedMarkdown và lên lịch các tác vụ
  $effect(() => {
    if (processedMarkdown && processedMarkdown.length > 0) {
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
    if (processedMarkdown && processedMarkdown.length > 0 && !enableCursor) {
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
  <SvelteMarkdown
    source={!isStreaming
      ? processTimestamps(processedMarkdown)
      : processedMarkdown}
    renderers={{ link: TimestampLink, table: TableRenderer }}
  />
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

  /* === Think Tags Styling === */
  .markdown-container-v2 :global(.think-section) {
    opacity: 0.75;
    overflow: hidden;
    margin-bottom: 1rem;
    transition: all 0.2s ease-in-out;
  }

  /* === Table Styling - Horizontal Scroll === */
  /* Note: Scrolling is now handled by TableRenderer wrapper */
  .markdown-container-v2 :global(table) {
    width: 100%;
    /* border: 1px solid var(--color-border); -> Moved to wrapper */
    /* border-radius: 0.5em; -> Moved to wrapper */
    padding: 0.5em 0;
    /* scrollbar-width: thin; -> Moved to wrapper */
    /* scrollbar-color: transparent transparent; -> Moved to wrapper */
  }

  /* Remove these display overrides as we want standard table behavior inside the wrapper */
  /*
  .markdown-container-v2 :global(table thead),
  .markdown-container-v2 :global(table tbody),
  .markdown-container-v2 :global(table tr) {
    display: table;
    width: 100%;
    table-layout: fixed;
  }
  */

  /* Kept for context but commented out as wrapper handles it
  .markdown-container-v2 :global(table:hover) {
    scrollbar-color: var(--color-border) transparent;
  }
  */

  .markdown-container-v2 :global(th) {
    min-width: 60px;
    white-space: nowrap;
  }

  .markdown-container-v2 :global(td) {
    min-width: 60px;
  }

  /* Padding cho cell đầu và cuối của mỗi row */
  .markdown-container-v2 :global(th:first-child),
  .markdown-container-v2 :global(td:first-child) {
    padding-left: 0.5em;
  }

  .markdown-container-v2 :global(th:last-child),
  .markdown-container-v2 :global(td:last-child) {
    padding-right: 0.5em;
  }
</style>
