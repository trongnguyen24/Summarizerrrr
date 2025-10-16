# Kế hoạch mở rộng hỗ trợ đa ngôn ngữ cho Chrome Web Store

## Mục tiêu

Mở rộng hỗ trợ từ 8 ngôn ngữ hiện tại lên 54+ ngôn ngữ để tăng độ phủ trên Chrome Web Store.

## Danh sách ngôn ngữ cần hỗ trợ (54 ngôn ngữ)

### Ngôn ngữ đã có (8)

1. en - English
2. vi - Vietnamese
3. es - Spanish
4. zh_CN - Chinese (Simplified)
5. de - German
6. fr - French
7. ja - Japanese
8. ko - Korean

### Ngôn ngữ cần thêm (46 ngôn ngữ)

#### Châu Âu (15)

9. it - Italian
10. pt - Portuguese
11. pt_BR - Portuguese (Brazil)
12. ru - Russian
13. nl - Dutch
14. pl - Polish
15. tr - Turkish
16. sv - Swedish
17. da - Danish
18. no - Norwegian
19. fi - Finnish
20. el - Greek
21. cs - Czech
22. hu - Hungarian
23. ro - Romanian
24. bg - Bulgarian

#### Châu Á (15)

25. zh_TW - Chinese (Traditional)
26. th - Thai
27. id - Indonesian
28. ms - Malay
29. tl - Filipino
30. hi - Hindi
31. bn - Bengali
32. ta - Tamil
33. te - Telugu
34. mr - Marathi
35. gu - Gujarati
36. kn - Kannada
37. ml - Malayalam
38. pa - Punjabi
39. ur - Urdu

#### Trung Đông (5)

40. ar - Arabic
41. he - Hebrew
42. fa - Persian
43. az - Azerbaijani
44. hy - Armenian

#### Châu Phi (3)

45. sw - Swahili
46. af - Afrikaans
47. zu - Zulu

#### Châu Mỹ (8)

48. ca - Catalan
49. eu - Basque
50. gl - Galician
51. is - Icelandic
52. ga - Irish
53. cy - Welsh
54. gd - Scottish Gaelic
55. sq - Albanian

## Chiến lược triển khai

### Giai đoạn 1: Tạo cấu trúc và template

1. Tạo script tự động tạo file messages.json cho tất cả ngôn ngữ
2. Sử dụng Google Translate API để tạo bản dịch ban đầu
3. Xây dựng template cho từng nhóm ngôn ngữ

### Giai đoạn 2: Tạo file messages.json

1. Tạo thư mục cho từng ngôn ngữ mới
2. Tạo file messages.json với nội dung được dịch
3. Xác nhận đúng mã ngôn ngữ theo chuẩn Chrome

### Giai đoạn 3: Cập nhật component

1. Cập nhật LanguageSelect.svelte với danh sách ngôn ngữ mới
2. Cập nhật svelte-i18n để đăng ký các ngôn ngữ mới
3. Tạo file locale.json cho svelte-i18n

### Giai đoạn 4: Kiểm tra và tối ưu

1. Build và kiểm tra tất cả ngôn ngữ
2. Tối ưu kích thước file
3. Tạo script để cập nhật đồng bộ

## Template cho messages.json

Mỗi file messages.json sẽ có cấu trúc:

```json
{
  "extensionName": {
    "message": "Summarizerrrr",
    "description": "Name of the extension"
  },
  "extensionDescription": {
    "message": "Extension helps you summarize for YouTube, Udemy, Coursera, any websites. Crafted with superior UI/UX design.",
    "description": "Description of the extension"
  },
  "actionTitle": {
    "message": "Click to Open Summarizerrrr",
    "description": "Tooltip text when hovering over the extension icon"
  }
}
```

## Script tự động tạo file

Tạo script `scripts/generate-i18n.js` để:

1. Đọc danh sách ngôn ngữ từ file config
2. Tạo thư mục cho từng ngôn ngữ
3. Tạo file messages.json với bản dịch
4. Cập nhật LanguageSelect.svelte
5. Cập nhật i18n.js

## Lưu ý quan trọng

1. **Mã ngôn ngữ Chrome**: Sử dụng đúng mã ngôn ngữ theo chuẩn Chrome (ví dụ: zh_CN thay vì zh-CN)
2. **Chất lượng bản dịch**: Nên có người bản địa xem xét lại bản dịch tự động
3. **Kích thước file**: Cần tối ưu để không làm tăng quá nhiều kích thước extension
4. **Thứ tự ưu tiên**: Ưu tiên các ngôn ngữ có nhiều người dùng nhất trước

## Lợi ích

- Tăng độ phủ trên Chrome Web Store
- Tiếp cận người dùng toàn cầu
- Tăng uy tín và chuyên nghiệp
- Tăng khả năng được đề xuất bởi Chrome

## Kế hoạch thực hiện

1. Tuần 1: Tạo script và template
2. Tuần 2: Tạo file cho 20 ngôn ngữ phổ biến nhất
3. Tuần 3: Tạo file cho 20 ngôn ngữ tiếp theo
4. Tuần 4: Hoàn thành 14 ngôn ngữ còn lại và kiểm tra
