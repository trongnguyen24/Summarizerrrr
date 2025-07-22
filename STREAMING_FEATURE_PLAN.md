# Streaming vs Non-Streaming Feature Implementation Plan

## 📋 Project Overview

### Mục tiêu

Tạo tính năng setting cho phép người dùng chuyển đổi giữa chế độ streaming và non-streaming khi gọi API, nhằm giải quyết vấn đề lag trên các máy tính có cấu hình thấp.

### Vấn đề cần giải quyết

- Máy tính cấu hình thấp gặp lag khi xử lý streaming data real-time
- Người dùng muốn lựa chọn giữa trải nghiệm real-time vs hiệu năng ổn định
- Cần fallback mechanism cho các provider không hỗ trợ streaming

## 🔍 Technical Analysis

### Current State

**Streaming Functions (Đã có):**

- `summarizeContentStream()` - API streaming cho general content
- `summarizeChaptersStream()` - API streaming cho YouTube chapters
- `fetchAndSummarizeStream()` - Store function cho streaming
- `StreamingMarkdown.svelte` - Component hiển thị streaming content

**Non-Streaming Functions (Đã có):**

- `summarizeContent()` - API non-streaming cho general content
- `summarizeChapters()` - API non-streaming cho YouTube chapters
- `fetchAndSummarize()` - Store function cho non-streaming

### Architecture Overview

```
User Setting (enableStreaming)
    ↓
Settings Store (settingsStore.svelte.js)
    ↓
Summary Store (summaryStore.svelte.js)
    ↓
API Layer (api.js)
    ↓
Provider Layer (providers/*.js)
    ↓
Display Components (displays/*.svelte)
```

## 🛠️ Implementation Plan

### Phase 1: Settings Infrastructure

**Step 1.1: Update Settings Store**

- File: `src/stores/settingsStore.svelte.js`
- Add: `enableStreaming: true` to DEFAULT_SETTINGS
- Location: Sau line với `selectedFont: 'default'`

**Step 1.2: Update General Settings UI**

- File: `src/components/settings/GeneralSettings.svelte`
- Add streaming toggle section
- Position: Sau font family section, trước theme section

### Phase 2: Core Logic Implementation

**Step 2.1: Update Summary Store**

- File: `src/stores/summaryStore.svelte.js`
- Modify: `fetchAndSummarize()` function
- Add conditional logic để chọn streaming hoặc non-streaming
- Apply cho tất cả summary types: YouTube, Course, Selected Text

**Step 2.2: Add Provider Streaming Check**

- File: `src/lib/api.js`
- Add helper function: `providerSupportsStreaming()`
- Implement fallback logic trong các streaming functions

### Phase 3: Display Layer Updates

**Step 3.1: Update SummaryContent Component**

- File: `src/components/displays/SummaryContent.svelte`
- Modify StreamingMarkdown để handle both modes
- Add instant display mode cho non-streaming content

**Step 3.2: Update StreamingMarkdown Component**

- File: `src/components/StreamingMarkdown.svelte`
- Add `instantDisplay` prop
- Skip typing animation khi không phải streaming mode

### Phase 4: Testing & Polish

**Step 4.1: Browser Testing**

- Chrome và Firefox compatibility
- Performance comparison tests
- Low-end device testing

**Step 4.2: UI Polish**

- Thêm loading indicators phù hợp
- Error handling cho mode switching
- Settings descriptions

## 📁 File Structure Changes

### Files cần sửa đổi:

**1. `src/stores/settingsStore.svelte.js`**

```javascript
// Thêm vào DEFAULT_SETTINGS:
enableStreaming: true, // Enable streaming by default
```

**2. `src/stores/summaryStore.svelte.js`**

```javascript
// Thay đổi main function:
export async function fetchAndSummarize() {
  // Existing logic...

  if (
    settings.enableStreaming &&
    providerSupportsStreaming(selectedProviderId)
  ) {
    return await fetchAndSummarizeStream()
  } else {
    // Use existing non-streaming logic
  }
}
```

**3. `src/components/settings/GeneralSettings.svelte`**

```svelte
<!-- Thêm streaming toggle section -->
<div class="flex flex-col gap-2 p-5">
  <label class="block text-text-secondary">Response Mode</label>
  <div class="grid grid-cols-2 w-full gap-1">
    <!-- Streaming và Non-streaming buttons -->
  </div>
</div>
```

**4. `src/lib/api.js`**

```javascript
// Thêm helper function:
function providerSupportsStreaming(providerId) {
  // Check if provider has generateContentStream method
}
```

**5. `src/components/displays/SummaryContent.svelte`**

```svelte
<!-- Update StreamingMarkdown props -->
<StreamingMarkdown
  sourceMarkdown={summary}
  speed={settings.enableStreaming ? 50 : 0}
  instantDisplay={!settings.enableStreaming}
  onFinishTyping={handleMarkdownFinishTyping}
  class="custom-markdown-style"
/>
```

### Files mới tạo:

Không cần tạo file mới - sử dụng existing components và infrastructure.

## 🎨 UI/UX Specifications

### Setting Interface Design

**Location**: General Settings section  
**Position**: Giữa Font Family và Theme settings

**Visual Layout**:

```
Response Mode
┌─────────────────┬─────────────────┐
│   ⚡ Streaming   │ 📱 Non-streaming │
│   (Real-time)   │  (Stable mode)  │
└─────────────────┴─────────────────┘

Description:
• Streaming: Real-time response display, better experience
• Non-streaming: Suitable for low-end devices, reduce lag
```

**Button States**:

- **Active**: Primary color background với icon
- **Inactive**: Gray background với muted text
- **Hover**: Subtle highlight effect

### User Experience Flow

**1. Default State**: Streaming enabled
**2. User clicks Non-streaming**:

- Settings save immediately
- Next summarization sử dụng non-streaming mode
- StreamingMarkdown shows instant display
  **3. Performance Impact**:
- Streaming: Progressive content display
- Non-streaming: Wait → Full content display

## 📝 Notes & Considerations

### Technical Considerations

- StreamingMarkdown component đã optimize tốt cho performance
- Existing provider architecture support both streaming/non-streaming
- Settings store pattern đã consistent với existing codebase

### User Experience Considerations

- Default to streaming for better experience
- Clear descriptions about trade-offs
- No disruption to existing workflows

### Performance Considerations

- Non-streaming mode sẽ reduce memory usage
- Streaming mode provides better perceived performance
- Proper cleanup cần thiết cho cả hai modes

---

**Last Updated**: 2025-01-22  
**Status**: Ready for Implementation  
**Estimated Effort**: 4 days development + testing
