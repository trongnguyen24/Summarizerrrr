# Kế hoạch implement tính năng "1 Click to Summarize"

## Tổng quan

Thêm tính năng cho phép người dùng bật/tắt chế độ tóm tắt 1-click, khi bật thì click FloatingButton sẽ:

- Hiện loading spinner
- Tự động bắt đầu summarize
- Auto-mở panel khi xong/lỗi
- Không re-summarize nếu đã có summary cho URL hiện tại

## Chi tiết thực hiện

### 1. Thêm Settings (settingsStore.svelte.js)

- Thêm `oneClickSummarize: false` vào DEFAULT_SETTINGS
- Mặc định tắt, người dùng tự bật

### 2. Cập nhật FAB Settings UI (FABSettings.svelte)

- Thêm toggle button trong FAB Settings
- UI tương tự các settings khác (show/hide pattern)
- description và preview (tôi tự làm)

### 3. Tạo Composable mới (useOneClickSummarization.svelte.js)

- Kết hợp useSummarization với auto-panel logic
- Quản lý state cache per URL để tránh re-summarize
- Handle URL changes (SPA navigation)

### 4. Cập nhật FloatingButton (FloatingButton.svelte)

- Thêm props: oneClickMode, onSummarize callback
- 3 states: idle (icon), loading (spinner), error (flash đỏ)
- Logic: nếu oneClick + chưa có summary → summarize, ngược lại → toggle

### 5. Tích hợp App.svelte

- Truyền callbacks và settings cho FloatingButton
- Xử lý auto-open panel sau summarization
- Sync với URL navigation system hiện có

### 6. Smart Behavior

- Track summary state per URL
- Prevent re-summarize cho cùng content
- Handle SPA navigation (Reddit-like apps)

## Technical Notes

- Sử dụng Map để cache summary state theo URL
- Tái sử dụng useNavigationManager hiện có
- Loading state ưu tiên UX feedback
- Error handling với visual feedback
