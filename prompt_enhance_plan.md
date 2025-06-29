# Kế hoạch triển khai tính năng "Prompt Enhance"

## Mục tiêu

Phát triển tính năng "Prompt Enhance" trong thành phần [`src/entrypoints/prompt/AIprompt.svelte`](src/entrypoints/prompt/AIprompt.svelte). Khi người dùng nhấp vào nút "Prompt Enhance", hệ thống sẽ trích xuất nội dung từ các phần tử textarea, xây dựng một prompt toàn diện để cải thiện các prompt hệ thống và người dùng, gửi prompt này đến một API, hiển thị các đề xuất đã được cải thiện và cho phép người dùng áp dụng các prompt đã được cải thiện.

## Các bước

1.  **Sửa đổi thành phần AIprompt.svelte:**
    - Thêm ID vào các textarea cho system prompt và user prompt: `currentSystemPrompt` và `currentUserPrompt`.
    - Thêm một nút kích hoạt tính năng "Prompt Enhance".
    - Thêm hai textarea mới để hiển thị các đề xuất prompt hệ thống và người dùng, sử dụng bố cục dọc.
    - Thêm một nút "Apply Prompt" để cho phép người dùng áp dụng các prompt đã được cải thiện.
2.  **Tạo hàm JavaScript để xử lý sự kiện nhấp chuột của nút "Prompt Enhance":**
    - Trích xuất nội dung từ các textarea `currentSystemPrompt` và `currentUserPrompt`.
    - Xây dựng một prompt nâng cao cơ bản bao gồm nội dung đã trích xuất, hướng dẫn mô hình AI cải thiện các prompt hệ thống và người dùng.
    - Gọi API để nhận các đề xuất prompt đã được cải thiện.
    - Hiển thị các đề xuất prompt đã được cải thiện trong hai textarea mới.
    - Thêm một chỉ báo tải trong quá trình xử lý API.
    - Xử lý các lỗi tiềm ẩn trong quá trình giao tiếp API và cung cấp phản hồi thông tin cho người dùng.
3.  **Tạo hàm JavaScript để xử lý sự kiện nhấp chuột của nút "Apply Prompt":**
    - Thay thế nội dung ban đầu của các textarea `currentSystemPrompt` và `currentUserPrompt` bằng các prompt đã được cải thiện tương ứng từ hai textarea mới.
4.  **Tạo một hàm để gọi API:**
    - Sử dụng hàm `summarizeContent` từ [`src/lib/api.js`](src/lib/api.js) để gọi API.
    - Truyền nội dung đã trích xuất và prompt nâng cao làm tham số cho hàm `summarizeContent`.
    - Xử lý các lỗi tiềm ẩn trong quá trình giao tiếp API và cung cấp phản hồi thông tin cho người dùng.
5.  **Sử dụng cài đặt từ [`src/stores/settingsStore.svelte.js`](src/stores/settingsStore.svelte.js):**
    - Sử dụng cài đặt `selectedProvider` để xác định nhà cung cấp AI nào sẽ sử dụng.
    - Sử dụng các cài đặt API key và model tương ứng cho nhà cung cấp AI đã chọn.
6.  **Đảm bảo tuân thủ các công nghệ sau:**
    - WXT
    - Svelte 5
    - TailwindCSS 4
    - JavaScript (không phải TypeScript)
    - Global store

## Prompt nâng cao cơ bản

```
Bạn là một trợ lý AI chuyên về cải thiện prompt. Nhiệm vụ của bạn là cải thiện các prompt hệ thống và người dùng được cung cấp để rõ ràng, hiệu quả và phù hợp hơn với nhiệm vụ dự định.

Đây là prompt hệ thống:
<system_prompt>
__SYSTEM_PROMPT__
</system_prompt>

Đây là prompt người dùng:
<user_prompt>
__USER_PROMPT__
</user_prompt>

Hãy cung cấp các đề xuất prompt đã được cải thiện cho prompt hệ thống và prompt người dùng.
```

## Bố cục

Sử dụng bố cục dọc (hai textarea xếp chồng lên nhau) cho hai textarea mới.
