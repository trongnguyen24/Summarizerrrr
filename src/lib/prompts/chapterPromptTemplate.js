export const chapterPromptTemplate = `
<TASK>
Phân tích <INPUT_CONTENT> được cung cấp và tạo bản tóm tắt chi tiết theo từng chương/phần logic, kèm theo thời gian bắt đầu ước lượng cho mỗi phần.
</TASK>

<CONTEXT>
Nội dung đầu vào là bản ghi (transcript) của một video, có kèm dấu thời gian ở đầu mỗi dòng hoặc đoạn văn bản.
</CONTEXT>

<INPUT_PARAMETERS>
1.  **Ngôn ngữ đầu ra:** __LANG__
2.  **Độ dài tóm tắt cho mỗi chương/phần:** __LENGTH_DESCRIPTION__
    *(__LENGTH_NOTE__)*
3.  **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
- **Phân chia Chương:** Dựa vào các dấu thời gian, sự thay đổi chủ đề nội dung, hoặc các khoảng dừng đáng kể trong <INPUT_CONTENT>, tự động xác định và phân chia transcript thành các chương hoặc phần logic.
- **Đặt Tên Chương:** Đặt tên ngắn gọn, súc tích và mô tả được nội dung chính của mỗi chương/phần đã xác định. Tên chương phải bằng ngôn ngữ __LANG__.
- **Xác định Thời Gian Bắt Đầu:** Thời gian bắt đầu của mỗi chương/phần sẽ là dấu thời gian sớm nhất được tìm thấy trong đoạn transcript tương ứng với chương/phần đó.
- **Cấu trúc Đầu ra:**
    1.  Bắt đầu đầu ra bằng tiêu đề chính: ## Tóm tắt video theo chương: (hoặc tiêu đề tương đương trong ngôn ngữ __LANG__).
    2.  Đối với *mỗi* chương/phần đã xác định, tạo một tiêu đề cấp 3 (###) theo định dạng: ### Thời gian bắt đầu Ước lượng - Tên chương bạn đặt.
    3.  Dưới tiêu đề cấp 3 của mỗi chương, tạo phần tóm tắt nội dung chính của chương đó, tuân thủ độ dài yêu cầu.
    4.  Nếu độ dài yêu cầu là "long" hoặc chương đó có nhiều điểm phức tạp, sử dụng tiêu đề cấp 4 (####) và danh sách gạch đầu dòng (-) để làm nổi bật các luận điểm hoặc chi tiết quan trọng bên trong phần tóm tắt của chapter đó.
    5.  Đảm bảo phần tóm tắt mỗi chương (và các tiểu mục nếu có) bao gồm các luận điểm chính, thuật ngữ quan trọng (in đậm **Term** bằng ngôn ngữ __LANG__) được đề cập trong chapter đó, và thông tin cốt lõi.
    6.  Kết thúc toàn bộ tóm tắt bằng một tiêu đề cấp 2 (##) ## Kết luận chung (hoặc tiêu đề tương đương trong ngôn ngữ __LANG__), tóm tắt thông điệp tổng thể hoặc ý chính xuyên suốt video.
- **Định dạng Bắt buộc:** Chỉ sử dụng định dạng Markdown sau: ##, ###, ####, - (cho bullet points), ** (cho in đậm).
</OUTPUT_STRUCTURE>

<CONSTRAINTS>
- Không thêm lời chào, lời giới thiệu hoặc bình luận cá nhân ngoài nội dung tóm tắt.
- Không hiển thị lại các giá trị tham số đầu vào trong kết quả.
- Chỉ sử dụng thông tin từ <INPUT_CONTENT>.
- Nếu một chương/phần được xác định quá ngắn hoặc không có nội dung đáng kể, hãy tóm tắt nó một cách cô đọng nhất có thể (có thể chỉ 1 câu), không cố gắng đạt đủ độ dài yêu cầu cho chapter đó nếu không có đủ thông tin.
- Toàn bộ đầu ra (bao gồm tiêu đề, tên chương, nội dung tóm tắt, kết luận) phải hoàn toàn bằng ngôn ngữ __LANG__.
- Không bao bọc kết quả cuối cùng trong khối mã Markdown.
</CONSTRAINTS>

<EXAMPLE>
## Tóm tắt video theo chương:

### 0:00 - Giới thiệu Svelte 5 và Runes
Video mở đầu giới thiệu Svelte 5 là một bản cập nhật lớn, nhấn mạnh sự ra đời của một khái niệm mới gọi là **Runes** sẽ thay đổi cách làm việc với reactivity.

### 0:45 - Tìm hiểu sâu về Runes
#### \$state Rune
Giải thích cách sử dụng \$state để khai báo trạng thái reactive. Đây là cách cơ bản nhất để làm cho dữ liệu thay đổi được theo dõi bởi Svelte.
#### \$derived Rune
Mô tả \$derived dùng để tạo ra các giá trị phụ thuộc vào trạng thái khác. Khi trạng thái gốc thay đổi, giá trị \$derived sẽ tự động cập nhật lại.
#### \$effect Rune
Trình bày \$effect cho phép thực hiện các hành động phụ (side effects) như cập nhật DOM thủ công hoặc gọi API khi một trạng thái reactive thay đổi.

### 5:10 - Lợi ích về Hiệu suất và Cú pháp
Svelte 5 được kỳ vọng mang lại **cải thiện đáng kể về hiệu suất** runtime và tối ưu kích thước bundle. Cú pháp với Runes được giới thiệu là trực quan và dễ hiểu hơn.

## Kết luận chung
Svelte 5 với mô hình reactivity dựa trên Runes là một bước tiến lớn, hứa hẹn việc phát triển ứng dụng web hiệu quả và đơn giản hơn với hiệu suất cao hơn.
</EXAMPLE>

<INPUT_CONTENT>
\${timestampedTranscript}
</INPUT_CONTENT>
`
