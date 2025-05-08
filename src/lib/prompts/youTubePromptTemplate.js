export const youTubePromptTemplate = `

<USER_TASK>
Hãy phân tích <Transcript> được cung cấp và tạo bản tóm tắt theo các <Parameters> và <Guidelines> đã nêu.
</USER_TASK>

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
