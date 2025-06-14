export const chapterPromptTemplate = `
<USER_TASK>
Hãy phân tích <Transcript_Input> được cung cấp và tạo bản tóm tắt chi tiết theo từng chương/phần logic, kèm theo thời gian bắt đầu ước lượng cho mỗi phần. Sử dụng các <Parameters> và <Guidelines> sau để tạo ra kết quả cuối cùng.
</USER_TASK>

<Translation_Instructions>
    <Goal>Bản tóm tắt cuối cùng bằng ngôn ngữ "\${lang}" phải đạt chất lượng dịch thuật cao nhất, truyền tải chính xác và đầy đủ ý nghĩa của nội dung đã được tóm tắt, đồng thời phải tự nhiên và lưu loát như người bản xứ viết.</Goal>
    <Quality_Criteria>
        <Criterion name="Meaning_Accuracy">Đảm bảo ý nghĩa cốt lõi, các chi tiết quan trọng và sắc thái của bản tóm tắt (trước khi dịch, nếu có bước đó) được bảo toàn và truyền tải một cách chính xác sang ngôn ngữ "\${lang}". Không thêm thông tin mới hoặc bỏ sót thông tin quan trọng trong quá trình dịch.</Criterion>
        <Criterion name="Natural_Fluency">Sử dụng từ ngữ, cấu trúc câu và văn phong tự nhiên, trôi chảy, và idiomatically correct trong ngôn ngữ "\${lang}". Tránh tuyệt đối lối dịch word-by-word hoặc các cấu trúc câu gượng ép, thiếu tự nhiên.</Criterion>
        <Criterion name="Terminology_Consistency">Các thuật ngữ chuyên ngành, tên riêng hoặc từ khóa quan trọng phải được dịch một cách nhất quán và chính xác sang "\${lang}". Ưu tiên sử dụng các thuật ngữ đã được chuẩn hóa hoặc phổ biến trong lĩnh vực liên quan của ngôn ngữ "\${lang}".</Criterion>
        <Criterion name="Cultural_Adaptation">Khi gặp các thành ngữ, tục ngữ, ví von hoặc các yếu tố mang đậm màu sắc văn hóa của ngôn ngữ nguồn, hãy tìm cách diễn đạt tương đương, phù hợp và dễ hiểu trong văn hóa của ngôn ngữ "\${lang}", thay vì dịch nghĩa đen một cách máy móc.</Criterion>
        <Criterion name="Tone_Preservation">Giữ nguyên giọng điệu (ví dụ: trang trọng, thân mật, khách quan, châm biếm) của bản tóm tắt gốc khi chuyển ngữ sang "\${lang}".</Criterion>
        <Criterion name="Grammar_And_Spelling">Bản dịch cuối cùng phải hoàn toàn không có lỗi ngữ pháp, chính tả, hoặc dấu câu trong ngôn ngữ "\${lang}".</Criterion>
    </Quality_Criteria>
    <Output_Expectation>Kết quả đầu ra phải là một bản tóm tắt hoàn chỉnh, chỉ bằng ngôn ngữ "\${lang}", tuân thủ tất cả các <Parameters> và <Guidelines> khác. Bản dịch phải liền mạch và không để lộ bất kỳ dấu hiệu nào của quá trình dịch thuật (ví dụ: không có chú thích của người dịch, không có cụm từ nào cho thấy đây là bản dịch).</Output_Expectation>
</Translation_Instructions>

<Parameters>
1.  Ngôn ngữ tóm tắt: \${lang}
    - Tóm tắt sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định với chất lượng dịch thuật cao nhất - chính xác, tự nhiên và lưu loát như người bản xứ, dịch các thuật ngữ chuyên ngành và tên riêng một cách chuẩn xác.

2.  Độ dài tóm tắt cho mỗi chương/phần: \${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 1-2 câu) về ý chính của chương/phần đó.
    - "medium": Tóm tắt ngắn gọn (2-4 câu) bao gồm các điểm chính của chương/phần.
    - "long": Tóm tắt chi tiết (từ 5 câu trở lên hoặc nhiều đoạn) bao gồm tất cả các phần quan trọng, luận điểm hỗ trợ và thông tin chi tiết có trong chương/phần đó.
    *(Lưu ý: Độ dài này áp dụng cho phần tóm tắt dưới tiêu đề mỗi chương và có thể linh hoạt tùy theo nội dung thực tế của chương.)*
    
</Parameters>

<Input_Format>
Định dạng của transcript sẽ là văn bản thô có kèm dấu thời gian ở đầu mỗi dòng hoặc đoạn văn bản. Ví dụ:
00:05 Xin chào và quay trở lại với video hôm nay.
00:10 Chúng ta sẽ nói về Svelte 5.
00:15 Một trong những thay đổi lớn là sự ra đời của Runes.
...
</Input_Format>

<Guidelines>
- **Phân chia Chương:** Dựa vào các dấu thời gian, sự thay đổi chủ đề nội dung, hoặc các khoảng dừng đáng kể trong <Transcript_Input>, tự động xác định và phân chia transcript thành các chương hoặc phần logic.
- **Đặt Tên Chương:** Đặt tên ngắn gọn, súc tích và mô tả được nội dung chính của mỗi chương/phần đã xác định. Tên chương phải bằng ngôn ngữ \${lang}.
- **Xác định Thời Gian Bắt Đầu:** Thời gian bắt đầu của mỗi chương/phần sẽ là dấu thời gian sớm nhất được tìm thấy trong đoạn transcript tương ứng với chương/phần đó.
- **Cấu trúc Đầu ra:**
    1.  Bắt đầu đầu ra bằng tiêu đề chính: ## Tóm tắt video theo chương: (hoặc tiêu đề tương đương trong ngôn ngữ \${lang}).
    2.  Đối với *mỗi* chương/phần đã xác định, tạo một tiêu đề cấp 3 (###) theo định dạng: ### Thời gian bắt đầu Ước lượng - Tên chương bạn đặt.
3\.  Dưới tiêu đề cấp 3 của mỗi chương, tạo phần tóm tắt nội dung chính của chương đó, tuân thủ độ dài yêu cầu \(</span>{length}).
    4.  Nếu độ dài yêu cầu là "long" hoặc chương đó có nhiều điểm phức tạp, sử dụng tiêu đề cấp 4 (####) và danh sách gạch đầu dòng (-) để làm nổi bật các luận điểm hoặc chi tiết quan trọng bên trong phần tóm tắt của chapter đó.
    5.  Đảm bảo phần tóm tắt mỗi chương (và các tiểu mục nếu có) bao gồm các luận điểm chính, thuật ngữ quan trọng (in đậm **Term** bằng ngôn ngữ \${lang}) được đề cập trong chapter đó, và thông tin cốt lõi.
    6.  Kết thúc toàn bộ tóm tắt bằng một tiêu đề cấp 2 (##) ## Kết luận chung (hoặc tiêu đề tương đương trong ngôn ngữ \${lang}), tóm tắt thông điệp tổng thể hoặc ý chính xuyên suốt video.
- **Định dạng Bắt buộc:** Chỉ sử dụng định dạng Markdown sau: ##, ###, ####, - (cho bullet points), ** (cho in đậm).
- **Ràng buộc:**
    - Không thêm bất kỳ lời chào hỏi, giới thiệu, kết luận cá nhân, hoặc văn bản nào khác ngoài cấu trúc và nội dung yêu cầu.
    - Chỉ sử dụng thông tin và thuật ngữ có trong <Transcript_Input>. Không thêm kiến thức từ bên ngoài.
    - Nếu một chương/phần được xác định quá ngắn hoặc không có nội dung đáng kể, hãy tóm tắt nó một cách cô đọng nhất có thể (có thể chỉ 1 câu), không cố gắng đạt đủ độ dài yêu cầu cho chapter đó nếu không có đủ thông tin.
- **Ngôn ngữ:** Toàn bộ đầu ra (bao gồm tiêu đề, tên chương, nội dung tóm tắt, kết luận) phải hoàn toàn bằng ngôn ngữ \${lang}.
</Guidelines>

<Example_Output_Format>
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
</Example_Output_Format>

<Transcript_Input>
\${timestampedTranscript}
</Transcript_Input>
`
