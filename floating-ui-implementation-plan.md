# Kế hoạch triển khai Content Script UI - Shadow Root

## Tổng quan

Thêm Content Script UI sử dụng Shadow Root để hiển thị tóm tắt trực tiếp trên trang web, hỗ trợ cả desktop và mobile khi không sử dụng được sidepanel.

## Phân tích dự án hiện tại

### Cấu trúc hiện tại

- **Framework**: WXT với Svelte 5, TailwindCSS 4, JavaScript (không TypeScript)
- **UI chính**: Sidepanel (Chrome) / Sidebar (Firefox)
- **Content Scripts**: YouTube, Udemy, Coursera specific
- **State Management**: Stores toàn cục (summaryStore, settingsStore, etc.)
- **Background Script**: Giao tiếp và điều phối

### Tài nguyên có thể tái sử dụng

- `summaryStore.svelte.js` - Logic tóm tắt
- `settingsStore.svelte.js` - Cài đặt user
- Components display hiện có
- API services và message handlers

## Kế hoạch thực hiện chi tiết

### Giai đoạn 1: Chuẩn bị cấu trúc file

#### 1.1 Tạo cấu trúc thư mục mới

```
src/entrypoints/floating-ui/
├── main.js                    # Entry point content script
├── FloatingUI.svelte         # Component chính
├── components/
│   ├── FloatingButton.svelte # Nút floating
│   ├── FloatingPanel.svelte  # Panel nội dung
│   ├── MobileSheet.svelte    # Bottom sheet cho mobile
│   └── SettingsMini.svelte   # Settings thu gọn
└── styles/
    └── floating-ui.css       # Styles riêng cho Shadow DOM
```

#### 1.2 Cập nhật cấu hình WXT

- Thêm matches pattern `['<all_urls>']` cho content script mới
- Cấu hình CSS injection cho Shadow DOM
- Thêm permissions nếu cần thiết

### Giai đoạn 2: Xây dựng Shadow DOM Foundation

#### 2.1 Tạo Content Script chính

- Khởi tạo Shadow DOM với closed mode
- Inject TailwindCSS vào Shadow DOM
- Tạo root container cho Svelte app
- Setup event listeners và message handlers

#### 2.2 Phát hiện môi trường

- Detect mobile vs desktop
- Check current page type (YouTube/Course/Web)
- Determine optimal UI layout

#### 2.3 CSS Isolation

- Tạo CSS custom properties cho theming
- Đảm bảo styles không conflict với trang gốc
- Setup responsive breakpoints
- Dark/light mode support

### Giai đoạn 3: Xây dựng UI Components

#### 3.1 FloatingButton Component

- **Desktop**: Fixed position button góc phải
- **Mobile**: Bottom-right corner với touch target lớn
- Animation states (idle, active, loading)
- Badge notification cho available content
- Drag functionality cho repositioning

#### 3.2 FloatingPanel Component (Desktop)

- Resizable panel với min/max constraints
- Draggable header với title
- Close/minimize/maximize controls
- Content area với scroll handling
- Z-index management tránh conflicts

#### 3.3 MobileSheet Component (Mobile)

- Bottom sheet với backdrop
- Swipe gestures (open/close/minimize)
- Header với grab handle
- Touch-friendly controls
- Keyboard safe area handling

#### 3.4 Content Display Areas

- Tái sử dụng components từ sidepanel:
  - `GenericSummaryDisplay.svelte`
  - `YouTubeSummaryDisplay.svelte`
  - `CourseSummaryDisplay.svelte`
- Adapt cho floating UI constraints
- Mini TOC navigation

### Giai đoạn 4: State Management Integration

#### 4.1 Message Passing Architecture

- Setup bidirectional communication với background script
- Sync với existing summaryStore logic
- Handle settings synchronization
- Error state management

#### 4.2 Local State Management

- UI state (open/closed, position, size)
- Cache summary data locally
- Handle loading states
- Offline fallback behavior

#### 4.3 Cross-tab Synchronization

- Share state với sidepanel nếu đang mở
- Prevent duplicate summarization requests
- Sync archived summaries

### Giai đoạn 5: Core Functionality Implementation

#### 5.1 Auto-detection và Summarization

- Detect page type và auto-suggest summarization
- Handle YouTube/Course/Web content differently
- Show preview/teaser before full summarization
- Progress indicators during processing

#### 5.2 Selected Text Summarization

- Integrate với existing context menu
- Show floating button near selection
- Quick summarize popup
- Save to archive functionality

#### 5.3 Settings Integration

- Mini settings panel trong floating UI
- Sync với main settings
- Quick toggles for common options
- Theme switching

### Giai đoạn 6: Mobile Optimization

#### 6.1 Touch Interface

- Larger touch targets (44px minimum)
- Swipe gestures cho navigation
- Pull-to-refresh functionality
- Haptic feedback integration

#### 6.2 Performance Optimization

- Lazy loading components
- Virtual scrolling cho long content
- Memory management
- Battery usage optimization

#### 6.3 Responsive Behavior

- Orientation change handling
- Keyboard appearance adjustments
- Safe area insets
- Viewport meta considerations

### Giai đoạn 7: Advanced Features

#### 7.1 Positioning và Persistence

- Remember last position/size
- Smart positioning (avoid overlapping important content)
- Multiple monitor support
- Collision detection với existing page elements

#### 7.2 Accessibility

- ARIA labels và descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management

#### 7.3 Performance Features

- Intersection Observer cho smart showing/hiding
- Throttled scroll events
- Debounced resize handlers
- Memory leak prevention

### Giai đoạn 8: Integration và Testing

#### 8.1 Background Script Integration

- Extend existing message handlers
- Add new action types cho floating UI
- Handle permission requests
- Error propagation

#### 8.2 Cross-browser Compatibility

- Firefox specific adjustments
- Safari support considerations
- Edge compatibility testing
- Mobile browser testing

#### 8.3 Conflict Resolution

- Handle existing page modifiers
- Dark Reader compatibility
- Ad blocker interactions
- Other extension conflicts

## Thứ tự triển khai được đề xuất

### Sprint 1: Foundation (3-4 ngày)

1. Tạo cấu trúc file và cấu hình WXT
2. Xây dựng Shadow DOM foundation
3. Tạo basic FloatingButton component
4. Test injection và CSS isolation

### Sprint 2: Core UI (4-5 ngày)

1. Xây dựng FloatingPanel cho desktop
2. Tạo MobileSheet cho mobile
3. Implement basic open/close functionality
4. Responsive breakpoint handling

### Sprint 3: Content Integration (5-6 ngày)

1. Message passing với background script
2. Tái sử dụng existing display components
3. State synchronization
4. Basic summarization functionality

### Sprint 4: Mobile Optimization (3-4 ngày)

1. Touch interface improvements
2. Gesture handling
3. Performance optimization
4. iOS/Android specific testing

### Sprint 5: Polish và Advanced Features (4-5 ngày)

1. Accessibility improvements
2. Animation và transitions
3. Settings integration
4. Error handling improvements

### Sprint 6: Testing và Bug Fixes (2-3 ngày)

1. Cross-browser testing
2. Performance optimization
3. Bug fixes và refinements
4. Documentation updates

## Rủi ro và giải pháp

### Rủi ro kỹ thuật

- **Shadow DOM support**: Fallback cho browsers cũ
- **CSS conflicts**: Comprehensive testing với popular sites
- **Memory leaks**: Proper cleanup và testing tools
- **Mobile performance**: Optimization và lazy loading

### Rủi ro UX

- **User confusion**: Clear onboarding và help system
- **Positioning conflicts**: Smart positioning algorithms
- **Mobile usability**: Extensive mobile testing
- **Accessibility**: Compliance testing với screen readers

## Metrics đánh giá thành công

- Load time < 200ms cho floating button
- Memory usage < 10MB additional
- No conflicts với top 100 websites
- 95%+ mobile usability score
- Full accessibility compliance
- Cross-browser compatibility 98%+

## Tài liệu cần thiết

- User guide cho floating UI
- Developer documentation
- API reference cho message passing
- Troubleshooting guide
- Mobile best practices guide
