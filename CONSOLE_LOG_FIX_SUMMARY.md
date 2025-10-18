# Tóm tắt sửa lỗi console.log lặp lại nhiều lần

## Vấn đề gốc

Khi người dùng nhấn nút tóm tắt chỉ một lần, hệ thống lại gọi nhiều lần API trích xuất transcript, gây ra:

- Hiển thị nhiều console.log trùng lặp
- Lãng phí tài nguyên gọi API không cần thiết
- Trải nghiệm người dùng không tốt

## Nguyên nhân chính

1. **Trích xuất nội dung lặp lại**: `useSummarization.svelte.js` gọi `extractPageContent()` một lần, nhưng sau đó `SummarizationService.summarize()` lại gọi `extractPageContent()` lần nữa.
2. **Trích xuất timestamped transcript riêng biệt**: Với YouTube, hệ thống lại gọi thêm `extractTimestampedTranscript()` lần thứ ba.
3. **Logic cache không tối ưu**: `MessageBasedTranscriptExtractor` không sử dụng cache hiệu quả.
4. **Thiếu cơ chế debounce**: Người dùng có thể nhấn nút nhiều lần gây ra việc gọi hàm lặp lại.

## Các thay đổi đã thực hiện

### 1. Sửa useSummarization.svelte.js

- Thay đổi logic để truyền nội dung đã trích xuất vào `SummarizationService` thay vì để nó trích xuất lại
- Sửa các lời gọi hàm:
  - `summarizeService.summarize()` → `summarizeService.summarizeWithContent(content, contentType, settings)`
  - `summarizeService.summarizeCourseSummary()` → `summarizeService.summarizeCourseSummaryWithContent(content, settings)`
  - `summarizeService.extractCourseConcepts()` → `summarizeService.extractCourseConceptsWithContent(content, settings)`

### 2. Thêm phương thức mới vào SummarizationService.js

- `summarizeWithContent(content, contentType, settings)`: Nhận nội dung đã trích xuất thay vì trích xuất lại
- `summarizeCourseSummaryWithContent(content, settings)`: Tóm tắt khóa học với nội dung đã có
- `extractCourseConceptsWithContent(content, settings)`: Trích xuất khái niệm khóa học với nội dung đã có

### 3. Cải thiện MessageBasedTranscriptExtractor.js

- Thêm phương thức `isTranscriptCached()` để kiểm tra cache hiệu quả hơn
- Cải thiện logic cache để sử dụng cache ngay cả khi video đã thay đổi
- Giảm thiểu việc fetch lại transcript không cần thiết

### 4. Thêm debounce vào SummarizeButton.svelte

- Thêm state `isDebouncing` để theo dõi trạng thái debounce
- Thêm timeout 1 giây để ngăn việc nhấn nút nhiều lần
- Vô hiệu hóa nút khi đang debouncing

### 5. Thêm debounce vào FloatingButton.svelte

- Thêm state `isClickDebouncing` để theo dõi trạng thái debounce
- Thêm timeout 1 giây để ngăn việc nhấn nút nhiều lần
- Áp dụng debounce cho cả one-click handler và toggle handler

## Kết quả mong đợi

- Chỉ trích xuất transcript MỘT LẦN DUY NHẤT khi người dùng nhấn nút tóm tắt
- Giảm thiểu số lượng console.log được hiển thị
- Tăng hiệu suất bằng cách sử dụng cache hiệu quả
- Ngăn việc gọi API nhiều lần thông qua cờ `isProcessing` trong useSummarization
- Cải thiện trải nghiệm người dùng (không có debounce gây khó chịu)

## Sơ đồ luồng xử lý sau khi sửa

```
User clicks Summarize → useSummarization.summarizePageContent
→ ContentExtractorService.extractPageContent (MỘT LẦN DUY NHẤT)
→ SummarizationService.summarizeWithContent với content đã có
→ Chỉ extract timestamped transcript khi cần với cache check
```

## Các file đã thay đổi

1. `src/entrypoints/content/composables/useSummarization.svelte.js`
2. `src/entrypoints/content/services/SummarizationService.js`
3. `src/entrypoints/content/extractors/MessageBasedTranscriptExtractor.js`
4. `src/components/buttons/SummarizeButton.svelte`
5. `src/entrypoints/content/components/FloatingButton.svelte`
