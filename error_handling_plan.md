# Kế hoạch cải thiện hệ thống báo lỗi

Dự án này nhằm mục đích cải thiện cơ chế báo lỗi hiện tại của extension Summarizerrrr để cung cấp trải nghiệm người dùng tốt hơn, dễ bảo trì và mở rộng hơn.

## Phân tích hệ thống báo lỗi hiện tại

Hệ thống báo lỗi hiện tại được phân tán ở nhiều nơi:

- **AI Providers**: Xử lý lỗi liên quan đến API (HTTP status, API key...).
- **Summary Store**: Quản lý state lỗi và hiển thị cho người dùng.
- **Content Service**: Xử lý lỗi khi không lấy được nội dung từ trang web.

Hạn chế của hệ thống hiện tại là thiếu sự nhất quán, khó theo dõi và không có cơ chế phục hồi tự động.

## Đề xuất cải thiện

### 1. Sơ đồ luồng xử lý lỗi mới

```mermaid
graph TD
    subgraph App
        direction LR
        A[API Call / Content Fetch] --> B{Error Occurs};
    end

    B --> C[ErrorHandler.handle(error)];

    subgraph ErrorHandler
        direction TB
        C --> D{1. Classify Error};
        D --> E[2. Generate User Message];
        E --> F[3. Determine Recovery Action e.g., retry];
        F --> G[4. Log Error];
    end

    G --> H[Structured Error Object];
    H --> I[SummaryStore];
    I --> J[ErrorDisplay.svelte UI];

    subgraph UI
        direction LR
        J --> K[Display Message];
        J --> L[Show 'Retry' Button];
        J --> M[Show 'Help' Button];
    end

    M --> N[HelpSystem];
    N --> O[Show Contextual Help];

    classDef default fill:#222,stroke:#fff,stroke-width:2px,color:#fff;
    classDef subgraph fill:#333,stroke:#fff,stroke-width:2px,color:#fff;
```

### 2. Kế hoạch triển khai chi tiết

- **[ ] 1. Tạo nền tảng cho hệ thống lỗi:**

  - Tạo `src/lib/errorTypes.js` để định nghĩa `ErrorTypes` và `ErrorSeverity`.
  - Tạo `src/lib/errorHandler.js` với class `ErrorHandler` tập trung.

- **[ ] 2. Tích hợp trình xử lý lỗi mới:**

  - Refactor các AI providers (`geminiProvider.js`, `ollamaProvider.js`, etc.) để gọi `ErrorHandler.handle()`.
  - Refactor `contentService.js` để sử dụng `ErrorHandler`.
  - Cập nhật `summaryStore.svelte.js` để lưu trữ đối tượng lỗi có cấu trúc từ `ErrorHandler`.

- **[ ] 3. Xây dựng giao diện người dùng cho lỗi:**

  - Tạo component `src/components/displays/ErrorDisplay.svelte`.
  - Component này sẽ hiển thị thông báo lỗi, và các nút hành động như "Thử lại" hoặc "Trợ giúp".
  - Tích hợp `ErrorDisplay.svelte` vào các UI chính (`App.svelte`, `SidePanel.svelte`).

- **[ ] 4. Thêm cơ chế phục hồi và ghi log:**

  - Triển khai hàm `withRetry` trong `src/lib/utils.js` sử dụng exponential backoff cho các lỗi có thể thử lại.
  - Tạo `src/lib/errorLogger.js` để ghi log lỗi vào `localStorage` hoặc gửi về một máy chủ (nếu có).

- **[ ] 5. Xây dựng hệ thống trợ giúp theo ngữ cảnh:**

  - Tạo `src/lib/helpSystem.js` để định nghĩa các thông điệp trợ giúp cho từng loại lỗi.
  - Kết nối hệ thống này với nút "Trợ giúp" trên `ErrorDisplay.svelte`.

- **[ ] 6. Dọn dẹp và hoàn thiện:**
  - Xóa bỏ các logic xử lý lỗi cũ, rải rác trong codebase.
  - Thực hiện kiểm thử toàn diện để đảm bảo hệ thống hoạt động ổn định.
