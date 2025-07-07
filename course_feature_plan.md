# Kế hoạch tái cấu trúc tính năng Udemy thành module Course

## Mục tiêu

Tái cấu trúc tính năng Udemy thành một module Course chung để dễ dàng hỗ trợ các trang khóa học khác nhau trong tương lai.

## Các bước thực hiện

1.  **Tái sử dụng các state Udemy cũ:**

    - Trong file [`src/stores/summaryStore.svelte.js`](src/stores/summaryStore.svelte.js), đổi tên các state Udemy cụ thể thành state Course chung.
      - `udemySummary` -> `courseSummary`
      - `udemyConcepts` -> `courseConcepts`
      - `udemyVideoSummary` -> `courseVideoSummary` (nếu có)
    - **Lưu ý:** Cập nhật tất cả các references đến các state này trong codebase.

2.  **Tạo các content script riêng cho từng trang khóa học:**

    - Tạo một file `course.content.js` cho mỗi trang khóa học (ví dụ: `src/entrypoints/udemy.content.js`, `src/entrypoints/coursera.content.js`).
    - Di chuyển logic trích xuất dữ liệu từ [`src/entrypoints/udemytranscript.content.js`](src/entrypoints/udemytranscript.content.js) vào `src/entrypoints/udemy.content.js`.
      - Giữ logic trích xuất dữ liệu cụ thể cho trang Udemy trong file này.
      - Sử dụng các selector CSS và API endpoint phù hợp để lấy dữ liệu.
    - **Mỗi file content script sẽ có logic lấy context riêng, không cần hàm chung.**
      - Đảm bảo mỗi content script gửi dữ liệu đã trích xuất đến các state Course chung trong [`src/stores/summaryStore.svelte.js`](src/stores/summaryStore.svelte.js).

3.  **Đổi tên các components Udemy:**

    - Đổi tên các components sau:
      - [`src/components/displays/UdemyConceptsDisplay.svelte`](src/components/displays/UdemyConceptsDisplay.svelte) -> [`src/components/displays/CourseConceptsDisplay.svelte`](src/components/displays/CourseConceptsDisplay.svelte)
      - [`src/components/displays/UdemySummaryDisplay.svelte`](src/components/displays/UdemySummaryDisplay.svelte) -> [`src/components/displays/CourseSummaryDisplay.svelte`](src/components/displays/CourseSummaryDisplay.svelte)
      - [`src/components/displays/UdemyVideoSummary.svelte`](src/components/displays/UdemyVideoSummary.svelte) -> [`src/components/displays/CourseVideoSummary.svelte`](src/components/displays/CourseVideoSummary.svelte)
    - **Lưu ý:** Cập nhật tất cả các references đến các components này trong codebase.
    - Đảm bảo các components mới nhận dữ liệu từ các state Course chung trong [`src/stores/summaryStore.svelte.js`](src/stores/summaryStore.svelte.js).

4.  **Đổi tên các prompt template Udemy:**

    - Đổi tên các prompt template sau:
      - [`src/lib/prompts/udemySummaryPromptTemplate.js`](src/lib/prompts/udemySummaryPromptTemplate.js) -> [`src/lib/prompts/courseSummaryPromptTemplate.js`](src/lib/prompts/courseSummaryPromptTemplate.js)
      - [`src/lib/prompts/udemyConceptsPromptTemplate.js`](src/lib/prompts/udemyConceptsPromptTemplate.js) -> [`src/lib/prompts/courseConceptsPromptTemplate.js`](src/lib/prompts/courseConceptsPromptTemplate.js)
    - **Lưu ý:** Cập nhật tất cả các references đến các prompt template này trong codebase.

5.  **Kiểm tra và gỡ lỗi:**
    - Kiểm tra tính năng Course với trang Udemy và trang khóa học mới.
    - Đảm bảo tất cả các chức năng hoạt động chính xác.
    - Gỡ lỗi và sửa các lỗi phát sinh.

## Lưu ý

- Giữ logic đơn giản và dễ bảo trì.
- Tận dụng các tính năng đã có sẵn của WXT.
- Sử dụng các selector CSS và API endpoint phù hợp cho từng trang khóa học.
- Đảm bảo tất cả các components và content script đều sử dụng các state Course chung.

## Kết thúc

Sau khi hoàn thành các bước trên, bạn sẽ có một module Course chung có thể dễ dàng mở rộng để hỗ trợ các trang khóa học khác nhau.
