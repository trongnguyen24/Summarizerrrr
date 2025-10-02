# Kế hoạch Implementation: Optional Permissions cho Firefox (Core Only)

## Tổng quan

Xây dựng tính năng core cho optional permissions:

- Check permissions trực tiếp từ Firefox API
- Tự động yêu cầu permission khi cần
- UI đơn giản với HTML checkbox

## 1. Permission Service (`src/services/firefoxPermissionService.js`)

### Chức năng chính:

```javascript
// Core functions:
- getRequiredPermission(url) → string
- checkPermission(url) → Promise<boolean>
- requestPermission(url) → Promise<boolean>
```

### Logic ánh xạ domain → permission:

- `youtube.com` → `*://*.youtube.com/*`
- `udemy.com` → `*://*.udemy.com/*`
- `reddit.com` → `*://*.reddit.com/*`
- `coursera.org` → `*://*.coursera.org/*`
- Các site khác → `https://*/*`

### Core Implementation:

```javascript
// src/services/firefoxPermissionService.js
export function getRequiredPermission(url) {
  if (url.includes('youtube.com')) return '*://*.youtube.com/*'
  if (url.includes('udemy.com')) return '*://*.udemy.com/*'
  if (url.includes('reddit.com')) return '*://*.reddit.com/*'
  if (url.includes('coursera.org')) return '*://*.coursera.org/*'
  return 'https://*/*'
}

export async function checkPermission(url) {
  const permission = getRequiredPermission(url)
  return await browser.permissions.contains({ origins: [permission] })
}

export async function requestPermission(url) {
  const permission = getRequiredPermission(url)
  return await browser.permissions.request({ origins: [permission] })
}
```

## 2. Settings UI trong GeneralSettings.svelte

### Vị trí thêm:

Sau section "Phím tắt", thêm section đơn giản:

```svelte
<!-- Chỉ hiển thị khi build cho Firefox -->
{#if import.meta.env.BROWSER === 'firefox'}
<div class="flex flex-col gap-2 px-5 pb-4">
  <label class="block text-text-secondary">
    Optional Permissions
  </label>

  <!-- Checkbox đơn giản, check trực tiếp từ Firefox API -->
  <div class="flex flex-col gap-3">
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={youtubePermission} on:change={handleYouTubePermission} />
      <span>YouTube Access</span>
    </label>

    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={udemyPermission} on:change={handleUdemyPermission} />
      <span>Udemy Access</span>
    </label>

    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={redditPermission} on:change={handleRedditPermission} />
      <span>Reddit Access</span>
    </label>

    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={courseraPermission} on:change={handleCourseraPermission} />
      <span>Coursera Access</span>
    </label>

    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={httpsPermission} on:change={handleHttpsPermission} />
      <span>General Website Access</span>
    </label>
  </div>
</div>
{/if}
```

### Logic:

- Load permission state từ Firefox API khi component mount
- Khi user check/uncheck → request/remove permission trực tiếp
- Không lưu vào settings store

### Event Handlers:

```javascript
// Load permission states từ Firefox API
async function loadPermissionStates() {
  youtubePermission = await browser.permissions.contains({
    origins: ['*://*.youtube.com/*'],
  })
  udemyPermission = await browser.permissions.contains({
    origins: ['*://*.udemy.com/*'],
  })
  redditPermission = await browser.permissions.contains({
    origins: ['*://*.reddit.com/*'],
  })
  courseraPermission = await browser.permissions.contains({
    origins: ['*://*.coursera.org/*'],
  })
  httpsPermission = await browser.permissions.contains({
    origins: ['https://*/*'],
  })
}

// Handle checkbox changes
async function handleYouTubePermission(event) {
  if (event.target.checked) {
    await browser.permissions.request({ origins: ['*://*.youtube.com/*'] })
  } else {
    await browser.permissions.remove({ origins: ['*://*.youtube.com/*'] })
  }
}
// Similar handlers cho các permissions khác...
```

## 3. Summary Store Integration (`src/stores/summaryStore.svelte.js`)

### Modification trong `fetchAndSummarize()`:

Thêm logic check permission trước khi summarize:

```javascript
// Thêm vào đầu function fetchAndSummarize() (sau line ~143)
if (import.meta.env.BROWSER === 'firefox') {
  const currentUrl = tabInfo.url
  const hasPermission = await checkPermission(currentUrl)

  if (!hasPermission) {
    const permissionGranted = await requestPermission(currentUrl)
    if (!permissionGranted) {
      throw new Error('Permission denied for this website')
    }
  }
}
```

### Import service:

```javascript
// Thêm import vào đầu file
import {
  checkPermission,
  requestPermission,
} from '@/services/firefoxPermissionService.js'
```

## 4. File Structure (Core Only)

```
src/
├── services/
│   └── firefoxPermissionService.js     # [NEW] Core permission logic
├── stores/
│   └── summaryStore.svelte.js          # [MODIFY] Add permission check
└── components/settings/
    └── GeneralSettings.svelte          # [MODIFY] Add simple checkbox UI
```

## 5. Implementation Steps

1. **Tạo firefoxPermissionService.js**

   - 3 functions cơ bản: getRequiredPermission, checkPermission, requestPermission
   - Logic ánh xạ URL → permission pattern

2. **Update GeneralSettings.svelte**

   - Thêm checkbox section với `import.meta.env.BROWSER === 'firefox'`
   - Load permission states từ browser API
   - Handle checkbox changes trực tiếp với browser API

3. **Update summaryStore.svelte.js**

   - Import permission service
   - Thêm permission check vào đầu fetchAndSummarize()
   - Error handling cho permission denied

4. **Test**
   - Build Firefox version: `npm run build:firefox`
   - Test permission requests trên các website
   - Verify checkbox sync với browser permissions

## Notes:

- **Core only**: Chỉ implement basic functionality
- **No settings store**: Check trực tiếp từ Firefox API
- **Simple HTML**: Dùng checkbox thay vì Switch component
- **No complex UI**: Tránh làm những thứ linh tinh
- **Firefox only**: Wrap tất cả trong `import.meta.env.BROWSER === 'firefox'`
