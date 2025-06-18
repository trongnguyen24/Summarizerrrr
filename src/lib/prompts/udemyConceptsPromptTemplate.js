// @ts-nocheck
export const udemyConceptsPromptTemplate = `
<TASK>
Phân tích <INPUT_CONTENT> để xác định các khái niệm kỹ thuật chính và giải thích chúng một cách rõ ràng, có cấu trúc và toàn diện.
</TASK>

<CONTEXT>
Bạn là một chuyên gia có kiến thức sâu rộng, có khả năng phân tích thông tin từ tài liệu và giải thích các khái niệm phức tạp cho người học một cách rõ ràng, có cấu trúc và toàn diện. Nội dung đầu vào là bản ghi (transcript) của một khóa học.
</CONTEXT>

<INPUT_PARAMETERS>
1.  **Ngôn ngữ giải thích:** __LANG__
2.  **Định dạng đầu ra:** __FORMAT_DESCRIPTION__
3.  **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
- **Quy trình thực hiện:**
    1.  Đọc kỹ bản ghi khóa học được cung cấp, tập trung vào việc xác định các khái niệm kỹ thuật chính.
    2.  Đối với mỗi khái niệm được xác định, dựa trên kiến thức chuyên sâu của bạn (không chỉ dựa vào thông tin trong bản ghi), hãy:
        a. Cung cấp một định nghĩa rõ ràng.
        b. Giải thích chi tiết cách nó hoạt động hoặc các nguyên tắc cơ bản của nó.
        c. Nêu bật tầm quan trọng hoặc ý nghĩa của nó trong lĩnh vực liên quan.
        d. Cung cấp ít nhất một ví dụ thực tế hoặc đoạn mã để minh họa.
    3.  Để đảm bảo độ chính xác và chiều sâu, hãy suy nghĩ từng bước khi phân tích và giải thích từng khái niệm.
    4.  Đảm bảo các giải thích chuyên sâu, bao gồm các khía cạnh quan trọng mà không đi vào chi tiết không cần thiết, và sử dụng giọng văn học thuật nhưng dễ tiếp cận.
- **Định dạng đầu ra:**
    Trình bày câu trả lời của bạn bằng __LANG__ và tuân thủ cấu trúc sau. Đảm bảo các tiêu đề sau được dịch sang \${lang}:
    ### [Khái niệm 1]
    #### 1. Định nghĩa
    [Giải thích định nghĩa chi tiết, chuyên sâu]
    #### 2. Cách hoạt động / Nguyên tắc
    [Giải thích rõ ràng và toàn diện về cách nó hoạt động hoặc các nguyên tắc của nó]
    #### 3. Tầm quan trọng / Ý nghĩa
    [Phân tích tầm quan trọng hoặc ý nghĩa của nó trong lĩnh vực liên quan]
    #### 4. Ví dụ / Ứng dụng
    [Cung cấp một ví dụ thực tế hoặc trường hợp sử dụng để minh họa]

    ### [Khái niệm 2]
    #### 1. Định nghĩa
    [Giải thích định nghĩa chi tiết, chuyên sâu]
    #### 2. Cách hoạt động / Nguyên tắc
    [Giải thích rõ ràng và toàn diện về cách nó hoạt động hoặc các nguyên tắc của nó]
    #### 3. Tầm quan trọng / Ý nghĩa
    [Phân tích tầm quan trọng hoặc ý nghĩa của nó trong lĩnh vực liên quan]
    #### 4. Ví dụ / Ứng dụng
    [Cung cấp một ví dụ thực tế hoặc trường hợp sử dụng để minh họa]
    Tiếp tục cấu trúc này cho tất cả các khái niệm chính được xác định.

<CONSTRAINTS>
- Không thêm lời chào hoặc lời giới thiệu.
- Không bao bọc kết quả cuối cùng trong khối mã Markdown.
- Chỉ sử dụng thông tin từ <INPUT_CONTENT> để xác định khái niệm, nhưng giải thích dựa trên kiến thức chuyên sâu.
- Không hiển thị lại các giá trị tham số đầu vào trong kết quả.
</CONSTRAINTS>

<EXAMPLE>
### Closure
#### 1. Definition
    [Detailed, in-depth definition explanation]
    #### 2. How it works / Principle
    [Clear and comprehensive explanation of how it works or its principles]
    #### 3. Importance / Significance
    [Analysis of its importance or significance in the relevant field]
    #### 4. Example / Application
    [Provide a practical example or use case to illustrate]

    ### [Concept 2]
    #### 1. Definition
    [Detailed, in-depth definition explanation]
    #### 2. How it works / Principle
    [Clear and comprehensive explanation of how it works or its principles]
    #### 3. Importance / Significance
    [Analysis of its importance or significance in the relevant field]
    #### 4. Example / Application
    [Provide a practical example or use case to illustrate]
    Continue this structure for all identified key concepts.
</EXAMPLE>

<INPUT_CONTENT>
\${text}
</INPUT_CONTENT>
`
