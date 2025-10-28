# Kế hoạch sửa lỗi button "Start Import" trong ExportImport.svelte

## Vấn đề

- Hàm `isPromptModified()` được sử dụng ở dòng 703 và 710 nhưng không được định nghĩa anywhere trong dự án
- Điều này gây ra lỗi và button không hiển thị đúng trạng thái

## Phân tích hiện tại

1. Button "Start Import" có điều kiện disabled:

   ```javascript
   disabled={!Object.values(importOptions.dataTypes).some(Boolean)}
   ```

   Button bị disabled khi không có loại dữ liệu nào được chọn.

2. Class CSS của button sử dụng hàm không tồn tại:
   ```javascript
   class="... {isPromptModified() ? 'active-style' : 'disabled-style'}"
   ```

## Giải pháp

Tạo hàm `isPromptModified()` để kiểm tra xem có ít nhất một loại dữ liệu được chọn hay không:

```javascript
function isPromptModified() {
  return Object.values(importOptions.dataTypes).some(Boolean)
}
```

## Các thay đổi cần thực hiện

### 1. Thêm hàm isPromptModified() vào script section

Thêm hàm sau vào phần script của file (sau dòng 455, trước phần template):

```javascript
// Check if any data type is selected for import
function isPromptModified() {
  return Object.values(importOptions.dataTypes).some(Boolean)
}
```

### 2. Giữ nguyên class CSS của button và span

Không cần thay đổi gì ở phần template vì hàm `isPromptModified()` đã được định nghĩa.

## Kết quả mong muốn

- Button sẽ có style "active" (màu cam) khi có ít nhất một loại dữ liệu được chọn
- Button sẽ có style "disabled" (màu xám) khi không có loại dữ liệu nào được chọn
- Logic này sẽ đồng nhất với điều kiện `disabled` của button
