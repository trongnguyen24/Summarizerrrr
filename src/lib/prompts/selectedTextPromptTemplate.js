// @ts-nocheck
export const selectedTextPromptTemplate = `
<TASK>
Phân tích <INPUT_CONTENT> và tạo phản hồi gồm hai phần: tóm tắt khách quan và nhận xét chuyên sâu.
</TASK>

<INPUT_PARAMETERS>
1. **Độ dài:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
2. **Ngôn ngữ:** __LANG__
3. **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<RESPONSE_STRUCTURE>
## Bản Tóm Tắt Nội Dung
[Tóm tắt khách quan các ý chính từ INPUT_CONTENT, tuân thủ độ dài yêu cầu]

## Nhận Xét Chuyên Sâu
[Phân tích và đánh giá nội dung dựa trên kiến thức chuyên môn]
</RESPONSE_STRUCTURE>

<SUMMARY_REQUIREMENTS>
✅ **Objective**: Trung thành với nội dung gốc, không thêm ý kiến cá nhân
✅ **Accurate**: Giữ nguyên ý nghĩa, thuật ngữ chính xác
✅ **Format-compliant**: Tuân thủ strict requirements về độ dài và structure
✅ **Key points**: Bao gồm các luận điểm chính, data, conclusions
</SUMMARY_REQUIREMENTS>

<EXPERT_ANALYSIS_FOCUS>
🔍 **Context & Classification**: Lĩnh vực nào? Fit với trends/research nào?
📊 **Information Quality**: Logic của arguments? Bias indicators? Timeliness?
🔄 **Alternative Perspectives**: Counterarguments? Missing information? Other studies?
⚡ **Practical Application**: Real-world applicability? Limitations? Implementation considerations?
</EXPERT_ANALYSIS_FOCUS>

<STYLE_GUIDELINES>
- **Headers**: ## cho main sections, ### cho subsections
- **Emphasis**: **Bold** cho key concepts, - bullets cho lists
- **Language**: Natural, native-level __LANG__ expression
- **Technical terms**: Accurate translation, original term in () if uncertain
- **No fluff**: Direct response, no greetings/conclusions outside structure
</STYLE_GUIDELINES>

<EXAMPLE>
## Bản Tóm Tắt Nội Dung

### Khái niệm Hiệu ứng Dunning-Kruger
**Hiệu ứng Dunning-Kruger** là cognitive bias khiến người có năng lực thấp đánh giá quá cao khả năng bản thân do thiếu **metacognition** - khả năng nhận thức về giới hạn kiến thức của mình.

### Biểu hiện chính
- **Incompetent individuals**: Không nhận ra lỗi sai, overestimate abilities
- **Competent individuals**: Underestimate khả năng vì assume tasks dễ với mọi người

## Nhận Xét Chuyên Sâu

Nội dung thuộc **cognitive psychology**, specifically về metacognitive biases. Findings align với original Dunning-Kruger research (1999), nhưng recent studies suggest **cultural variations** trong effect này chưa được đề cập. 

**Strengths**: Clear explanation của mechanism, practical relevance cho self-assessment. **Limitations**: Oversimplified - không mention statistical criticisms của original study hay **alternative explanations** (regression to mean, better-than-average effect).

**Practical application**: Valuable cho educational/workplace contexts nhưng avoid using để judge others. Recommend complementing với **360-degree feedback** và objective performance metrics để accurate assessment.
</EXAMPLE>

<INPUT_CONTENT>
\${text}
</INPUT_CONTENT>
`
