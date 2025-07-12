# Kế hoạch nâng cấp tính năng Lưu trữ và Lịch sử (Phiên bản 3)

## Tổng quan

Dựa trên các phản hồi của bạn, kế hoạch này đã được tinh chỉnh lần cuối.

1.  **Nâng cấp tính năng "Lưu trữ" (Archive):** Thay đổi từ việc lưu từng bản tóm tắt riêng lẻ thành lưu một nhóm các bản tóm tắt liên quan vào một mục duy nhất.
2.  **Thêm tính năng "Lịch sử" (History):** Tự động ghi lại tất cả các hoạt động tóm tắt.
    - Cấu trúc dữ liệu của Lịch sử sẽ **giống hệt** với Lưu trữ.
    - Sẽ có **giới hạn số lượng** mục trong lịch sử (ví dụ: 50).
    - Khi vượt quá giới hạn, mục **cũ nhất sẽ tự động bị xóa**.

Cả hai tính năng sẽ được tích hợp vào cùng một trang (`archive/App.svelte`) và được phân chia bằng các tab.

---

## Cấu trúc dữ liệu chung cho `summaries` (Archive) và `history`

Cả hai kho dữ liệu sẽ sử dụng cùng một cấu trúc. **Lưu ý quan trọng:** Nội dung tóm tắt sẽ được lưu dưới dạng **Markdown thô**, không phải HTML.

```json
{
  "id": 1, // Tự động tăng
  "title": "Tiêu đề chính của trang",
  "url": "URL của trang",
  "date": "Thời gian lưu (ISO string)",
  "summaries": [
    {
      "title": "Tóm tắt Video",
      "content": "Nội dung tóm tắt video (Markdown)..."
    },
    {
      "title": "Tóm tắt Chương",
      "content": "Nội dung tóm tắt chương (Markdown)..."
    }
  ]
}
```

---

## Các bước thực hiện chi tiết

### Bước 1: Cập nhật Schema và Logic của IndexedDB (`src/lib/indexedDBService.js`)

1.  **Tăng `DB_VERSION` lên `2`**.
2.  Trong sự kiện `onupgradeneeded`, tạo Object Store `history` nếu chưa tồn tại.
3.  Tạo hàm `addHistory(historyData)` để thêm mục mới vào lịch sử và xóa mục cũ nhất nếu vượt quá `const HISTORY_LIMIT = 50`.
4.  Tạo hàm `getAllHistory()` để lấy dữ liệu từ store `history`.

### Bước 2: Cập nhật `src/stores/summaryStore.svelte.js`

1.  **Lưu trữ cả Markdown thô và HTML:**
    - State của store sẽ cần được điều chỉnh để lưu cả hai dạng. Ví dụ, thay vì `summaryState.summary = marked.parse(text)`, chúng ta sẽ có `summaryState.summaryRaw = text` và `summaryState.summaryHtml = marked.parse(text)`.
    - Các component hiển thị sẽ sử dụng phiên bản HTML.
    - Các hàm lưu trữ sẽ sử dụng phiên bản **Markdown thô**.
2.  **Tạo hàm `saveAllGeneratedSummariesToArchive()`:**
    - Thu thập tất cả các bản tóm tắt (dưới dạng **Markdown thô**) vào một đối tượng duy nhất.
    - Gọi `addSummary()` từ `indexedDBService`.
3.  **Tạo hàm `logAllGeneratedSummariesToHistory()`:**
    - Được gọi tự động sau khi tóm tắt thành công.
    - Thu thập tất cả các bản tóm tắt (dưới dạng **Markdown thô**) vào một đối tượng duy nhất.
    - Gọi `addHistory()` từ `indexedDBService`.

### Bước 3: Cập nhật các Component Giao diện

1.  **`src/components/buttons/SaveToArchiveButton.svelte`:**

    - Đơn giản hóa component, loại bỏ props. `onclick` sẽ gọi `saveAllGeneratedSummariesToArchive()`.

2.  **Các component `...Display.svelte`:**

    - Cập nhật cách sử dụng `SaveToArchiveButton`.
    - Đảm bảo chúng hiển thị phiên bản HTML của tóm tắt từ store.

3.  **`src/entrypoints/archive/App.svelte`:**
    - **Thêm Tab:** Tạo giao diện tab "Lưu trữ" và "Lịch sử".
    - **Quản lý trạng thái và tải dữ liệu:**
      - `let activeTab = $state('archive')`.
      - `let archiveList = $state([])`, `let historyList = $state([])`.
      - Trong `$effect`, gọi `getAllSummaries()` và `getAllHistory()` để điền dữ liệu.
    - **Hiển thị danh sách (`SidePanel.svelte`):**
      - `SidePanel` sẽ hiển thị danh sách tương ứng với tab đang hoạt động.
    - **Hiển thị nội dung:**
      - Vùng hiển thị chính sẽ lặp qua mảng `selectedSummary.summaries`.
      - **Quan trọng:** Bên trong vòng lặp, nó sẽ sử dụng `{@html marked.parse(subSummary.content)}` để chuyển đổi nội dung Markdown được lưu trong DB thành HTML để hiển thị.

---

Cảm ơn bạn đã chỉ ra điểm quan trọng này. Kế hoạch bây giờ đã chính xác hơn. Nếu bạn đã hài lòng, hãy yêu cầu tôi "toggle to Act mode" để tôi bắt đầu triển khai.
