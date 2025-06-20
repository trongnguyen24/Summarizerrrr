export const chapterPromptTemplate = `
<TASK>
Phân tích <INPUT_CONTENT> và tạo bản tóm tắt chi tiết theo từng chương/phần logic, kèm thời gian bắt đầu ước lượng. Đặc biệt chú ý bảo tồn các ví dụ, câu chuyện, và chi tiết minh họa quan trọng.
</TASK>

<CONTEXT>
Nội dung đầu vào là transcript video có kèm timestamp. Các ví dụ cụ thể, câu chuyện minh họa, và case studies là yếu tố quan trọng giúp nội dung dễ hiểu và thuyết phục hơn.
</CONTEXT>

<INPUT_PARAMETERS>
1. **Ngôn ngữ đầu ra:** __LANG__
2. **Độ dài:** Tóm tắt chi tiết bao gồm luận điểm chính, ví dụ minh họa, và thông tin hỗ trợ quan trọng
3. **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
## Tóm tắt video theo chương:

### [Thời gian] - [Tên chương]
[Nội dung tóm tắt bao gồm:]
- Luận điểm chính và thuật ngữ quan trọng (**in đậm**)
- **Ví dụ cụ thể**: Tóm tắt ngắn gọn các ví dụ, case studies, câu chuyện được đề cập
- **Số liệu/dữ liệu**: Các con số, tỷ lệ, thống kê quan trọng (nếu có)
- Kết luận hoặc takeaway của phần này

## Kết luận chung
[Thông điệp tổng thể hoặc ý chính xuyên suốt video]
</OUTPUT_STRUCTURE>

<KEY_REQUIREMENTS>
✅ **LUÔN bao gồm ví dụ cụ thể** được đề cập trong video
✅ **Giữ lại tên riêng, số liệu** để tăng tính chính xác  
✅ **Liên kết ví dụ với luận điểm chính** - giải thích ví dụ minh họa điều gì
✅ **Sử dụng cụm từ chỉ dẫn**: "Ví dụ:", "Câu chuyện về:", "Theo nghiên cứu:"
✅ Toàn bộ nội dung bằng ngôn ngữ __LANG__
❌ Không thêm lời chào hoặc bình luận cá nhân
❌ Không bỏ qua ví dụ minh họa quan trọng
</KEY_REQUIREMENTS>

<EXAMPLE>
## Tóm tắt video theo chương:

### 0:00 - Giới thiệu về Tư duy Phát triển
Khái niệm **Growth Mindset** vs **Fixed Mindset** của Carol Dweck. Người có tư duy phát triển tin rằng khả năng có thể cải thiện qua nỗ lực.

**Ví dụ về Michael Jordan**: Bị loại khỏi đội bóng rổ trường trung học nhưng không bỏ cuộc, luyện tập chăm chỉ và trở thành huyền thoại NBA.

### 3:45 - Nghiên cứu trong Giáo dục  
**Thí nghiệm với 400 học sinh**: Nhóm được khen "thông minh" vs nhóm được khen "chăm chỉ". Kết quả: nhóm thứ hai cải thiện điểm số 23% sau 6 tháng.

**Câu chuyện về Lisa**: Học sinh yếu toán, sau khi thay đổi cách suy nghĩ từ "tôi không giỏi toán" thành "tôi chưa giỏi toán", đã vượt qua và đạt điểm A.

### 8:20 - Ứng dụng trong Công việc
Các công ty như **Microsoft** áp dụng Growth Mindset trong văn hóa doanh nghiệp, khuyến khích nhân viên học hỏi từ thất bại thay vì né tránh rủi ro.

## Kết luận chung
Tư duy phát triển không chỉ cải thiện học tập mà còn giúp con người vượt qua thử thách trong mọi lĩnh vực cuộc sống.
</EXAMPLE>

<INPUT_CONTENT>
\${timestampedTranscript}
</INPUT_CONTENT>
`
