## Tóm tắt về Vấn đề i18n trong Shadow DOM

Sau khi phân tích chi tiết dự án Summarizerrrr, tôi đã xác định được các vấn đề chính và giải pháp cho việc sử dụng i18n trong Shadow DOM:

### 🔍 **Vấn đề Chính**

1. **Content Script thiếu khởi tạo i18n**:

   - File `src/entrypoints/content.js` không khởi tạo svelte-i18n như các entrypoint khác
   - Shadow DOM components không thể sử dụng `$t()` function

2. **Context Isolation**:

   - Shadow DOM tạo ra boundary cô lập i18n context
   - Components trong Shadow DOM không thể truy cập i18n store từ main document

3. **Thiếu đồng bộ locale**:
   - Khi thay đổi ngôn ngữ trong settings, Shadow DOM không được cập nhật

### 🛠️ **Giải pháp Đề xuất**

#### **1. Initialize i18n trong Content Script**

```javascript
// src/entrypoints/content.js
import { init, getLocaleFromNavigator } from 'svelte-i18n'
import { loadSettings } from '@/stores/settingsStore.svelte.js'
import '@/lib/i18n/i18n.js'

export default defineContentScript({
  async main(ctx) {
    // Initialize i18n trước khi mount Shadow DOM
    await loadSettings()
    const settings = await getSettings()
    const initialLocale = settings.uiLang || getLocaleFromNavigator()

    await init({
      fallbackLocale: 'en',
      initialLocale,
    })

    // Mount Shadow DOM sau khi i18n đã ready
    const ui = await createShadowRootUi(ctx, {
      // ...existing config
    })
  },
})
```

#### **2. Tạo Locale Sync Mechanism**

```javascript
// src/stores/i18nShadowStore.svelte.js
export function subscribeToLocaleChanges() {
  return settingsStorage.watch((newSettings) => {
    if (newSettings.uiLang && newSettings.uiLang !== currentLocale) {
      locale.set(newSettings.uiLang)
    }
  })
}
```

#### **3. Implementation Plan**

**Phase 1: Core Setup**

- Thêm i18n initialization vào content script
- Import required dependencies
- Ensure proper loading order

**Phase 2: Sync Mechanism**

- Implement locale watcher
- Test cross-boundary updates
- Handle edge cases

**Phase 3: Testing**

- Verify tất cả languages work
- Test performance impact
- Ensure consistent UX

### 📊 **Kiến trúc Mới**

```
Main Document                Shadow DOM (Content Script)
├── Settings (i18n ✅)      ├── i18n initialized ✅
├── Archive (i18n ✅)       ├── FloatingPanel ✅
├── Prompt (i18n ✅)        ├── Components có thể dùng $t() ✅
└── Sidepanel (i18n ✅)     └── Locale sync với settings ✅
```

### 🎯 **Kết quả Mong đợi**

- ✅ Shadow DOM components có thể sử dụng translations
- ✅ Locale changes được sync realtime
- ✅ Consistent user experience across all contexts
- ✅ Proper fallback khi translations missing

Đây là giải pháp comprehensive để giải quyết hoàn toàn vấn đề i18n trong Shadow DOM environment của browser extension.## Tóm tắt về Vấn đề i18n trong Shadow DOM

Sau khi phân tích chi tiết dự án Summarizerrrr, tôi đã xác định được các vấn đề chính và giải pháp cho việc sử dụng i18n trong Shadow DOM:

### 🔍 **Vấn đề Chính**

1. **Content Script thiếu khởi tạo i18n**:

   - File `src/entrypoints/content.js` không khởi tạo svelte-i18n như các entrypoint khác
   - Shadow DOM components không thể sử dụng `$t()` function

2. **Context Isolation**:

   - Shadow DOM tạo ra boundary cô lập i18n context
   - Components trong Shadow DOM không thể truy cập i18n store từ main document

3. **Thiếu đồng bộ locale**:
   - Khi thay đổi ngôn ngữ trong settings, Shadow DOM không được cập nhật

### 🛠️ **Giải pháp Đề xuất**

#### **1. Initialize i18n trong Content Script**

```javascript
// src/entrypoints/content.js
import { init, getLocaleFromNavigator } from 'svelte-i18n'
import { loadSettings } from '@/stores/settingsStore.svelte.js'
import '@/lib/i18n/i18n.js'

export default defineContentScript({
  async main(ctx) {
    // Initialize i18n trước khi mount Shadow DOM
    await loadSettings()
    const settings = await getSettings()
    const initialLocale = settings.uiLang || getLocaleFromNavigator()

    await init({
      fallbackLocale: 'en',
      initialLocale,
    })

    // Mount Shadow DOM sau khi i18n đã ready
    const ui = await createShadowRootUi(ctx, {
      // ...existing config
    })
  },
})
```

#### **2. Tạo Locale Sync Mechanism**

```javascript
// src/stores/i18nShadowStore.svelte.js
export function subscribeToLocaleChanges() {
  return settingsStorage.watch((newSettings) => {
    if (newSettings.uiLang && newSettings.uiLang !== currentLocale) {
      locale.set(newSettings.uiLang)
    }
  })
}
```

#### **3. Implementation Plan**

**Phase 1: Core Setup**

- Thêm i18n initialization vào content script
- Import required dependencies
- Ensure proper loading order

**Phase 2: Sync Mechanism**

- Implement locale watcher
- Test cross-boundary updates
- Handle edge cases

**Phase 3: Testing**

- Verify tất cả languages work
- Test performance impact
- Ensure consistent UX

### 📊 **Kiến trúc Mới**

```
Main Document                Shadow DOM (Content Script)
├── Settings (i18n ✅)      ├── i18n initialized ✅
├── Archive (i18n ✅)       ├── FloatingPanel ✅
├── Prompt (i18n ✅)        ├── Components có thể dùng $t() ✅
└── Sidepanel (i18n ✅)     └── Locale sync với settings ✅
```

### 🎯 **Kết quả Mong đợi**

- ✅ Shadow DOM components có thể sử dụng translations
- ✅ Locale changes được sync realtime
- ✅ Consistent user experience across all contexts
- ✅ Proper fallback khi translations missing

Đây là giải pháp comprehensive để giải quyết hoàn toàn vấn đề i18n trong Shadow DOM environment của browser extension.
