# Kế hoạch chuyển từ @media screen sang @container queries

## Mục tiêu

Thay đổi media query từ `@media screen` thành `@container` để theo dõi thay đổi của container thay vì toàn bộ màn hình.

## Phân tích hiện tại

- Component `CopyTranscriptIcon.svelte` được mount trong Shadow DOM
- Container cha là `.copy-transcript-container` được chèn vào YouTube player controls
- Media query hiện tại: `@media screen and (min-width: 1300px)` áp dụng cho các class:
  - `.summarizerrrr-btn`: thay đổi width/height từ 3.2rem thành 4.2rem
  - `.summarizerrrr-popover`: thay đổi bottom từ 6rem thành 7.8rem
  - `.summarizerrrr-tooltip`: thay đổi bottom từ 5.8rem thành 8.1rem và font-size từ 1.2rem thành 2rem

## Các thay đổi cần thực hiện

### 1. Cập nhật CSS (copy-transcript-button.css)

- Thêm `container-type: inline-size;` vào `.summarizerrrr-wrap` để kích hoạt container queries
- Thay đổi `@media screen and (min-width: 1300px)` thành `@container (min-width: 1300px)`

### 2. Cập nhật Svelte component (CopyTranscriptIcon.svelte)

- Đảm bảo `.summarizerrrr-wrap` là container chính có `container-type: inline-size`
- Không cần thay đổi cấu trúc HTML vì đã có wrapper phù hợp

## Code changes needed

### copy-transcript-button.css

```css
.summarizerrrr-wrap {
  background: hsl(0deg 0% 0% / 30%);
  padding: 0;
  position: relative;
  border-radius: 4rem;
  container-type: inline-size; /* Thêm dòng này */
}

@container (min-width: 1300px) {
  /* Thay đổi từ @media screen */
  .summarizerrrr-btn {
    width: 4.2rem;
    height: 4.2rem;
  }
  .summarizerrrr-popover {
    bottom: 7.8rem;
  }
  .summarizerrrr-tooltip {
    bottom: 8.1rem;
    font-size: 2rem;
  }
}
```

## Lợi ích của container queries

- Responsive design dựa trên kích thước container thực tế
- Component sẽ phản ứng phù hợp với không gian có sẵn trong YouTube player
- Tốt hơn cho việc tái sử dụng component trong các context khác nhau

## Kiểm tra

- Test trên các kích thước khác nhau của YouTube player
- Đảm bảo button và tooltip hiển thị đúng khi container thay đổi
- Kiểm tra trên cả desktop và mobile
