<!-- @ts-nocheck -->
<script>
  import { marked } from 'marked'

  /**
   * Props của component, sử dụng cú pháp Svelte 5
   * @type {{
   * sourceMarkdown: string;
   * speed?: number;
   * class?: string;
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
  let isTyping = $state(true)

  // $effect là "trái tim" của component này.
  // Nó sẽ chạy lại mỗi khi các dependencies (sourceMarkdown, speed) thay đổi.
  $effect(() => {
    // Nếu sourceMarkdown rỗng, reset lại mọi thứ
    if (sourceMarkdown.length === 0) {
      displayedMarkdown = ''
      currentIndex = 0
      isTyping = false
      return
    }

    // Thiết lập một vòng lặp để "gõ" chữ
    const typingInterval = setInterval(() => {
      // Nếu vẫn còn ký tự để gõ
      if (currentIndex < sourceMarkdown.length) {
        isTyping = true
        // Nối ký tự tiếp theo vào chuỗi hiển thị
        displayedMarkdown += sourceMarkdown[currentIndex]
        currentIndex++
      } else {
        // Đã gõ xong, dừng lại
        isTyping = false
        clearInterval(typingInterval)
      }
    }, speed)

    // Đây là hàm cleanup của $effect.
    // Nó sẽ chạy trước khi effect chạy lại, hoặc khi component bị hủy.
    // Điều này đảm bảo không có vòng lặp nào bị rò rỉ.
    return () => {
      clearInterval(typingInterval)
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
  /* Container chính cho nội dung markdown */
  .markdown-container {
    position: relative;
    white-space: pre-wrap; /* Giữ lại các khoảng trắng và xuống dòng */
    word-wrap: break-word; /* Tự động ngắt từ nếu quá dài */
    line-height: 1.7;
  }

  /* CSS để tạo con trỏ nhấp nháy */
  .blinking-cursor::after {
    content: '▋'; /* Ký tự con trỏ, bạn có thể đổi thành '|' */
    display: inline-block;
    margin-left: 2px;
    animation: blink 1s step-end infinite;
    color: var(--cursor-color, #333); /* Cho phép tùy biến màu con trỏ */
  }

  @keyframes blink {
    from,
    to {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }
</style>
