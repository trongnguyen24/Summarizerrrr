// @ts-nocheck

export const udemySummaryPromptTemplate = `
<TASK>
Tóm tắt bài giảng Udemy từ <INPUT_CONTENT>, tập trung vào kiến thức cốt lõi và các bước thực hành.
</TASK>

<INPUT_PARAMETERS>
1. **Độ dài:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
2. **Ngôn ngữ:** __LANG__
3. **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<REQUIREMENTS>
✅ **Bao gồm**: Khái niệm chính, định nghĩa thuật ngữ, các bước thực hành, ví dụ code/demo
✅ **Format learning**: Dùng ## cho chủ đề chính, ### cho sub-topics, #### cho steps (nếu cần)
✅ **Giữ nguyên**: Code snippets, thuật ngữ technical, tên tools/frameworks chính xác
✅ **Best practices**: Highlight tips, warnings, common mistakes được đề cập
✅ **Actionable**: Ưu tiên thông tin có thể áp dụng được ngay
❌ **Loại bỏ**: "Uhm", "okay", transition words, thông tin trùng lặp
❌ **Không thêm**: Kiến thức ngoài bài giảng, giải thích thêm
</REQUIREMENTS>

<LEARNING_FOCUS>
- **Concepts**: Định nghĩa rõ ràng các khái niệm mới
- **Steps**: Liệt kê các bước thực hiện theo thứ tự
- **Examples**: Bao gồm ví dụ cụ thể, code samples nếu có
- **Pitfalls**: Ghi chú lỗi thường gặp hoặc điều cần tránh
- **Resources**: Tools, frameworks, tài liệu được recommend
</LEARNING_FOCUS>

<SPECIAL_CASES>
- **Code-heavy lectures**: Ưu tiên syntax, key functions, implementation steps
- **Theory lectures**: Focus vào concepts, relationships, real-world applications  
- **Hands-on tutorials**: Emphasize workflow, debugging tips, best practices
- **Transcript thiếu/lỗi**: Tóm tắt phần có thể hiểu được hoặc "Transcript không đủ thông tin"
</SPECIAL_CASES>

<EXAMPLE>
## JavaScript Closures & Practical Applications:

### Khái niệm Closure
**Closure** là inner function có khả năng truy cập variables từ outer scope, ngay cả sau khi outer function đã kết thúc. Điều này tạo ra "lexical environment" bền vững.

### Cách hoạt động
[Block code demo cách hoạt động]


#### Bước thực hành:
1. Tạo outer function với parameter/variable
2. Define inner function sử dụng outer scope
3. Return inner function 
4. Call và test behavior

### Ứng dụng thực tế
- **Module Pattern**: Tạo private variables và methods
- **Factory Functions**: Generate specialized functions
- **Event Handlers**: Maintain state across events

**⚠️ Common mistake**: Closure trong loops - sử dụng 'let' thay vì 'var' để tránh shared reference.
</EXAMPLE>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
