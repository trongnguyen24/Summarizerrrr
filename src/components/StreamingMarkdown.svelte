<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'
  import hljs from 'highlight.js'

  // Cấu hình marked để highlight code
  marked.setOptions({
    highlight: function (code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
    langPrefix: 'hljs language-', // class for unhighlighted code blocks
  })

  /**
   * Props của component, sử dụng cú pháp Svelte 5
   * @type {{
   *   sourceMarkdown: string;
   *   speed?: number;
   *   class?: string;
   * }}
   */
  let {
    sourceMarkdown, // BẮT BUỘC: Chuỗi markdown đầy đủ từ stream
    speed = 10, // TÙY CHỌN: Tốc độ gõ chữ (ms/ký tự)
    class: className = '', // TÙY CHỌN: Các class CSS để tùy chỉnh từ bên ngoài
  } = $props()

  // === State nội bộ của component ===

  // Chuỗi markdown đang được hiển thị trên màn hình
  let displayedMarkdown = $state('')
  // Vị trí ký tự hiện tại đang được "gõ"
  let currentIndex = $state(0)
  // Trạng thái cho biết component có đang "gõ" hay không, dùng để hiển thị con trỏ
  let isTyping = $state(false)

  // Effect này chỉ chạy một lần khi component được tạo ra, và hàm dọn dẹp của nó
  // sẽ chạy khi component bị hủy. Đây là cách tiếp cận đúng để tránh tạo/hủy interval liên tục.
  $effect(() => {
    const intervalId = setInterval(() => {
      // Nếu chuỗi hiển thị chưa bắt kịp chuỗi nguồn
      if (currentIndex < sourceMarkdown.length) {
        isTyping = true
        // Để animation mượt mà hơn khi nhận chunk lớn, ta sẽ thêm nhiều ký tự hơn trong một lần lặp
        // nếu đang bị bỏ lại quá xa. Ở đây ta thêm tối đa 3 ký tự mỗi lần.
        const charsToAdd = Math.min(3, sourceMarkdown.length - currentIndex)
        displayedMarkdown += sourceMarkdown.substring(
          currentIndex,
          currentIndex + charsToAdd
        )
        currentIndex += charsToAdd
      } else {
        // Đã bắt kịp, dừng trạng thái "gõ"
        isTyping = false
      }
    }, speed)

    // Hàm dọn dẹp: Dừng interval khi component bị hủy
    return () => {
      clearInterval(intervalId)
    }
  })

  // Effect này theo dõi `sourceMarkdown`. Nếu nó được reset về rỗng (bắt đầu một tóm tắt mới),
  // chúng ta cũng reset trạng thái nội bộ của component này.
  $effect(() => {
    if (sourceMarkdown === '') {
      displayedMarkdown = ''
      currentIndex = 0
      isTyping = false
    }
  })

  // Effect này chạy mỗi khi displayedMarkdown thay đổi để highlight code
  $effect(() => {
    // Đảm bảo rằng component đã render nội dung HTML
    if (displayedMarkdown) {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
</script>

<div
  class="markdown-container {isTyping ? 'blinking-cursor' : ''} {className}"
  style="--cursor-color: #555;"
>
  {@html marked.parse(displayedMarkdown)}
</div>

<style>
  /* CSS để tạo con trỏ nhấp nháy */
  .blinking-cursor::after {
    content: '|';
    display: block;
    text-align: center;
    /* Đã thay đổi animation để có hiệu ứng cyberpunk */
    animation: cyberpunk-blink 1.2s linear infinite;
    color: var(--cursor-color, #333); /* Cho phép tùy biến màu con trỏ */
  }

  /* Keyframes cho hiệu ứng con trỏ cyberpunk */
  @keyframes cyberpunk-blink {
    0% {
      content: '|';
    }
    20% {
      content: '#';
    }
    40% {
      content: '#';
    }
    60% {
      content: '&';
    }
    80% {
      content: '@';
    }
    100% {
      content: '!';
    }
  }
</style>
