export const generalPromptTemplate = `<USER_TASK>
Hãy phân tích <Input_Content> được cung cấp (bao gồm nội dung chính và có thể có phần bình luận), và tạo bản tóm tắt dựa trên các <Parameters> và <Guidelines> dưới đây.
</USER_TASK>

    <Parameters>
1.  Độ dài tóm tắt: \${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 1-2 câu) về ý chính tổng thể của nội dung chính. Nếu có bình luận, chỉ tóm tắt ý chính nhất của phần bình luận trong 1 câu riêng biệt.
    - "medium": Tóm tắt ngắn gọn ( khoảng 3-5 câu) bao gồm các điểm chính của nội dung chính. Nếu có bình luận, tóm tắt các ý kiến/quan điểm chính từ bình luận trong khoảng 2-3 câu riêng biệt.
    - "long": Tóm tắt chi tiết bao gồm tất cả các phần quan trọng của nội dung chính, có thể chia thành các đoạn hoặc tiểu mục. Nếu có bình luận, tóm tắt chi tiết các ý kiến đa dạng và các điểm nổi bật trong phần bình luận, có thể chia thành các tiểu mục nhỏ.
    *(Lưu ý: Độ dài là ước tính và phụ thuộc vào lượng thông tin có trong nội dung gốc và bình luận.)*

2.  Ngôn ngữ tóm tắt: \${lang}
    - Tóm tắt sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định, tự nhiên và lưu loát như người bản xứ, dịch các thuật ngữ chuyên ngành và tên riêng một cách chuẩn xác.

3.  Định dạng tóm tắt: \${format}
    - "plain": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy, liên tục (phần nội dung chính và phần bình luận nếu có sẽ là các đoạn riêng biệt được phân cách rõ ràng bằng một dòng trống hoặc tiêu đề đơn giản).
    - "heading": Tóm tắt nội dung chính bắt đầu bằng tiêu đề cấp 2 (##). Các điểm hoặc phần quan trọng hơn trong nội dung chính sử dụng tiêu đề cấp 3 (###). Nếu có bình luận, phần tóm tắt bình luận sẽ có tiêu đề cấp 2 riêng biệt "## Tóm tắt bình luận" (hoặc tương đương trong ngôn ngữ \${lang}), và các ý/điểm nổi bật trong bình luận có thể dùng tiêu đề cấp 3 (###) hoặc cấp 4 (####) nếu cần chi tiết.
</Parameters>

<Guidelines>
- **Phân tích Nội dung:** Đọc kỹ <Input_Content> để xác định nội dung chính (bài viết, bài đăng, v.v.) và phần bình luận (nếu có). Phân tách hai phần này trong quá trình xử lý.
- **Tóm tắt Nội dung Chính:**
    - Xác định chủ đề chính, các luận điểm quan trọng, bằng chứng/số liệu hỗ trợ, ví dụ, và kết luận của nội dung chính.
    - Tổ chức thông tin tóm tắt một cách logic và mạch lạc.
    - Trình bày thông tin có cấu truc rõ ràng, sử dụng tiêu đề và bullet points hoặc cân nhắc tạo bảng table.
    - Giữ lại các số liệu, tên, ngày tháng, thuật ngữ quan trọng và kết luận chính có trong nội dung gốc. Sử dụng **in đậm** cho các thuật ngữ hoặc khái niệm quan trọng lần đầu xuất hiện trong tóm tắt nếu phù hợp.
    - Loại bỏ các chi tiết không cần thiết, thông tin lặp lại, và các câu/đoạn filler.
    - Đảm bảo bảo toàn ý nghĩa và ngữ cảnh của nội dung gốc.
    - Nếu nội dung gốc dài (>3000 từ được ước tính dựa trên <Input_Content>), đặc biệt khi \${length} là "long" hoặc "medium", hãy chia tóm tắt nội dung chính theo các chủ đề hoặc phần chính của nội dung gốc và sử dụng tiêu đề phù hợp (### hoặc #### nếu định dạng là "heading").
    - Nếu nội dung gốc trình bày thông tin mâu thuẫn hoặc các quan điểm khác nhau, hãy đề cập (một cách khách quan) các quan điểm đa dạng này trong bản tóm tắt.
    - Nếu chất lượng nội dung gốc hạn chế hoặc có nhiều thông tin nhiễu, tập trung vào việc trích xuất và tóm tắt những thông tin có giá trị và đáng tin cậy nhất có thể tìm thấy.
- **Tóm tắt Bình luận (Có điều kiện):**
    - Nếu <Input_Content> bao gồm phần bình luận, phân tích kỹ lưỡng để xác định các ý kiến, quan điểm, câu hỏi hoặc chủ đề thảo luận chính trong các bình luận.
    - Chú ý đến các bình luận nổi bật, những bình luận được nhiều người ủng hộ hoặc phản hồi nhất.
    - Tạo một phần tóm tắt riêng cho bình luận. Nếu định dạng là "heading", sử dụng tiêu đề "## Tóm tắt bình luận" (hoặc tương đương trong ngôn ngữ \${lang}).
    - Tóm tắt các điểm chính từ bình luận, không đi sâu vào chi tiết từng bình luận trừ khi bình luận đó cực kỳ nổi bật hoặc đại diện cho một quan điểm phổ biến. Mức độ chi tiết tuân theo yêu cầu \${length} cho phần bình luận.
- **Định dạng Bắt buộc:** Chỉ cho phép các định dạng Markdown sau: ##, ###, ####, - (để tạo gạch đầu dòng nếu cần cho các điểm chi tiết hoặc trong phần tóm tắt bình luận ở độ dài "long"), ** (để in đậm).
- **Ràng buộc:**
    - Niếu không có phần bình luận, không cần tạo phần tóm tắt bình luận.
    - Không thêm bất kỳ lời chào, lời giới thiệu, kết luận cá nhân hoặc bất kỳ văn bản nào khác ngoài cấu trúc và định dạng bắt buộc của bản tóm tắt.
    - Không hiển thị thông tin về cài đặt (như độ dài, ngôn ngữ, định dạng yêu cầu) trong kết quả đầu ra.
</Guidelines>

<Example_Output_Format format="heading" lang="vi" length="long">
## Tóm tắt bài viết: Mất gốc ngay tại quê hương
Bài viết của nghệ sĩ, nhà giáo dục Thanh Bùi chia sẻ những suy ngẫm cá nhân về khủng hoảng bản sắc (identity crisis) và tầm quan trọng của việc giữ gìn gốc gác Việt Nam trong bối cảnh hội nhập quốc tế.

### Khủng hoảng bản sắc cá nhân và hành trình tìm về nguồn cội
Tác giả kể về trải nghiệm của mình khi sinh ra và lớn lên tại Australia. Dù là người gốc Việt, ông luôn cảm thấy lạc trôi và không thực sự thuộc về nơi đó, gọi mình là "người Tây mặt vàng".

### Dấn thân vào lĩnh vực giáo dục và mối lo ngại về thế hệ trẻ
Song song với việc tìm lại bản sắc cá nhân, tác giả cảm thấy thôi thúc đóng góp giúp thế hệ trẻ Việt Nam hòa nhập thế giới nhưng vẫn giữ được gốc rễ. Ông bắt đầu sự nghiệp giáo dục năm 2012 với việc mở trường dạy nhạc, xuất phát từ quan sát các thí sinh thiếu kỹ năng tổng hợp.

### Lợi ích chính
Các lợi ích nổi bật của Wasm bao gồm:
 - Hiệu suất cao, an toàn nhờ sandbox
 - Portable trên các nền tảng và trình duyệt khác nhau
 - Khả năng tái sử dụng code từ các ngôn ngữ hiện có.

## Tóm tắt bình luận
Phần bình luận đa số thể hiện sự đồng tình và xúc động trước những chia sẻ của Thanh Bùi về tầm quan trọng của việc giữ gìn bản sắc Việt Nam.
### Các ý kiến nổi bật
- Nhiều người bày tỏ sự đồng cảm với trải nghiệm của tác giả, cho rằng việc giữ gìn gốc rễ văn hóa là rất quan trọng.
- Một số bình luận nhấn mạnh tầm quan trọng của giáo dục trong việc truyền đạt giá trị văn hóa cho thế hệ trẻ.
### Ủng hộ và đồng cảm
- Nhiều người bày tỏ sự đồng tình với quan điểm của tác giả, cho rằng việc giữ gìn bản sắc văn hóa là rất quan trọng trong bối cảnh toàn cầu hóa.
### Các ý kiến khác
- Một số bình luận đề cập đến những khó khăn trong việc duy trì bản sắc văn hóa khi sống xa quê hương.
- Có bình luận từ một đơn vị từng thi công cho cơ sở của Thanh Bùi, cảm nhận được sự tâm huyết của ông trong lĩnh vực giáo dục nghệ thuật.
</Example_Output_Format>

<Input_Content>
\${text}
</Input_Content>`
