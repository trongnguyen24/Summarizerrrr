export const generalPromptTemplate = `
<TASK>
Tóm tắt <INPUT_CONTENT> (có thể bao gồm nội dung chính và bình luận) theo format có cấu trúc.
</TASK>

<INPUT_PARAMETERS>
1. **Độ dài:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
2. **Ngôn ngữ:** __LANG__
3. **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<CONTENT_ANALYSIS>
🔍 **Main Content**: Xác định chủ đề chính, arguments, evidence/data, examples, conclusions
📝 **Comments** (nếu có): Identify trending opinions, popular viewpoints, discussion themes
📊 **Quality Filter**: Focus on valuable, reliable information; filter out noise/filler
🎯 **Structure**: Organize logically với clear sections và subsections
</CONTENT_ANALYSIS>

<OUTPUT_STRUCTURE>
## [Tiêu đề nội dung chính]
[Tóm tắt structured với key points, evidence, conclusions]

### [Subsection nếu cần]
- Key point 1 với **important terms** bold
- Key point 2 với data/numbers preserved
- Key point 3 với examples

## Tóm Tắt Bình Luận *(chỉ khi có comments)*
### Ý kiến chính
- Popular viewpoints and trending discussions
- Notable comments với high engagement
### Phản ứng cộng đồng
- Overall sentiment và key themes
</OUTPUT_STRUCTURE>

<QUALITY_REQUIREMENTS>
✅ **Preserve**: Numbers, dates, names, technical terms, main conclusions
✅ **Structure**: Clear headers (##, ###), bullets (-), **bold** for key concepts
✅ **Objective**: Maintain original meaning, note conflicting viewpoints if present
✅ **Comprehensive**: Cover main content + comment highlights (if available)
❌ **Remove**: Filler content, repetitive info, irrelevant details
❌ **Don't add**: Personal opinions, external information, greetings
</QUALITY_REQUIREMENTS>

<SPECIAL_HANDLING>
- **Article + Comments**: Separate sections cho main content vs community response
- **Poor quality content**: Extract best available information, acknowledge limitations
- **Conflicting viewpoints**: Present multiple perspectives objectively
- **No comments**: Skip comment section entirely
</SPECIAL_HANDLING>

<EXAMPLE>
## Khủng Hoảng Bản Sắc và Hành Trình Giáo Dục của Thanh Bùi

### Background và Identity Crisis
Nghệ sĩ **Thanh Bùi** chia sẻ về trải nghiệm "người Tây mặt vàng" khi lớn lên tại **Australia** - cảm giác không thuộc về và khủng hoảng bản sắc văn hóa Việt Nam.

### Sứ Mệnh Giáo Dục
- **2012**: Bắt đầu mở trường dạy nhạc
- **Mục tiêu**: Giúp thế hệ trẻ Việt hội nhập quốc tế nhưng giữ gìn gốc rễ
- **Quan sát**: Thí sinh thiếu kỹ năng tổng hợp, cần phương pháp giáo dục mới

### Tầm Nhìn và Triết Lý
Kết hợp **hội nhập toàn cầu** với **bảo tồn bản sắc**, tạo thế hệ trẻ tự tin trên sân chơi quốc tế mà vẫn có roots văn hóa Việt.

## Tóm Tắt Bình Luận

### Phản Ứng Tích Cực
- **Đồng cảm cao** với journey tìm lại bản sắc của Thanh Bùi
- **Ủng hộ** tầm nhìn giáo dục kết hợp truyền thống và hiện đại

### Insights từ Cộng Đồng
- Chia sẻ **struggles tương tự** của người Việt ở nước ngoài
- **Đánh giá cao** commitment trong giáo dục nghệ thuật
- **Discussion** về challenges của việc maintain cultural identity trong globalization
</EXAMPLE>

<INPUT_CONTENT>
\${text}
</INPUT_CONTENT>
`
