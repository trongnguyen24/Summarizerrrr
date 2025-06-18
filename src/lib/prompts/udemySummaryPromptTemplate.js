// @ts-nocheck
export const udemySummaryPromptTemplate = `
<TASK>
Phân tích <INPUT_CONTENT> được cung cấp và tạo bản tóm tắt.
</TASK>

<CONTEXT>
Nội dung đầu vào là bản ghi (transcript) của một bài giảng Udemy.
</CONTEXT>

<INPUT_PARAMETERS>
1.  **Độ dài tóm tắt:** __LENGTH_DESCRIPTION__
    *(__LENGTH_NOTE__)*

2.  **Ngôn ngữ đầu ra:** __LANG__

3.  **Định dạng đầu ra:** __FORMAT_DESCRIPTION__

4.  **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
- **Phân tích:** Đọc kỹ transcript để xác định chủ đề chính, các điểm quan trọng, ví dụ/minh họa hỗ trợ, và kết luận của bài giảng.
- **Tổ chức:** Tổ chức thông tin một cách logic và mạch lạc.
- **Định dạng (Conditional):** Nếu định dạng là "heading", tạo tiêu đề rõ ràng cho chủ đề chính (##) và các phần/điểm quan trọng (###).
- **Cô đọng:** Loại bỏ chi tiết không cần thiết, thông tin trùng lặp, các từ/câu nói thừa, và các đoạn chuyển không mang nội dung (ví dụ: "uhm", "à", "bạn biết đấy"). Chỉ giữ lại nội dung cốt lõi.
- **Khách quan & Chính xác:** Giữ giọng điệu khách quan và chính xác, chỉ dựa trên nội dung *từ* transcript. Không suy diễn hoặc thêm thông tin từ bên ngoài.
- **Nội dung Cụ Thể:** Nếu bài giảng chứa thuật ngữ chuyên ngành, số liệu thống kê, hoặc nghiên cứu, hãy bao gồm thông tin này một cách chính xác trong tóm tắt phù hợp với độ dài yêu cầu.
- **Quan điểm:** Nếu người nói chia sẻ quan điểm cá nhân hoặc ý kiến, nêu rõ đây là quan điểm *được trình bày trong bài giảng* (ví dụ: "Người nói cho rằng...", "Theo quan điểm được chia sẻ trong bài giảng...").
- **Các Bước/Hướng dẫn:** Nếu có phần thảo luận về các bước cụ thể hoặc hướng dẫn, tóm tắt các bước chính một cách ngắn gọn và rõ ràng (đặc biệt quan trọng cho độ dài "medium" và "long").
- **Độ dài & Chi tiết:** Đảm bảo mức độ chi tiết và số lượng nội dung trong tóm tắt tổng thể phù hợp với độ dài yêu cầu. Nếu dùng format "heading", nội dung dưới mỗi heading cũng cần tương xứng.
- **Xử lý Transcript Không Đủ Thông tin:** Nếu <INPUT_CONTENT> quá ngắn, không có nội dung liên quan hoặc quá nhiễu để tạo bản tóm tắt có nghĩa theo độ dài yêu cầu, hãy trả về bản tóm tắt ngắn nhất có thể (có thể chỉ 1-2 câu) về những gì có trong transcript hoặc thông báo (bằng ngôn ngữ yêu cầu \${lang}) rằng "Không đủ thông tin trong transcript để tạo tóm tắt chi tiết."
</OUTPUT_STRUCTURE>

<CONSTRAINTS>
- Không thêm lời chào, lời giới thiệu hoặc bình luận cá nhân ngoài nội dung tóm tắt.
- Không hiển thị lại các giá trị tham số đầu vào trong kết quả.
- Chỉ sử dụng thông tin từ <INPUT_CONTENT>.
- Không bao bọc kết quả cuối cùng trong khối mã Markdown.
</CONSTRAINTS>

<EXAMPLE>
## Summary of JavaScript Closures Lecture:

### Concept of Closure
A closure in JavaScript is an inner function that has access to the variables from its outer scope, even after the outer function has finished execution. This allows the inner function to "remember" the environment in which it was created.

### How it works
When a function is defined inside another function, the inner function creates a closure. This closure includes the inner function and the lexical environment of the outer function (i.e., the outer function's variables and arguments).

### Practical Applications
Closures are very useful for creating private functions, managing state in modules, and building factory functions. They are a powerful concept in JavaScript for creating flexible and secure data structures.
</EXAMPLE>

<INPUT_CONTENT>
\${text}
</INPUT_CONTENT>
`
