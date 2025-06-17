// @ts-nocheck
export const udemySummaryPromptTemplate = `

<USER_TASK>
Hãy phân tích <Transcript> được cung cấp và tạo bản tóm tắt theo các <Parameters> và <Guidelines> đã nêu.
</USER_TASK>

<Parameters>
1.  Độ dài tóm tắt: \${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 2 câu) về ý chính tổng thể của bài giảng.
    - "medium": Tóm tắt ngắn gọn (2-4 câu) bao gồm các điểm chính được thảo luận.
    - "long": Tóm tắt chi tiết (5+ câu hoặc nhiều đoạn) bao gồm tất cả các phần quan trọng, điểm hỗ trợ và kết luận. Hãy cố gắng bao quát đầy đủ các khía cạnh chính được đề cập một cách cô đọng.
    *(Lưu ý: Số câu chỉ là ước tính, mục tiêu là truyền đạt đầy đủ thông tin trong phạm vi độ dài mong muốn và dựa trên nội dung transcript.)*

2.  Ngôn ngữ: \${lang}
    - Tóm tắt sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định với chất lượng dịch thuật cao nhất - chính xác, tự nhiên và lưu loát như người bản xứ, dịch các thuật ngữ chuyên ngành và tên riêng một cách chuẩn xác.

3.  Định dạng: \${format}
    - "plain": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy.
    - "heading": Tóm tắt được tổ chức với tiêu đề cấp độ h2 (##) cho chủ đề chính và tiêu đề cấp độ h3 (###) cho các phần/điểm quan trọng. Nội dung dưới mỗi tiêu đề phải phù hợp với độ dài yêu cầu (\${length}) và làm nổi bật các "key points" của phần đó.
</Parameters>

<Guidelines>
- **Phân tích:** Đọc kỹ transcript để xác định chủ đề chính, các điểm quan trọng, ví dụ/minh họa hỗ trợ, và kết luận của bài giảng.
- **Tổ chức:** Tổ chức thông tin một cách logic và mạch lạc.
- **Định dạng (Conditional):** Nếu định dạng là "heading", tạo tiêu đề rõ ràng cho chủ đề chính (##) và các phần/điểm quan trọng (###).
- **Cô đọng:** Loại bỏ chi tiết không cần thiết, thông tin trùng lặp, các từ/câu nói thừa, và các đoạn chuyển không mang nội dung (ví dụ: "uhm", "à", "bạn biết đấy"). Chỉ giữ lại nội dung cốt lõi.
- **Khách quan & Chính xác:** Giữ giọng điệu khách quan và chính xác, chỉ dựa trên nội dung *từ* transcript. Không suy diễn hoặc thêm thông tin từ bên ngoài.
- **Nội dung Cụ Thể:** Nếu bài giảng chứa thuật ngữ chuyên ngành, số liệu thống kê, hoặc nghiên cứu, hãy bao gồm thông tin này một cách chính xác trong tóm tắt phù hợp với độ dài yêu cầu.
- **Quan điểm:** Nếu người nói chia sẻ quan điểm cá nhân hoặc ý kiến, nêu rõ đây là quan điểm *được trình bày trong bài giảng* (ví dụ: "Người nói cho rằng...", "Theo quan điểm được chia sẻ trong bài giảng...").
- **Các Bước/Hướng dẫn:** Nếu có phần thảo luận về các bước cụ thể hoặc hướng dẫn, tóm tắt các bước chính một cách ngắn gọn và rõ ràng (đặc biệt quan trọng cho độ dài "medium" và "long").
- **Độ dài & Chi tiết:** Đảm bảo mức độ chi tiết và số lượng nội dung trong tóm tắt tổng thể phù hợp với độ dài yêu cầu (\${length}). Nếu dùng format "heading", nội dung dưới mỗi heading cũng cần tương xứng.
- **Xử lý Transcript Không Đủ Thông tin:** Nếu <Transcript> quá ngắn, không có nội dung liên quan hoặc quá nhiễu để tạo bản tóm tắt có nghĩa theo độ dài yêu cầu, hãy trả về bản tóm tắt ngắn nhất có thể (có thể chỉ 1-2 câu) về những gì có trong transcript hoặc thông báo (bằng ngôn ngữ yêu cầu \${lang}) rằng "Không đủ thông tin trong transcript để tạo tóm tắt chi tiết."
- **Ràng buộc:**
    - Không thêm bất kỳ lời chào, lời giới thiệu, kết luận cá nhân hoặc bất kỳ văn bản nào khác ngoài cấu trúc và định dạng bắt buộc của bản tóm tắt.
    - Không hiển thị thông tin về cài đặt (như độ dài, ngôn ngữ, định dạng yêu cầu) trong kết quả đầu ra.
    - Không sử dụng markdown block bao quanh đầu ra.
</Guidelines>

<Example Output format="heading" lang="vi" length="medium">
## Tóm tắt bài giảng về JavaScript Closures:

### Khái niệm Closure
Closure trong JavaScript là một hàm bên trong có thể truy cập các biến từ phạm vi bên ngoài của nó, ngay cả sau khi hàm bên ngoài đã kết thúc thực thi. Điều này cho phép hàm bên trong "ghi nhớ" môi trường mà nó được tạo ra.

### Cách hoạt động
Khi một hàm được định nghĩa bên trong một hàm khác, hàm bên trong tạo ra một closure. Closure này bao gồm hàm bên trong và môi trường từ vựng của hàm bên ngoài (tức là các biến và đối số của hàm bên ngoài).

### Ứng dụng thực tế
Closure rất hữu ích trong việc tạo ra các hàm riêng tư, quản lý trạng thái trong các module, và xây dựng các hàm factory. Chúng là một khái niệm mạnh mẽ trong JavaScript để tạo ra các cấu trúc dữ liệu linh hoạt và bảo mật.
</Example Output>

<Transcript>
\${text}
</Transcript>
`

export const udemyConceptsPromptTemplate = `

<role>
    Bạn là một chuyên gia uyên bác với kiến thức sâu rộng. Bạn có khả năng phân tích thông tin từ các tài liệu và giải thích các khái niệm phức tạp cho người học một cách minh bạch, có cấu trúc và đầy đủ.
</role>

<output_language>
    Ngôn ngữ giải thích: \${lang}
</output_language>

<action>
    1. Đọc kỹ transcript khoá học được cung cấp dưới đây, tập trung vào việc xác định các khái niệm chuyên ngành chính.
    2. Đối với mỗi khái niệm đã xác định, dựa vào kiến thức chuyên sâu của bạn (không chỉ dựa vào thông tin trong transcript), hãy:
       a. Cung cấp định nghĩa rõ ràng.
       b. Giải thích chi tiết về cách thức hoạt động hoặc nguyên lý của nó.
       c. Nêu bật tầm quan trọng hoặc ý nghĩa của khái niệm đó trong lĩnh vực liên quan.
       d. Cung cấp ít nhất một ví dụ thực tế hoặc đoạn mã để minh họa.
    3. Để đảm bảo tính chính xác và độ sâu, hãy suy nghĩ từng bước khi phân tích và giải thích từng khái niệm.
    4. Đảm bảo các giải thích có chiều sâu, bao quát các khía cạnh quan trọng mà không đi quá chi tiết vào những điểm không cần thiết, và sử dụng giọng văn học thuật nhưng vẫn dễ tiếp cận.
    - **Ràng buộc:**
    - Không thêm bất kỳ lời chào, lời giới thiệu.
    - Không sử dụng markdown block bao quanh đầu ra.
</action>

<format>
    Hãy trình bày câu trả lời của bạn bằng ngôn ngữ \${lang} và theo cấu trúc sau:
    ### [Khái niệm 1]
    #### 1. Định nghĩa
    [Giải thích định nghĩa chi tiết, chuyên sâu]
    #### 2. Cách hoạt động / Nguyên lý
    [Giải thích cách thức hoạt động hoặc nguyên lý một cách rõ ràng và đầy đủ]
    #### 3. Tầm quan trọng / Ý nghĩa
    [Phân tích tầm quan trọng hoặc ý nghĩa trong lĩnh vực liên quan]
    #### 4. Ví dụ / Ứng dụng
    [Cung cấp ví dụ thực tế hoặc trường hợp ứng dụng để minh họa]

    ### [Khái niệm 2]
    #### 1. Định nghĩa
    [Giải thích định nghĩa chi tiết, chuyên sâu]
    #### 2. Cách hoạt động / Nguyên lý
    [Giải thích cách thức hoạt động hoặc nguyên lý một cách rõ ràng và đầy đủ]
    #### 3. Tầm quan trọng / Ý nghĩa
    [Phân tích tầm quan trọng hoặc ý nghĩa trong lĩnh vực liên quan]
    #### 4. Ví dụ / Ứng dụng
    [Cung cấp ví dụ thực tế hoặc trường hợp ứng dụng để minh họa]
    Cứ tiếp tục cấu trúc này cho tất cả các khái niệm chính được xác định.
</format>



<input_transcript>

    \${text}

</input_transcript>

`
