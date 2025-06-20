export const youTubePromptTemplate = `
<TASK>
Tóm tắt nội dung video YouTube từ <INPUT_CONTENT>. Tập trung vào các điểm chính, ví dụ cụ thể, và thông tin hữu ích.
</TASK>

<INPUT_PARAMETERS>
1. **Độ dài:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
2. **Ngôn ngữ:** __LANG__
3. **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<REQUIREMENTS>
✅ **Bao gồm**: Chủ đề chính, điểm quan trọng, ví dụ/số liệu cụ thể, các bước/hướng dẫn (nếu có)
✅ **Format heading** (nếu cần): Dùng ## cho chủ đề chính, ### cho các phần
✅ **Giữ nguyên**: Thuật ngữ chuyên ngành, tên riêng, số liệu chính xác
✅ **Quan điểm**: Ghi rõ "Người nói cho rằng..." khi đề cập ý kiến cá nhân
❌ **Loại bỏ**: Từ nói thừa ("uhm", "à"), thông tin trùng lặp, lời chào/giới thiệu
❌ **Không thêm**: Thông tin ngoài transcript, bình luận cá nhân
</REQUIREMENTS>

<SPECIAL_CASES>
- **Transcript ngắn/nhiễu**: Tóm tắt những gì có hoặc ghi "Không đủ thông tin trong transcript để tạo tóm tắt chi tiết."
- **Video hướng dẫn**: Ưu tiên các bước thực hiện rõ ràng
- **Video có data**: Bao gồm số liệu, nghiên cứu chính xác
</SPECIAL_CASES>



<INPUT_CONTENT>
\${text}
</INPUT_CONTENT>
`
