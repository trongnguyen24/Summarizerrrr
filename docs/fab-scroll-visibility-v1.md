# Floating Action Button Scroll Visibility & Settings Selection — V1

> **Hướng dẫn sử dụng tài liệu:** Kế hoạch thực thi độc lập, chia theo từng Phase cụ thể để triển khai trong session mới. Mỗi phase có đầy đủ code mẫu, context và bước kiểm tra (verify).

---

## 1. Bối cảnh & Mục tiêu (Context & Objectives)

### Bối cảnh hiện tại:
- Nút FAB (Floating Action Button) được hiển thị cố định (`position: fixed`) trên các trang web thông qua Content Script ([`FloatingButton.svelte`](../src/entrypoints/content/components/FloatingButton.svelte)).
- Trong trang Cài đặt ([`FABSettings.svelte`](../src/entrypoints/settings/components/FABSettings.svelte)), tùy chọn hiển thị nút FAB chỉ có 2 nút bấm nhị phân: **Hide** và **Show** (`settings.showFloatingButton: boolean`).
- Khi người dùng đọc các bài viết dài, nút FAB luôn hiện cố định có thể che một phần nội dung nếu không được cuộn ẩn.

### Mục tiêu:
1. **Chuyển đổi giao diện Cài đặt**: Thay thế 2 nút Hide/Show bằng Dropdown [`ReusableSelect`](../src/components/inputs/ReusableSelect.svelte) với **4 chế độ hiển thị rõ ràng**.
2. **Hỗ trợ Smart Scroll**: Chế độ ẩn khi cuộn xuống (> 200px) nhưng **hiển thị lại ngay lập tức khi cuộn nhẹ lên** (scroll up).
3. **Mô tả trực quan & i18n 8 ngôn ngữ**: Hiển thị dòng giải thích hành vi bên dưới Dropdown, hỗ trợ đầy đủ 8 ngôn ngữ (`en`, `vi`, `ja`, `ko`, `zh-CN`, `de`, `es`, `fr`).
4. **Hiệu ứng chuyển động mượt mà**: Nút trượt vào/ra mép màn hình (Slide + Fade) với CSS transition 300ms mà không làm gián đoạn tương tác (hover, drag, mở panel).
5. **Tương thích ngược**: Dữ liệu cũ `true` / `false` tự động tương thích với `'show'` / `'hide'`.

---

## 2. Đặc tả 4 Chế độ hiển thị (4 Visibility Modes)

| Value | Nhãn Dropdown (VI / EN) | Hành vi chi tiết |
| :--- | :--- | :--- |
| `hide` | **Luôn ẩn** / *Always Hide* | Tắt hoàn toàn nút nổi trên mọi trang web. |
| `show` | **Luôn hiển thị** / *Always Show* | Luôn hiển thị nút nổi cố định ở mọi vị trí cuộn trang. |
| `hideOnScroll` | **Ẩn khi cuộn xuống (> 200px)** / *Hide on scroll down* | Ẩn khi cuộn xuống quá 200px, chỉ hiện lại khi cuộn về hẳn đầu trang ($\le$ 200px). |
| `showOnScrollUp` | **Hiện khi cuộn lên (Smart Scroll)** / *Show on scroll up* | Tự ẩn khi cuộn xuống > 200px, nhưng **hiển thị lại ngay khi cuộn nhẹ lên** ở bất kỳ đâu. |

---

## Phase 1 — Đa ngôn ngữ (i18n Localization cho 8 ngôn ngữ)

Bổ sung các key nhãn và mô tả chi tiết cho 4 chế độ vào key `settings.general.floating_button` trong 8 tệp ngôn ngữ tại `src/lib/locales/`.

### 1. [`src/lib/locales/en.json`](../src/lib/locales/en.json)
```json
"floating_button": {
  "show": "Always Show",
  "show_desc": "Keep the floating button always visible at a fixed position.",
  "hide": "Always Hide",
  "hide_desc": "Completely hide the floating button on all web pages.",
  "hide_on_scroll": "Hide on scroll down (> 200px)",
  "hide_on_scroll_desc": "Hides when scrolling down past 200px, only reappears when scrolling back to the top.",
  "show_on_scroll_up": "Show on scroll up (Smart Scroll)",
  "show_on_scroll_up_desc": "Hides when scrolling down past 200px, reappears immediately when scrolling up."
}
```

### 2. [`src/lib/locales/vi.json`](../src/lib/locales/vi.json)
```json
"floating_button": {
  "show": "Luôn hiển thị",
  "show_desc": "Luôn hiển thị nút nổi cố định ở mọi vị trí cuộn trang.",
  "hide": "Luôn ẩn",
  "hide_desc": "Tắt hoàn toàn nút nổi trên mọi trang web.",
  "hide_on_scroll": "Ẩn khi cuộn xuống (> 200px)",
  "hide_on_scroll_desc": "Ẩn khi cuộn xuống quá 200px, chỉ hiển thị lại khi cuộn về đầu trang.",
  "show_on_scroll_up": "Hiện khi cuộn lên (Smart Scroll)",
  "show_on_scroll_up_desc": "Ẩn khi cuộn xuống quá 200px, hiển thị lại ngay khi bạn cuộn nhẹ lên."
}
```

### 3. Các ngôn ngữ khác (`ja.json`, `ko.json`, `zh-CN.json`, `de.json`, `es.json`, `fr.json`):
Cập nhật tương ứng các cặp key `show`, `show_desc`, `hide`, `hide_desc`, `hide_on_scroll`, `hide_on_scroll_desc`, `show_on_scroll_up`, `show_on_scroll_up_desc`.

### Bước kiểm tra Phase 1 (Verify):
- Chạy `npm run check` đảm bảo không có lỗi cú pháp JSON trong các file locale.

---

## Phase 2 — Nâng cấp Cài đặt ([`FABSettings.svelte`](../src/entrypoints/settings/components/FABSettings.svelte))

Chuyển đổi giao diện chọn trạng thái Floating Button từ `ButtonSet` sang `ReusableSelect` kèm mô tả trực quan.

### Chi tiết thay đổi:
1. **Import `ReusableSelect`** (đã có sẵn trong file).
2. **Khai báo danh sách items và hàm xử lý**:
```javascript
// Chuẩn hóa giá trị từ store (hỗ trợ boolean cũ)
function normalizeVisibilityMode(val) {
  if (val === false || val === 'hide') return 'hide'
  if (val === true || val === 'show') return 'show'
  if (val === 'hideOnScroll') return 'hideOnScroll'
  if (val === 'showOnScrollUp' || val === 'showOnScroll') return 'showOnScrollUp'
  return 'show'
}

let currentVisibilityMode = $derived(
  normalizeVisibilityMode(settings.showFloatingButton),
)

const visibilityItems = $derived([
  {
    value: 'hide',
    label: $t('settings.general.floating_button.hide'),
  },
  {
    value: 'show',
    label: $t('settings.general.floating_button.show'),
  },
  {
    value: 'hideOnScroll',
    label: $t('settings.general.floating_button.hide_on_scroll'),
  },
  {
    value: 'showOnScrollUp',
    label: $t('settings.general.floating_button.show_on_scroll_up'),
  },
])

function handleVisibilityModeChange(newMode) {
  handleUpdateSetting('showFloatingButton', newMode)
}
```

3. **Cập nhật Template (thay thế lines 198-221)**:
```svelte
<div class="flex flex-col gap-2 pb-4">
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class="block text-text-secondary"
    >{$t('settings.general.floatingButton')}</label
  >
  <div class="w-full">
    <ReusableSelect
      items={visibilityItems}
      bind:bindValue={currentVisibilityMode}
      onValueChangeCallback={handleVisibilityModeChange}
      ariaLabel={$t('settings.general.floatingButton')}
      className="w-full"
    />
  </div>
  <p class="text-xs text-text-muted mt-1">
    {$t(`settings.general.floating_button.${currentVisibilityMode}_desc`)}
  </p>
</div>
```

4. **Cập nhật ô Preview (line 172-174)**:
```svelte
{currentVisibilityMode !== 'hide'
  ? 'opacity-100 scale-100'
  : 'opacity-0 scale-85'}
```

### Bước kiểm tra Phase 2 (Verify):
- Mở trang Settings $\rightarrow$ FAB Settings.
- Kiểm tra dropdown hiển thị 4 tùy chọn và thay đổi cài đặt mượt mà.
- Dòng mô tả bên dưới cập nhật chính xác theo tùy chọn được chọn.
- Ô Preview mờ đi khi chọn "Luôn ẩn" và hiện lên khi chọn các chế độ khác.

---

## Phase 3 — Đồng bộ trạng thái FAB ở Entrypoints & Background

Đảm bảo các điểm kiểm tra FAB trong toàn bộ extension nhận diện đúng kiểu dữ liệu mới (`string` hoặc `boolean`).

### 1. [`src/entrypoints/content/main.js`](../src/entrypoints/content/main.js)
```javascript
// Thay thế line 20:
const isFabDisabled = settings.showFloatingButton === false || settings.showFloatingButton === 'hide'
if (isFabDisabled) {
  return
}
```

### 2. [`src/entrypoints/content/App.svelte`](../src/entrypoints/content/App.svelte)
```svelte
<!-- Thay thế line 380: -->
if (settings.showFloatingButton === false || settings.showFloatingButton === 'hide' || !isFabAllowedOnDomain) {

<!-- Thay thế line 581: -->
{#if settings.showFloatingButton !== false && settings.showFloatingButton !== 'hide' && !showBlacklistConfirm && isFabAllowedOnDomain}
```

### 3. [`src/entrypoints/background/index.js`](../src/entrypoints/background/index.js)
```javascript
// Thay thế helper kiểm tra cachedFabEnabled:
const isFabActive = (val) => val !== false && val !== 'hide'

// Cập nhật các vị trí gán và kiểm tra cachedFabEnabled:
cachedFabEnabled = isFabActive(result.settings?.showFloatingButton)
```

### Bước kiểm tra Phase 3 (Verify):
- Chọn "Luôn ẩn" trong Settings $\rightarrow$ Tải lại trang web $\rightarrow$ FAB không được mount vào DOM.
- Chọn các chế độ hiển thị khác $\rightarrow$ FAB được mount bình thường.

---

## Phase 4 — Xử lý Scroll Listener & Animation trong [`FloatingButton.svelte`](../src/entrypoints/content/components/FloatingButton.svelte)

Thêm logic tính toán ẩn/hiện theo trạng thái cuộn trang và CSS Transition mượt mà.

### 1. Script State & Scroll Handler:
```javascript
let isScrollHidden = $state(false)
let lastScrollY = 0

function handleScroll() {
  const currentScrollY =
    window.scrollY || document.documentElement.scrollTop || 0
  const delta = currentScrollY - lastScrollY
  const mode = settings?.showFloatingButton

  if (mode === 'hideOnScroll') {
    // Ẩn khi cuộn > 200px, hiện khi quay lại đầu trang
    isScrollHidden = currentScrollY > 200
  } else if (mode === 'showOnScrollUp' || mode === 'showOnScroll') {
    // Smart Scroll:
    if (currentScrollY <= 200) {
      isScrollHidden = false
    } else if (delta > 5) {
      // Đang cuộn xuống quá 200px -> Ẩn
      isScrollHidden = true
    } else if (delta < -5) {
      // Đang cuộn ngược lên -> Hiện lại ngay
      isScrollHidden = false
    }
  } else {
    // Chế độ 'show' hoặc mặc định: luôn hiện
    isScrollHidden = false
  }

  lastScrollY = currentScrollY
}

// Đăng ký scroll event
$effect(() => {
  lastScrollY = window.scrollY || document.documentElement.scrollTop || 0
  handleScroll()

  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => {
    window.removeEventListener('scroll', handleScroll)
  }
})
```

### 2. Markup Container:
```svelte
<!-- Cập nhật thẻ div container chính: -->
<div
  bind:this={buttonElement}
  class="floating-button-container"
  class:is-scrolled-hidden={isScrollHidden && !isOpen && !isDragging && !isHovered}
  style="left: 0; top: 0;"
  ...
```

### 3. CSS Transitions:
```css
.floating-button-container {
  position: fixed;
  z-index: 2147483647;
  touch-action: none;
  will-change: transform;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  width: 40px;
  height: 40px;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              visibility 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.floating-button-container.is-scrolled-hidden {
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
}

.floating-button {
  position: absolute;
  inset: 0;
  background: none !important;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: none !important;
  display: flex;
  padding: 0 !important;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Slide animation tương ứng theo mép trái hoặc phải */
.floating-button-container.is-scrolled-hidden .round-l {
  transform: translateX(-100%);
}

.floating-button-container.is-scrolled-hidden .round-r {
  transform: translateX(100%);
}
```

### Bước kiểm tra Phase 4 (Verify):
1. **Kiểm tra chế độ "Hiện khi cuộn lên (Smart Scroll)"**:
   - Mở một trang web dài (Wikipedia, blog, tài liệu,...).
   - Cuộn xuống quá 200px $\rightarrow$ FAB trượt ẩn mượt mà vào mép màn hình.
   - Lăn chuột hoặc vuốt nhẹ lên trên một chút $\rightarrow$ FAB lập tức trượt ra hiển thị lại.
   - Tiếp tục cuộn xuống $\rightarrow$ FAB lại ẩn đi.
2. **Kiểm tra chế độ "Ẩn khi cuộn xuống (> 200px)"**:
   - Cuộn xuống quá 200px $\rightarrow$ FAB ẩn.
   - Cuộn lên lơ lửng ở giữa trang $\rightarrow$ FAB vẫn ẩn.
   - Cuộn về hẳn đầu trang ($\le$ 200px) $\rightarrow$ FAB hiện lại.
3. **Kiểm tra bảo vệ tương tác**:
   - Mở panel hoặc hover chuột vào FAB khi đang ở vị trí cuộn > 200px $\rightarrow$ FAB không bị ẩn đột ngột.

---

## 5. Tổng kết quy trình thực hiện & Verify toàn bộ

Sau khi hoàn thành cả 4 phase:
1. Chạy lệnh kiểm tra type check: `npm run check`.
2. Chạy lệnh build kiểm tra đóng gói: `npm run build`.
3. Kiểm tra toàn bộ luồng sử dụng thực tế trên trình duyệt.
