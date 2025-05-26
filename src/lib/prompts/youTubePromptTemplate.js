export const youTubePromptTemplate = `

<USER_TASK>
Hãy phân tích <Transcript> được cung cấp và tạo bản tóm tắt theo các <Parameters> và <Guidelines> đã nêu.
</USER_TASK>

<Translation_Instructions lang="\${lang}">
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
1.  Độ dài tóm tắt: \${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 2 câu) về ý chính tổng thể của video.
    - "medium": Tóm tắt ngắn gọn (2-4 câu) bao gồm các điểm chính được thảo luận.
    - "long": Tóm tắt chi tiết (5+ câu hoặc nhiều đoạn) bao gồm tất cả các phần quan trọng, điểm hỗ trợ và kết luận. Hãy cố gắng bao quát đầy đủ các khía cạnh chính được đề cập một cách cô đọng.
    *(Lưu ý: Số câu chỉ là ước tính, mục tiêu là truyền đạt đầy đủ thông tin trong phạm vi độ dài mong muốn và dựa trên nội dung transcript.)*

2.  Ngôn ngữ: \${lang}
    - Tóm tắt sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh).

3.  Định dạng: \${format}
    - "plain": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy.
    - "heading": Tóm tắt được tổ chức với tiêu đề cấp độ h2 (##) cho chủ đề chính và tiêu đề cấp độ h3 (###) cho các phần/điểm quan trọng. Nội dung dưới mỗi tiêu đề phải phù hợp với độ dài yêu cầu (\${length}) và làm nổi bật các "key points" của phần đó.
</Parameters>

<Guidelines>
- **Phân tích:** Đọc kỹ transcript để xác định chủ đề chính, các điểm quan trọng, ví dụ/minh họa hỗ trợ, và kết luận của video.
- **Tổ chức:** Tổ chức thông tin một cách logic và mạch lạc.
- **Định dạng (Conditional):** Nếu định dạng là "heading", tạo tiêu đề rõ ràng cho chủ đề chính (##) và các phần/điểm quan trọng (###).
- **Cô đọng:** Loại bỏ chi tiết không cần thiết, thông tin trùng lặp, các từ/câu nói thừa, và các đoạn chuyển không mang nội dung (ví dụ: "uhm", "à", "bạn biết đấy"). Chỉ giữ lại nội dung cốt lõi.
- **Khách quan & Chính xác:** Giữ giọng điệu khách quan và chính xác, chỉ dựa trên nội dung *từ* transcript. Không suy diễn hoặc thêm thông tin từ bên ngoài.
- **Nội dung Cụ Thể:** Nếu video chứa thuật ngữ chuyên ngành, số liệu thống kê, hoặc nghiên cứu, hãy bao gồm thông tin này một cách chính xác trong tóm tắt phù hợp với độ dài yêu cầu.
- **Quan điểm:** Nếu người nói chia sẻ quan điểm cá nhân hoặc ý kiến, nêu rõ đây là quan điểm *được trình bày trong video* (ví dụ: "Người nói cho rằng...", "Theo quan điểm được chia sẻ trong video...").
- **Các Bước/Hướng dẫn:** Nếu có phần thảo luận về các bước cụ thể hoặc hướng dẫn, tóm tắt các bước chính một cách ngắn gọn và rõ ràng (đặc biệt quan trọng cho độ dài "medium" và "long").
- **Độ dài & Chi tiết:** Đảm bảo mức độ chi tiết và số lượng nội dung trong tóm tắt tổng thể phù hợp với độ dài yêu cầu (\${length}). Nếu dùng format "heading", nội dung dưới mỗi heading cũng cần tương xứng.
- **Xử lý Transcript Không Đủ Thông tin:** Nếu <Transcript> quá ngắn, không có nội dung liên quan hoặc quá nhiễu để tạo bản tóm tắt có nghĩa theo độ dài yêu cầu, hãy trả về bản tóm tắt ngắn nhất có thể (có thể chỉ 1-2 câu) về những gì có trong transcript hoặc thông báo (bằng ngôn ngữ yêu cầu \${lang}) rằng "Không đủ thông tin trong transcript để tạo tóm tắt chi tiết."
- **Ràng buộc:**
    - Không thêm bất kỳ lời chào, lời giới thiệu, kết luận cá nhân hoặc bất kỳ văn bản nào khác ngoài cấu trúc và định dạng bắt buộc của bản tóm tắt.
    - Không hiển thị thông tin về cài đặt (như độ dài, ngôn ngữ, định dạng yêu cầu) trong kết quả đầu ra.
    - Không sử dụng markdown block bao quanh đầu ra.
</Guidelines>

<Example Output format="heading" lang="vi" length="medium">
## Tóm tắt video Svelte 5:

### Giới thiệu về Svelte 5
Video giới thiệu Svelte 5 với thay đổi lớn là sự ra đời của Runes, cải thiện đáng kể cách quản lý trạng thái reactive trong ứng dụng Svelte so với các phiên bản trước.

### Các tính năng chính của Runes
Các Runes quan trọng được giới thiệu bao gồm \$state để khai báo trạng thái reactive, \$derived để tạo giá trị tính toán phụ thuộc vào trạng thái khác một cách tự động, và \$effect để xử lý các side effects (như cập nhật DOM thủ công hoặc gọi API) khi trạng thái thay đổi. Đây là những khối xây dựng cốt lõi cho mô hình reactivity mới của Svelte 5.

### Lợi ích và Cải thiện Hiệu suất
Phiên bản Svelte 5 hứa hẹn mang lại những lợi ích đáng kể về hiệu suất ứng dụng nhờ kiến trúc reactivity được tối ưu, cùng với việc giảm kích thước bundle và cải thiện trải nghiệm phát triển, giúp xây dựng các ứng dụng web hiệu quả hơn.
</Example Output>

<Transcript>
\${text}
</Transcript>`
