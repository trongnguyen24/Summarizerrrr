export const generalPromptTemplate = `
<TASK>
Tóm tắt <INPUT_CONTENT> (có thể bao gồm nội dung chính và bình luận) theo format có cấu trúc.
</TASK>

<INPUT_PARAMETERS>
1. **Độ dài:** __LENGTH_DESCRIPTION__ *(__LENGTH_NOTE__)*
2. **Ngôn ngữ:** __LANG__
3. **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
## [Tiêu đề nội dung chính]
[Tóm tắt structured sử dụng linh hoạt ##, ###, ####, bullet points, tables, emoji để trình bày khoa học]

### [Subsection nếu cần]
#### Key point với **important terms** bold
- Bullet points cho thông tin chi tiết
- Tables cho so sánh/số liệu (nếu phù hợp)
- Emoji để highlight các điểm quan trọng 📊 🔍 ⚠️ ✅

## Tóm Tắt Bình Luận *(chỉ khi có comments)*
### Ý kiến chính
- Popular viewpoints và trending discussions
### Phản ứng cộng đồng
- Overall sentiment và key themes
</OUTPUT_STRUCTURE>

<KEY_REQUIREMENTS>
✅ **Trình bày khoa học** sử dụng đa dạng format: headings (##, ###, ####), bullet points, tables
✅ **Phân tích trước khi tóm tắt**: Xác định chủ đề chính, luận điểm, bằng chứng/số liệu, ví dụ, kết luận
✅ **Tách biệt rõ ràng** nội dung chính và bình luận (nếu có)
✅ **Khách quan** duy trì ý nghĩa gốc, ghi rõ các quan điểm trái chiều nếu có
✅ **Lọc chất lượng** tập trung thông tin có giá trị, đáng tin cậy
✅ Toàn bộ nội dung bằng ngôn ngữ __LANG__
❌ Không thêm ý kiến cá nhân, thông tin bên ngoài, lời chào
❌ Không bao gồm nội dung lặp lại, chi tiết không liên quan
❌ Không tóm tắt bình luận nếu không có hoặc chất lượng thấp
</KEY_REQUIREMENTS>

<SPECIAL_CASES>
- **Nội dung kém chất lượng**: Trích xuất thông tin tốt nhất có thể, thừa nhận hạn chế
- **Quan điểm mâu thuẫn**: Trình bày nhiều góc nhìn một cách khách quan  
- **Không có bình luận**: Bỏ qua hoàn toàn phần tóm Tắt Bình Luận
- **Bình luận chất lượng cao**: Ưu tiên những ý kiến có tương tác cao và có giá trị
- **Nội dung phong phú**: Sử dụng tables, emoji, và multi-level headings để tổ chức thông tin hiệu quả
</SPECIAL_CASES>

<EXAMPLE>
## 📊 Báo Cáo Tình Hình Thị Trường Bất Động Sản Q3/2024

###Tổng Quan Thị Trường

#### Xu hướng giá
| Khu vực | Q2/2024 | Q3/2024 | Thay đổi |
|---------|---------|---------|----------|
| **Hà Nội** | 45 triệu/m² | 47 triệu/m² | +4.4% ⬆️ |
| **TP.HCM** | 52 triệu/m² | 54 triệu/m² | +3.8% ⬆️ |
| **Đà Nẵng** | 35 triệu/m² | 36 triệu/m² | +2.9% ⬆️ |

#### Những yếu tố tác động 🔍
- **Lãi suất ngân hàng** giảm từ 12% xuống 10.5%
- **Nguồn cung** mới giảm 23% so với cùng kỳ năm trước
- **Chính sách pháp lý** về sở hữu đất đai được nới lỏng

### Dự Báo Xu Hướng

#### Triển vọng 6 tháng tới
⚠️ **Rủi ro**: Lạm phát có thể tăng trở lại  
✅ **Cơ hội**: Phân khúc căn hộ cao cấp vẫn khan hiếm  
🎯 **Khuyến nghị**: Ưu tiên đầu tư vào khu vực có hạ tầng phát triển

## 💬 Tóm Tắt Bình Luận

### Ý kiến chuyên gia
- **85%** chuyên gia dự báo giá sẽ tiếp tục tăng nhẹ
- Khuyến cáo nhà đầu tư **thận trọng** với phân khúc đất nền

### Phản ứng cộng đồng
- Người mua nhà **lo ngại** về khả năng chi trả
- Nhà đầu tư **lạc quan** về triển vọng dài hạn
</EXAMPLE>

<INPUT_CONTENT>
__CONTENT__
</INPUT_CONTENT>
`
