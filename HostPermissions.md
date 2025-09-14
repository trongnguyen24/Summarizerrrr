<ExitPlanMode>
<plan>
## Plan Implementation: Extension Domain Control

### Overview

Tạo tính năng cho phép người dùng bật/tắt extension trên các loại trang web khác nhau: Tất cả trang web, YouTube, Coursera, và Udemy.

### Implementation Steps

**Bước 1: Settings Store Enhancement**

- Thêm `extensionPermissions` object vào DEFAULT_SETTINGS
- Bao gồm các toggle: `allWebsites`, `youTubeEnabled`, `courseraEnabled`, `udemyEnabled`

**Bước 2: Domain Permission Service**

- Tạo `DomainPermissionService` để detect domain type
- Implement logic kiểm tra permissions dựa trên URL
- Support YouTube, Coursera, Udemy, và general websites

**Bước 3: Content Script Logic Update**

- Cập nhật `content.js` để load settings trước khi mount UI
- Thêm conditional logic để skip mounting khi không được phép
- Implement real-time permission changes

**Bước 4: Settings UI**

- Thêm section mới trong `GeneralSettings.svelte`
- Sử dụng existing Switch component
- Tạo toggle switches cho từng loại trang web

**Bước 5: Localization**

- Cập nhật `vi.json` và `en.json` với text mới
- Thêm descriptions cho từng toggle option

**Bước 6: Testing**

- Test trên YouTube, Coursera, trang web thường
- Verify real-time toggle functionality
- Ensure settings persistence

### Technical Details

- Sử dụng URL regex patterns để detect domain types
- Leverage existing settings infrastructure
- Maintain backward compatibility
- Support real-time updates without page reload

Bạn có muốn tôi bắt đầu implement plan này không?
</plan>
</ExitPlanMode>
