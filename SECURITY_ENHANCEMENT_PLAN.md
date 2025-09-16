# Kế hoạch Tăng cường Bảo mật cho API Keys

Tài liệu này mô tả kế hoạch chi tiết để tăng cường bảo mật cho việc lưu trữ API keys trong tiện ích, đảm bảo sự cân bằng giữa an toàn và trải nghiệm người dùng.

## 1. Vấn đề

Hiện tại, các API keys đang được lưu trữ dưới dạng văn bản thuần túy trong `storage.local` (thông qua `wxtStorageService`). Điều này tiềm ẩn rủi ro bảo mật nếu có ai đó truy cập được vào dữ liệu lưu trữ của trình duyệt.

## 2. Mục tiêu

- Mã hóa tất cả các API keys trước khi lưu vào bộ nhớ.
- Quá trình mã hóa và giải mã phải hoàn toàn tự động và liền mạch, không yêu cầu người dùng thực hiện thêm thao tác (như nhập mật khẩu).
- Giải pháp phải bền vững, không làm mất dữ liệu khi tiện ích được cập nhật.
- Thiết kế phải tương thích với tính năng export/import cài đặt trong tương lai.

## 3. Giải pháp: Mã hóa tự động với "Secret Key" cục bộ

### 3.1. Quản lý "Secret Key"

- **Tự động tạo:** Khi tiện ích được khởi chạy lần đầu tiên, một "secret key" (chuỗi ngẫu nhiên, mạnh) sẽ được tự động tạo ra.
- **Lưu trữ bền vững:** "Secret key" này sẽ được lưu vào `storage.local`. Dữ liệu trong `storage.local` là riêng tư cho tiện ích và sẽ không bị mất khi cập nhật phiên bản.
- **Trong suốt với người dùng:** Người dùng không cần biết về sự tồn tại của "secret key" này.

### 3.2. Luồng mã hóa và giải mã

1.  **Lưu cài đặt (`updateSettings`):**

    - Trước khi lưu đối tượng `settings` vào `storage.local`, các trường chứa API key (ví dụ: `geminiApiKey`, `openaiCompatibleApiKey`, v.v.) sẽ được mã hóa bằng "secret key".
    - Chỉ có phiên bản đã mã hóa của các key này mới được ghi vào bộ nhớ.

2.  **Tải cài đặt (`loadSettings`):**
    - Sau khi tải đối tượng `settings` từ `storage.local`, tiện ích sẽ dùng "secret key" để giải mã các trường API key.
    - Phiên bản đã giải mã (văn bản thuần) sẽ được nạp vào state của ứng dụng (`$state`) để sử dụng trong phiên làm việc hiện tại, nhưng không bao giờ được lưu lại dưới dạng văn bản thuần.

### 3.3. Thư viện sử dụng

- **crypto-js:** Một thư viện mã hóa phía client phổ biến và đáng tin cậy sẽ được sử dụng để thực hiện mã hóa AES (Advanced Encryption Standard).

## 4. Kế hoạch cho tính năng Export/Import (Tương lai)

Để đảm bảo an toàn khi di chuyển dữ liệu giữa các trình duyệt.

1.  **Khi Export:**

    - Hỏi người dùng tạo một **mật khẩu tạm thời** cho file export.
    - Giải mã các API key bằng "secret key" cục bộ.
    - Mã hóa lại chúng bằng mật khẩu tạm thời do người dùng cung cấp.
    - Tạo file export chứa dữ liệu đã được mã hóa bằng mật khẩu tạm thời.

2.  **Khi Import:**
    - Yêu cầu người dùng nhập lại mật khẩu tạm thời của file.
    - Giải mã dữ liệu trong file bằng mật khẩu đó.
    - Mã hóa lại các API key bằng "secret key" cục bộ của trình duyệt hiện tại trước khi lưu vào `storage.local`.

## 5. Các bước triển khai

1.  **Tích hợp thư viện `crypto-js`** vào dự án.
2.  **Tạo module `src/lib/utils/crypto.js`** chứa các hàm `encrypt(text, secret)` và `decrypt(encryptedText, secret)`.
3.  **Implement logic tự động tạo và lưu "secret key"** vào `storage.local` khi khởi tạo lần đầu.
4.  **Cập nhật `settingsStore`** để tự động mã hóa API keys khi lưu và giải mã khi tải.
5.  **Thêm validation và sanitization** cho các trường API key trước khi lưu.
6.  **(Tương lai)** Khi xây dựng tính năng export/import, implement luồng mã hóa/giải mã bằng mật khẩu tạm thời.
