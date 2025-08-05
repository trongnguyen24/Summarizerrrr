# Kế hoạch Tái cấu trúc (Refactor) để Tích hợp Vercel AI SDK và `useCompletion`

## 1. Giới thiệu và Mục tiêu

**Mục tiêu:** Tái cấu trúc lại hệ thống gọi API và xử lý stream dữ liệu trong ứng dụng, thay thế logic xử lý thủ công hiện tại bằng cách tận dụng `useCompletion` hook và các tính năng nâng cao của Vercel AI SDK (v5).

**Lợi ích chính:**

- **Đơn giản hóa Code Frontend:** Loại bỏ logic quản lý trạng thái phức tạp (`isLoading`, `error`, nối chuỗi thủ công) khỏi các Svelte store và component.
- **Trải nghiệm người dùng mượt mà hơn:** Tận dụng tính năng làm mượt stream (`stream-smoothing`) được tích hợp sẵn để văn bản hiển thị tự nhiên hơn, thay vì xuất hiện từng khối rời rạc.
- **Kiến trúc nhất quán:** Áp dụng một kiến trúc chuẩn, dễ bảo trì và mở rộng, tương tự như các ứng dụng web hiện đại sử dụng Vercel AI SDK.

## 2. Phân tích Hiện trạng

- **`package.json`**: Đã cài đặt các gói cần thiết của AI SDK.
- **`src/lib/api/aiSdkAdapter.js`**: Đóng vai trò là một lớp trừu tượng (adapter) tốt, sử dụng `generateText` và `streamText`.
- **`src/lib/api/api.js`**: Chứa logic nghiệp vụ chính, xây dựng prompt và gọi đến adapter.
- **`src/stores/summaryStore.svelte.js`**: Hiện đang là trung tâm điều phối, quản lý tất cả các trạng thái (`isLoading`, `summary`, `error`, v.v.) và xử lý stream một cách thủ công bằng vòng lặp `for await...of`. Đây là điểm chính cần được tái cấu trúc.

## 3. Kiến trúc Đề xuất

Chúng ta sẽ mô phỏng một kiến trúc client-server bằng cách sử dụng service worker (background script) của extension làm "server" và sidepanel UI làm "client".

```mermaid
graph TD
    subgraph Frontend (Sidepanel)
        A[UI Components e.g., App.svelte] -- "1. Gọi hook useCompletion('/api/summarize', ...)" --> B(State Management <br> `useCompletion`);
        B -- "4. Tự động cập nhật state (completion, isLoading, error)" --> A;
        B -- "2. Gửi yêu cầu fetch đến '/api/summarize'" --> C{Browser Fetch API};
    end

    subgraph Background Script (Service Worker)
        C -- "3. Chặn yêu cầu" --> D[Message Listener in background.js];
        D -- "5. Gọi logic xử lý AI" --> E[API Handler];
        E -- "6. Gọi AI Provider (e.g., Google)" --> F[Vercel AI SDK <br> (e.g., createGoogleGenerativeAI)];
        F -- "7. Trả về stream" --> E;
        E -- "8. Tạo new StreamingTextResponse" --> D;
        D -- "9. Trả về Response cho fetch" --> C;
    end

    style B fill:#cde4ff,stroke:#6b95ff,stroke-width:2px
    style E fill:#cde4ff,stroke:#6b95ff,stroke-width:2px
```

## 4. Kế hoạch Triển khai Chi tiết

Dưới đây là các bước cụ thể để thực hiện kiến trúc trên.

### Bước 1: Thiết lập Background Script để chặn API

- **File:** `src/entrypoints/background.js`
- **Nhiệm vụ:** Thêm một listener để lắng nghe các tin nhắn từ frontend. Listener này sẽ hoạt động như một router, xác định các yêu cầu đến endpoint ảo (ví dụ: `/api/summarize`) và chuyển chúng đến handler tương ứng.

### Bước 2: Xây dựng API Handler trong Background Script

- **File:** `src/lib/api/backgroundApiHandler.js` (tệp mới)
- **Nhiệm vụ:**
  - Tạo một hàm handler nhận các tham số từ yêu cầu (ví dụ: `prompt`, `contentType`, `settings`).
  - Di chuyển logic cốt lõi từ `api.js` và `aiSdkAdapter.js` vào đây.
  - Hàm này sẽ gọi đến nhà cung cấp AI thông qua `streamText` của Vercel AI SDK.
  - Quan trọng: Nó sẽ trả về một đối tượng `StreamingTextResponse`, đây là định dạng chuẩn mà `useCompletion` hook mong đợi.

### Bước 3: Tái cấu trúc State Management với `useCompletion`

- **File:** `src/stores/summaryStore.svelte.js`
- **Nhiệm vụ:**
  - Loại bỏ phần lớn các state thủ công (`isLoading`, `summary`, `error`, v.v.).
  - Thay vào đó, tạo ra các store mới hoặc các hàm có thể export, mỗi cái sẽ sử dụng `useCompletion` hook. Ví dụ, chúng ta có thể có một `createSummaryCompletion` store.
  - Store này sẽ gọi đến API handler ở background script thông qua `chrome.runtime.sendMessage`.

### Bước 4: Cập nhật Giao diện Người dùng (UI Components)

- **File:** `src/entrypoints/sidepanel/App.svelte` và các component con.
- **Nhiệm vụ:**
  - Thay thế việc truy cập trực tiếp vào các state cũ trong `summaryState` bằng cách sử dụng các giá trị được cung cấp bởi `useCompletion` hook (ví dụ: `completion`, `isLoading`, `error`).
  - Gắn kết quả `completion` (văn bản đã được làm mượt) trực tiếp vào nơi hiển thị.

### Bước 5: Xử lý nhiều luồng stream đồng thời

- **Vấn đề:** Trang YouTube và trang khóa học cần chạy nhiều yêu cầu tóm tắt song song (ví dụ: tóm tắt video và tóm tắt theo chương).
- **Giải pháp:**
  - Tạo nhiều instance của `useCompletion` hook, mỗi instance cho một tác vụ tóm tắt riêng biệt.
  - Ví dụ: `const videoSummary = useCompletion(...)` và `const chapterSummary = useCompletion(...)`.
  - Giao diện sẽ lắng nghe trạng thái của từng instance để hiển thị kết quả và trạng thái loading tương ứng. Điều này giúp cô lập logic và trạng thái cho từng phần của UI.

### Bước 6: Dọn dẹp code cũ và Kiểm thử

- **Nhiệm vụ:**
  - Sau khi đã chuyển đổi hoàn toàn sang kiến trúc mới, xóa các hàm và state không còn sử dụng trong `summaryStore.svelte.js` và `api.js`.
  - Thực hiện kiểm thử toàn diện trên các loại trang khác nhau (YouTube, Udemy, Coursera, web thông thường) để đảm bảo mọi thứ hoạt động ổn định.
