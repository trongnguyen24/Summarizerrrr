# FloatingPanel — Auto-chọn Display theo contentType (Kế hoạch & Pseudo-code)

Mục tiêu

- Tự động render component display phù hợp với loại nội dung:
  - youtube -> YouTubeSummaryDisplay
  - course -> CourseSummaryDisplay
  - general/khác -> GenericSummaryDisplay
- Giữ nguyên UI, children.actionButton và children.settingsMini
- Không thay đổi luồng summarize hiện tại; chỉ thay thế phần hiển thị summary
- Logging gọn: contentType + display được chọn

Bối cảnh hiện tại

- File: [`FloatingPanel.svelte`](src/entrypoints/content/components/FloatingPanel.svelte)
- Xác định contentType:
  - Hàm [`getContentTypeFromURL()`](src/entrypoints/content/components/FloatingPanel.svelte:132) trả về 'youtube' | 'course' | 'general'
  - Giá trị được lưu vào [`localSummaryState.contentType`](src/entrypoints/content/components/FloatingPanel.svelte:20)
- Gọi API tóm tắt:
  - Streaming: [`summarizeContentStream(content, contentType)`](src/lib/api/api.js:1)
  - Non-stream: [`summarizeContent(content, contentType)`](src/lib/api/api.js:1)
- Khu vực render hiện tại: khối if trong `.panel-content` dùng `{@html summaryToDisplay}`

Thay đổi tối thiểu đề xuất

1. Import các display (ở đầu file FloatingPanel.svelte)

- [`YouTubeSummaryDisplay.svelte`](src/components/displays/YouTubeSummaryDisplay.svelte)
- [`CourseSummaryDisplay.svelte`](src/components/displays/CourseSummaryDisplay.svelte)
- [`GenericSummaryDisplay.svelte`](src/components/displays/GenericSummaryDisplay.svelte)

2. Thêm hàm chọn display theo contentType

- Tạo `selectDisplay(contentType)` trả về Component tương ứng
- Có logging tên display để debug
- Có fallback Generic

3. Sửa block render ở `.panel-content`

- Nếu loading/error: giữ nguyên
- Nếu có summary: render Component từ `selectDisplay` và truyền props: `summary`, `contentType`, `status`
- Nếu không có summary: giữ “No summary available.”

4. Không động chạm `children.actionButton` và `children.settingsMini`

Pseudo-code chi tiết (Svelte 5)

- Import components:

```svelte
<script>
// @ts-nocheck
import YouTubeSummaryDisplay from '@/components/displays/YouTubeSummaryDisplay.svelte'
import CourseSummaryDisplay from '@/components/displays/CourseSummaryDisplay.svelte'
import GenericSummaryDisplay from '@/components/displays/GenericSummaryDisplay.svelte'
</script>
```

- Thêm selector:

```js
function selectDisplay(type) {
  const t = (type || '').toLowerCase()
  if (t === 'youtube') {
    console.log('[FloatingPanel] Display selected: YouTubeSummaryDisplay')
    return YouTubeSummaryDisplay
  }
  if (t === 'course') {
    console.log('[FloatingPanel] Display selected: CourseSummaryDisplay')
    return CourseSummaryDisplay
  }
  console.log(
    '[FloatingPanel] Display selected: GenericSummaryDisplay (fallback)'
  )
  return GenericSummaryDisplay
}
```

- Derived component để render:

```js
let DisplayComponent = $derived(
  selectDisplay(localSummaryState.contentType || 'general')
)
```

- Cập nhật block render `.panel-content`:

```svelte
{#if statusToDisplay === 'loading'}
  <p>Loading... {localSummaryState.isLoading ? '(FloatingPanel)' : ''}</p>
{:else if statusToDisplay === 'error'}
  <p>Error: {localSummaryState.error?.message || 'An error occurred.'}</p>
{:else if summaryToDisplay}
  <DisplayComponent
    summary={summaryToDisplay}
    contentType={localSummaryState.contentType}
    status={statusToDisplay}
  />
{:else}
  <p>No summary available.</p>
{/if}
```

Props chuẩn tối thiểu giữa các display

- summary: string (nội dung đã tóm tắt hoặc đoạn markdown/HTML)
- contentType: 'youtube' | 'course' | 'general'
- status: 'loading' | 'error' | 'done' (ở đây là giá trị từ `statusToDisplay`, khi không loading/error coi là done)

Gợi ý mở rộng props (tùy ý, có thể thêm sau)

- provider: settings.selectedProvider
- model: settings.selectedModel hoặc tương đương từ provider-config
- options: length/tone/format từ settings (nếu display muốn biết để render nhãn/metadata)

Logging đề xuất

- Trong `selectDisplay`: log `contentType` và tên component đã chọn
- Giữ nguyên logging thời gian đã có sau summarize

Khả năng mở rộng trong tương lai

- Override thủ công từ UI:
  - Thêm setting `DisplayMode = 'Auto' | 'YouTube' | 'Course' | 'Generic'`
  - Nếu ≠ 'Auto' thì bỏ qua `contentType`, dùng display theo `DisplayMode`
- Hỗ trợ `TabbedSummaryDisplay`:
  - Có thể tạo case riêng trong `selectDisplay` theo setting nâng cao

Rủi ro & phòng tránh

- Props mismatch: Display kỳ vọng props phức tạp hơn. Bắt đầu với 3 props tối thiểu để an toàn; display tự dùng `summary` để render cơ bản.
- XSS: Trước đây dùng `{@html}` trực tiếp. Khi chuyển sang display component, nên để display tự xử lý việc sanitize nếu có chèn HTML.

Kế hoạch áp dụng (bước thực thi)

1. Import 3 display vào FloatingPanel
2. Thêm `selectDisplay(contentType)` + logging
3. Thay block render `.panel-content` để dùng `DisplayComponent`
4. Giữ nguyên `children.actionButton` và `children.settingsMini`
5. Test 3 trang:
   - YouTube: `youtube.com/watch` → YouTubeSummaryDisplay
   - Udemy/Coursera lecture/supplement → CourseSummaryDisplay
   - Trang thông thường → GenericSummaryDisplay
6. Kiểm tra fallback: nếu không khớp pattern → GenericSummaryDisplay

Trạng thái TODO liên quan

- Import 3 display
- selectDisplay(contentType) + logging
- Cập nhật render `.panel-content` dùng component được chọn
- Giữ nguyên children.\* và UI khác
- Test youtube/course/general; xác nhận fallback Generic
