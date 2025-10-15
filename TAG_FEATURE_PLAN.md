# Kế hoạch Triển khai Tính năng Tag

Kế hoạch được chia thành các giai đoạn nhỏ để dễ dàng theo dõi và triển khai.

## Giai đoạn 1: Nền tảng Dữ liệu với IndexedDB (Data Foundation with IndexedDB)

### Mục tiêu
Tích hợp việc quản lý tags vào `IndexedDB` để đảm bảo tính nhất quán dữ liệu.

### Actions
*   **Sửa file `src/lib/db/indexedDBService.js`:**
    *   Trong hàm `onupgradeneeded`, tạo một `objectStore` mới có tên là `tags` với `id` là keyPath và tạo một index cho `name`.
    *   Thêm các hàm mới để quản lý tags: `addTag`, `getAllTags`, `updateTag`, `deleteTag`.
*   **Cập nhật `summaries` object store:**
    *   Đảm bảo cấu trúc dữ liệu của `summaries` có một trường `tags` (là một array of tag IDs).
    *   Chỉnh sửa hàm `updateSummary` (hoặc tạo hàm mới) để có thể cập nhật trường `tags` này.
    *   Khi xóa một tag (`deleteTag`), cần phải cập nhật tất cả các `summaries` đang chứa tag đó để gỡ ID của tag bị xóa.

## Giai đoạn 2: Giao diện Quản lý Tag (Tag Management UI)

### Mục tiêu
Cho phép người dùng xem, tạo và xóa các tag.

### Actions
*   Tạo component `TagManagement.svelte` trong `src/components/displays/archive/`.
*   Component này sẽ hiển thị danh sách các tag từ `tagStore`, cùng với nút "Xóa" cho mỗi tag.
*   Thêm một ô nhập liệu (input) và nút "Tạo Tag mới" để người dùng có thể thêm tag.
*   Tích hợp `TagManagement.svelte` vào `TabArchive.svelte`.

## Giai đoạn 3: Logic Lọc theo Tag (Filter Logic)

### Mục tiêu
Cho phép người dùng lọc danh sách tóm tắt bằng cách nhấp vào một tag.

### Actions
*   Tại `TabArchive.svelte`, thêm logic để xử lý việc chọn một tag từ `TagManagement.svelte`.
*   Cập nhật danh sách tóm tắt được hiển thị để chỉ bao gồm những tóm tắt có chứa tag đã chọn. Thêm tùy chọn "Hiển thị tất cả" để xóa bộ lọc.

## Giai đoạn 4: Gán Tag cho Tóm tắt (Assigning Tags to Summaries)

### Mục tiêu
Hoàn thiện luồng tính năng bằng cách cho phép người dùng gán tag vào các tóm tắt của họ.

### Actions
*   Trên mỗi mục tóm tắt trong danh sách, hiển thị các tag đã được gán.
*   Thêm một nút (ví dụ: "Chỉnh sửa Tags") trên mỗi mục tóm tắt.
*   Khi nhấp vào nút đó, hiển thị một giao diện (ví dụ: modal hoặc dropdown) cho phép người dùng chọn/bỏ chọn các tag để gán cho tóm tắt đó.

## Giai đoạn 5: Hoàn thiện (Refinement)

### Mục tiêu
Tinh chỉnh và hoàn thiện tính năng.

### Actions
*   Triển khai chức năng "Sửa" tên tag.
*   Đảm bảo giao diện mượt mà, đồng nhất với toàn bộ ứng dụng và xử lý các trường hợp đặc biệt (ví dụ: không có tag nào).
