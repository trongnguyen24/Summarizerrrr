export const youTubePromptTemplate = `
<TASK>
Tóm tắt nội dung video YouTube từ <INPUT_CONTENT>. Tập trung vào các điểm chính, ví dụ cụ thể, và thông tin hữu ích.
</TASK>

<INPUT_PARAMETERS>
1. **Độ dài:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
2. **Ngôn ngữ:** __LANG__
3. **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
## [Tiêu đề video hoặc chủ đề chính]
[Nội dung tóm tắt được trình bày bằng ###, ####, bullet points, hoặc paragraphs tùy theo nội dung]

## Kết luận/Takeaway
[Thông điệp chính hoặc hành động cần thực hiện]
</OUTPUT_STRUCTURE>

<REQUIREMENTS>
✅ **Bao gồm**: Chủ đề chính, điểm quan trọng, ví dụ/số liệu cụ thể, các bước/hướng dẫn (nếu có)
✅ **Tách biệt rõ ràng** các loại thông tin bằng heading, bullet points, hoặc paragraphs
✅ **Giữ nguyên**: Thuật ngữ chuyên ngành, tên riêng, số liệu chính xác
✅ **Quan điểm**: Ghi rõ "Người nói cho rằng..." khi đề cập ý kiến cá nhân
❌ Không viết thành đoạn văn dài liền mạch khi có thể tách nhỏ
❌ Không thêm thông tin ngoài transcript hoặc bình luận cá nhân
❌ Không bao gồm từ nói thừa ("uhm", "à"), thông tin trùng lặp
❌ Không thêm lời chào hoặc giới thiệu không cần thiết
</REQUIREMENTS>

<SPECIAL_CASES>
- **Transcript ngắn/nhiễu**: Tóm tắt những gì có hoặc ghi "Không đủ thông tin trong transcript để tạo tóm tắt chi tiết."
- **Video hướng dẫn**: Ưu tiên các bước thực hiện rõ ràng
- **Video có data**: Bao gồm số liệu, nghiên cứu chính xác
</SPECIAL_CASES>



<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
