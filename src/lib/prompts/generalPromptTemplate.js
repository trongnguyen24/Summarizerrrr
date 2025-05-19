export const generalPromptTemplate = `<USER_TASK>
Hãy phân tích <Input_Content> được cung cấp (bao gồm nội dung chính và có thể có phần bình luận), và tạo bản tóm tắt dựa trên các <Parameters> và <Guidelines> dưới đây.
</USER_TASK>

    <Parameters>
1.  Độ dài tóm tắt: \${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 1-2 câu) về ý chính tổng thể của nội dung chính. Nếu có bình luận, chỉ tóm tắt ý chính nhất của phần bình luận trong 1 câu riêng biệt.
    - "medium": Tóm tắt ngắn gọn ( khoảng 3-5 câu) bao gồm các điểm chính của nội dung chính. Nếu có bình luận, tóm tắt các ý kiến/quan điểm chính từ bình luận trong khoảng 2-3 câu riêng biệt.
    - "long": Tóm tắt chi tiết bao gồm tất cả các phần quan trọng của nội dung chính, có thể chia thành các đoạn hoặc tiểu mục. Nếu có bình luận, tóm tắt chi tiết các ý kiến đa dạng và các điểm nổi bật trong phần bình luận, có thể chia thành các tiểu mục nhỏ.
    *(Lưu ý: Độ dài là ước tính và phụ thuộc vào lượng thông tin có trong nội dung gốc và bình luận.)*

2.  Ngôn ngữ tóm tắt: \${lang}
    - Toàn bộ bản tóm tắt (bao gồm tiêu đề và nội dung) sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh).

3.  Định dạng tóm tắt: \${format}
    - "plain": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy, liên tục (phần nội dung chính và phần bình luận nếu có sẽ là các đoạn riêng biệt được phân cách rõ ràng bằng một dòng trống hoặc tiêu đề đơn giản).
    - "heading": Tóm tắt nội dung chính bắt đầu bằng tiêu đề cấp 2 (##). Các điểm hoặc phần quan trọng hơn trong nội dung chính sử dụng tiêu đề cấp 3 (###). Nếu có bình luận, phần tóm tắt bình luận sẽ có tiêu đề cấp 2 riêng biệt "## Tóm tắt bình luận" (hoặc tương đương trong ngôn ngữ \${lang}), và các ý/điểm nổi bật trong bình luận có thể dùng tiêu đề cấp 3 (###) hoặc cấp 4 (####) nếu cần chi tiết.
</Parameters>

<Guidelines>
- **Phân tích Nội dung:** Đọc kỹ <Input_Content> để xác định nội dung chính (bài viết, bài đăng, v.v.) và phần bình luận (nếu có). Phân tách hai phần này trong quá trình xử lý.
- **Tóm tắt Nội dung Chính:**
    - Xác định chủ đề chính, các luận điểm quan trọng, bằng chứng/số liệu hỗ trợ, ví dụ, và kết luận của nội dung chính.
    - Tổ chức thông tin tóm tắt một cách logic và mạch lạc.
    - Giữ lại các số liệu, tên, ngày tháng, thuật ngữ quan trọng và kết luận chính có trong nội dung gốc. Sử dụng **in đậm** cho các thuật ngữ hoặc khái niệm quan trọng lần đầu xuất hiện trong tóm tắt nếu phù hợp.
    - Loại bỏ các chi tiết không cần thiết, thông tin lặp lại, và các câu/đoạn filler.
    - Đảm bảo bảo toàn ý nghĩa và ngữ cảnh của nội dung gốc.
    - Nếu nội dung gốc dài (>3000 từ được ước tính dựa trên <Input_Content>), đặc biệt khi \${length} là "long" hoặc "medium", hãy chia tóm tắt nội dung chính theo các chủ đề hoặc phần chính của nội dung gốc và sử dụng tiêu đề phù hợp (### hoặc #### nếu định dạng là "heading").
    - Nếu nội dung gốc trình bày thông tin mâu thuẫn hoặc các quan điểm khác nhau, hãy đề cập (một cách khách quan) các quan điểm đa dạng này trong bản tóm tắt.
    - Nếu chất lượng nội dung gốc hạn chế hoặc có nhiều thông tin nhiễu, tập trung vào việc trích xuất và tóm tắt những thông tin có giá trị và đáng tin cậy nhất có thể tìm thấy.
- **Tóm tắt Bình luận (Có điều kiện):**
    - Nếu <Input_Content> bao gồm phần bình luận, phân tích kỹ lưỡng để xác định các ý kiến, quan điểm, câu hỏi hoặc chủ đề thảo luận chính trong các bình luận.
    - Chú ý đến các bình luận nổi bật, những bình luận được nhiều người ủng hộ hoặc phản hồi nhất.
    - Tạo một phần tóm tắt riêng cho bình luận. Nếu định dạng là "heading", sử dụng tiêu đề "## Tóm tắt bình luận" (hoặc tương đương trong ngôn ngữ \${lang}).
    - Tóm tắt các điểm chính từ bình luận, không đi sâu vào chi tiết từng bình luận trừ khi bình luận đó cực kỳ nổi bật hoặc đại diện cho một quan điểm phổ biến. Mức độ chi tiết tuân theo yêu cầu \${length} cho phần bình luận.
- **Định dạng Bắt buộc:** Chỉ cho phép các định dạng Markdown sau: ##, ###, ####, - (để tạo gạch đầu dòng nếu cần cho các điểm chi tiết hoặc trong phần tóm tắt bình luận ở độ dài "long"), ** (để in đậm).
- **Ràng buộc:**
    - Không thêm bất kỳ lời chào, lời giới thiệu, kết luận cá nhân hoặc bất kỳ văn bản nào khác ngoài cấu trúc và định dạng bắt buộc của bản tóm tắt.
    - Không hiển thị thông tin về cài đặt (như độ dài, ngôn ngữ, định dạng yêu cầu) trong kết quả đầu ra.
</Guidelines>

<Example_Output_Format format="heading" lang="vi" length="medium">
## Tóm tắt bài viết: Cách hoạt động của WebAssembly

### Giới thiệu WebAssembly
Bài viết giới thiệu **WebAssembly (Wasm)** là một định dạng mã nhị phân cho máy ảo dựa trên stack, được thiết kế như một mục tiêu biên dịch portable cho ngôn ngữ bậc cao như C/C++, Rust, Go, cho phép chạy trên web với hiệu suất gần như native.

### Cấu trúc và Thực thi
Giải thích cấu trúc module Wasm bao gồm các hàm, bảng, bộ nhớ và tài nguyên toàn cục. Trình duyệt tải file .wasm, xác thực, biên dịch (JIT hoặc AOT) và thực thi trong môi trường sandbox, đảm bảo an toàn. Wasm tương tác với JavaScript thông qua WebAssembly JavaScript API để truy cập DOM và các Web API khác.

### Lợi ích chính
Các lợi ích nổi bật của Wasm bao gồm hiệu suất cao, an toàn nhờ sandbox, portable trên các nền tảng và trình duyệt khác nhau, và khả năng tái sử dụng code từ các ngôn ngữ hiện có.

## Tóm tắt bình luận
Phần bình luận thảo luận chủ yếu về tiềm năng của Wasm ngoài trình duyệt (ví dụ: server-side, edge computing) và so sánh hiệu suất thực tế với JavaScript trong các ứng dụng phức tạp. Một số bình luận bày tỏ sự hào hứng với việc sử dụng Rust kết hợp Wasm để phát triển ứng dụng web hiệu năng cao.
</Example_Output_Format>

<Input_Content>
\${text}
</Input_Content>`
