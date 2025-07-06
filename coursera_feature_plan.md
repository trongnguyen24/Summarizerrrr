# Kế hoạch triển khai tính năng Tóm tắt và Phân tích cho Coursera

## Mục tiêu

Tích hợp khả năng tóm tắt và phân tích nội dung từ các trang khóa học Coursera (cả Video và Reading) vào tiện ích mở rộng, tương tự như tính năng hiện có cho Udemy.

## Các bước thực hiện

1.  **Tạo Content Script mới cho Coursera:**

    - Tạo tệp `src/entrypoints/courseratranscript.content.js`.
    - Cấu hình để chạy trên các URL khóa học Coursera (`*://*.coursera.org/learn/*`).
    - Triển khai logic để phát hiện loại trang (Video/Reading) dựa trên URL hoặc sự hiện diện của các phần tử DOM đặc trưng.
    - Trích xuất nội dung tương ứng (bản ghi video hoặc văn bản bài đọc) dựa trên các bộ chọn CSS đã xác định:
      - **Video:** Vùng chứa bản ghi (`.rc-Transcript` hoặc `.rc-TranscriptHighlighter`), các đoạn văn bản (`.rc-Phrase span`).
      - **Reading:** Vùng chứa nội dung chính (`.rc-CML`).
    - Làm sạch dữ liệu đã trích xuất (loại bỏ ký tự không mong muốn, khoảng trắng thừa).
    - Gửi dữ liệu đã làm sạch và loại nội dung (`video` hoặc `reading`) đến background script bằng `chrome.runtime.sendMessage`.
    - Thêm handler cho thông điệp `pingCourseraScript` để kiểm tra kết nối.

2.  **Cập nhật Background Script (`src/entrypoints/background.js`):**

    - Thêm listener để nhận thông điệp từ `courseratranscript.content.js`.
    - Khi nhận được dữ liệu từ Coursera, xác định loại nội dung (video/reading).
    - Chọn prompt template AI phù hợp dựa trên loại nội dung.
    - Gửi yêu cầu xử lý (tóm tắt, phân tích khái niệm) đến API AI (sử dụng lại logic hiện có trong `src/lib/api.js`).
    - Nhận kết quả từ AI và gửi nó đến sidepanel script.

3.  **Cập nhật Store (`src/stores/summaryStore.svelte.js`):**

    - Thêm các biến trạng thái mới để lưu trữ dữ liệu và trạng thái loading/error cho Coursera (ví dụ: `courseraSummary`, `courseraConcepts`, `isCourseraSummaryLoading`, `isCourseraConceptsLoading`, `courseraError`, `activeCourseraTab`).
    - Thêm các hàm để cập nhật các biến trạng thái Coursera này.

4.  **Tạo các Component Svelte mới cho Coursera:**

    - Tạo tệp `src/components/displays/CourseraSummaryDisplay.svelte` làm component chứa chính cho giao diện Coursera trong sidepanel. Component này sẽ quản lý các tab (ví dụ: 'Summary', 'Concepts').
    - Tạo tệp `src/components/displays/CourseraVideoSummary.svelte` để hiển thị kết quả tóm tắt/phân tích cho nội dung Video.
    - Tạo tệp `src/components/displays/CourseraReadingSummary.svelte` để hiển thị kết quả tóm tắt/phân tích cho nội dung Reading.
    - Tạo tệp `src/components/displays/CourseraConceptsDisplay.svelte` để hiển thị các khái niệm được trích xuất.
    - Các component này sẽ đọc dữ liệu từ `summaryStore.svelte.js`.

5.  **Cập nhật Component chính của Sidepanel (`src/entrypoints/sidepanel/App.svelte`):**

    - Điều chỉnh logic hiển thị để kiểm tra URL hiện tại.
    - Nếu URL khớp với Coursera, hiển thị `CourseraSummaryDisplay.svelte` và truyền dữ liệu Coursera từ store.
    - Giữ nguyên logic hiển thị cho Udemy và YouTube.

6.  **Tạo/Điều chỉnh Prompt Templates:**

    - Xem xét các prompt template hiện có trong `src/lib/prompts/templates/`.
    - Quyết định xem có thể tái sử dụng hoặc điều chỉnh các template của Udemy/YouTube cho Coursera không, hay cần tạo template mới hoàn toàn.
    - Nếu cần, tạo các tệp template mới trong thư mục `src/lib/prompts/templates/coursera/` (ví dụ: `videoSummary.js`, `readingSummary.js`, `concepts.js`).
    - Cập nhật `src/lib/promptTemplates.js` để bao gồm các template mới của Coursera.

7.  **Cập nhật cấu hình WXT (`wxt.config.ts`):**
    - Thêm `courseratranscript.content.js` vào danh sách các content script.

## Luồng dữ liệu

```mermaid
graph TD
    A[Coursera Website] --> B{Content Script<br>courseratranscript.content.js};
    B --> C{Detect Page Type<br>(Video/Reading)};
    C --> |Video| D[Extract Transcript<br>from DOM];
    C --> |Reading| E[Extract Reading Content<br>from DOM];
    D --> F[Clean Text];
    E --> F[Clean Text];
    F --> G{Send Message to<br>Background Script};
    G --> H[Background Script<br>background.js];
    H --> I{Determine AI Prompt<br>based on Page Type};
    I --> J[AI API Service<br>src/lib/api.js];
    J --> K[AI Model];
    K --> J;
    J --> H;
    H --> L{Send Message to<br>Sidepanel Script};
    L --> M[Sidepanel Script<br>sidepanel/main.js];
    M --> N[Update Summary Store<br>summaryStore.svelte.js];
    N --> O[Sidepanel App Component<br>src/entrypoints/sidepanel/App.svelte];
    O --> P{Check Current URL};
    P --> |Coursera URL| Q[Render Coursera Display Components<br>e.g., CourseraSummaryDisplay.svelte];
    P --> |Udemy URL| R[Render Udemy Display Components];
    P --> |YouTube URL| S[Render YouTube Display Components];
    Q --> N; %% Components read from Store
    R --> N; %% Components read from Store
    S --> N; %% Components read from Store
```
