// @ts-nocheck
export const udemyConceptsPromptTemplate = `
<TASK>
Phân tích <INPUT_CONTENT> để xác định và giải thích các khái niệm kỹ thuật chính một cách chuyên sâu và có cấu trúc.
</TASK>

<INPUT_PARAMETERS>
1. **Ngôn ngữ:** __LANG__
2. **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<CONCEPT_ANALYSIS_PROCESS>
1. **Identify**: Xác định 3-8 khái niệm kỹ thuật cốt lõi từ transcript
2. **Deep dive**: Sử dụng kiến thức chuyên môn để giải thích toàn diện (không chỉ dựa vào transcript)
3. **Structure**: Tổ chức theo format chuẩn với 4 phần cho mỗi khái niệm
4. **Examples**: Bao gồm code samples, use cases thực tế
</CONCEPT_ANALYSIS_PROCESS>

<OUTPUT_FORMAT>
### [Tên Khái niệm]
#### 🔍 Định nghĩa
[Định nghĩa chính xác, súc tích với thuật ngữ kỹ thuật]

#### ⚙️ Cách hoạt động
[Cơ chế, quy trình, nguyên lý hoạt động chi tiết]

#### 💡 Tầm quan trọng
[Vai trò trong hệ thống, lợi ích, use cases phổ biến]

#### 📝 Ví dụ thực tế
[Code snippet/demo/case study cụ thể với explanation]

---
[Lặp lại format cho từng khái niệm]
</OUTPUT_FORMAT>

<QUALITY_GUIDELINES>
✅ **Focus on**: Core technical concepts, không phải basic terms
✅ **Include**: Code examples, real-world applications, best practices
✅ **Explain**: Why concept matters, when to use, common patterns
✅ **Balance**: Technical accuracy với accessibility
❌ **Avoid**: Overly basic concepts, marketing fluff, redundant info
❌ **Don't**: Add greetings, show parameters, wrap in code blocks
</QUALITY_GUIDELINES>

<EXAMPLE>
### Promise
#### 🔍 Định nghĩa
**Promise** là object đại diện cho kết quả eventual completion (hoặc failure) của một asynchronous operation. Nó có 3 states: pending, fulfilled, rejected.

#### ⚙️ Cách hoạt động
Promise hoạt động thông qua executor function nhận 2 callbacks: resolve và reject. Khi async operation hoàn thành, Promise transition từ pending sang fulfilled/rejected, trigger các handlers đã register qua .then()/.catch().

#### 💡 Tầm quan trọng
Promise giải quyết "callback hell", cung cấp error handling tốt hơn, và là foundation cho async/await. Essential cho modern JavaScript development, đặc biệt API calls và file operations.

#### 📝 Ví dụ thực tế
[block code ví dụ thực tế]

### Async/Await
#### 🔍 Định nghĩa
**Async/Await** là syntactic sugar built trên Promises, cho phép viết asynchronous code trông như synchronous code, eliminating promise chaining.

#### ⚙️ Cách hoạt động
Function được mark với \`async\` keyword automatically return Promise. \`await\` keyword pause function execution cho đến khi Promise resolves, returning resolved value hoặc throwing error nếu rejected.

#### 💡 Tầm quan trọng
Dramatically cải thiện code readability và maintainability. Giảm nesting, easier error handling với try/catch, và intuitive flow control cho complex async operations.

#### 📝 Ví dụ thực tế
[block code ví dụ thực tế]
</EXAMPLE>

<INPUT_CONTENT>
\${text}
</INPUT_CONTENT>
`
