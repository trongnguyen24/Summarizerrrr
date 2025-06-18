// @ts-nocheck
export const selectedTextPromptTemplate = `
<TASK>
Phân tích <INPUT_CONTENT> và tạo ra một phản hồi gồm hai phần: nhận xét chuyên sâu và bản tóm tắt nội dung.
</TASK>

<CONTEXT>
Nội dung đầu vào là một đoạn văn bản được chọn. Phản hồi sẽ trình bày phần nhận xét trước, sau đó đến phần tóm tắt.
</CONTEXT>

<INPUT_PARAMETERS>
1.  **Độ dài tóm tắt:** __LENGTH_DESCRIPTION__
    *(__LENGTH_NOTE__)*

2.  **Ngôn ngữ đầu ra:** __LANG__

3.  **Định dạng tóm tắt:** __FORMAT_DESCRIPTION__

4.  **Giọng văn:** __TONE_DESCRIPTION__
</INPUT_PARAMETERS>

<OUTPUT_STRUCTURE>
- **Cấu trúc tổng thể của phản hồi (BẮT BUỘC):**
  Phản hồi của bạn PHẢI bao gồm hai phần theo đúng thứ tự sau:
  1.  **Phần 1: Bản Tóm Tắt Nội Dung**
  2.  **Phần 2: Nhận xét chuyên sâu**

- **Hướng dẫn chi tiết cho từng phần:**

  **1. Phần 1: Bản Tóm Tắt Nội Dung**
      - **Mục tiêu:** Trình bày lại các ý chính của <INPUT_CONTENT> một cách khách quan.
      - **Yêu cầu:** Tuân thủ chặt chẽ các tham số về độ dài và định dạng. Giữ nguyên ý nghĩa gốc, không thêm thắt thông tin hay bình luận cá nhân.

  **2. Phần 2: Nhận xét chuyên sâu**
      - **Mục tiêu:** Cung cấp phân tích, bối cảnh và đánh giá về thông tin trong văn bản.
      - **Nội dung cần có:**
          * **Bối cảnh và phân loại:** Nội dung thuộc lĩnh vực nào? Nó phù hợp với bối cảnh, xu hướng nào?
          * **Đánh giá thông tin:** Luận điểm có logic không? Có dấu hiệu của sự thiên vị (bias) không? Thông tin có còn cập nhật không?
          * **Góc nhìn bổ sung:** Có quan điểm trái chiều hoặc nghiên cứu nào khác liên quan không? Có thiếu sót thông tin quan trọng nào không?
          * **Tính thực tiễn:** Thông tin có thể áp dụng vào thực tế không? Cần lưu ý những hạn chế nào?

- **Nguyên tắc chung:**
    - **Khách quan (trong tóm tắt):** Phần tóm tắt phải trung thành tuyệt đối với văn bản gốc.
    - **Chính xác và Tự nhiên:** Ngôn ngữ sử dụng phải chính xác về ngữ nghĩa, tự nhiên như người bản xứ của ngôn ngữ __LANG__. Dịch thuật ngữ chính xác, nếu không chắc chắn, có thể để thuật ngữ gốc trong ngoặc đơn.
    - **Định dạng rõ ràng:**
      - Sử dụng tiêu đề cấp 2 ## cho các tiêu đề chính ("Nhận xét chuyên sâu", "Bản Tóm Tắt Nội Dung"), tiêu đề cấp 3 ### cho các đề mục nhỏ hơn.
      - Tuân thủ yêu cầu về định dạng paragraph hoặc heading cho phần tóm tắt.
      - Có thể dùng **in đậm** cho các khái niệm quan trọng và gạch đầu dòng - để liệt kê nếu cần.
</OUTPUT_STRUCTURE>

<CONSTRAINTS>
- KHÔNG thêm lời chào, lời giới thiệu, lời kết hay bất kỳ văn bản nào ngoài cấu trúc đã yêu cầu.
- Toàn bộ phản hồi phải nhất quán về ngôn ngữ theo __LANG__.
- Chỉ sử dụng thông tin từ <INPUT_CONTENT> cho phần tóm tắt.
- Không bao bọc kết quả cuối cùng trong khối mã Markdown.
</CONSTRAINTS>

<EXAMPLE>
## Bản Tóm Tắt Nội Dung
### Hiệu ứng Dunning-Kruger
**Hiệu ứng Dunning-Kruger** là một dạng sai lệch nhận thức trong đó những người có năng lực thấp ở một lĩnh vực có xu hướng đánh giá quá cao năng lực của chính họ. Nguyên nhân chính là do sự thiếu hụt kỹ năng siêu nhận thức (metacognition) để nhận ra sự yếu kém của bản thân.

### Các biểu hiện chính
- **Người năng lực thấp:** Thường không nhận ra sai lầm của mình và đánh giá năng lực bản thân cao hơn thực tế.
- **Người năng lực cao:** Có xu hướng đánh giá thấp năng lực của mình một cách tương đối, vì họ cho rằng những việc dễ dàng với họ cũng dễ dàng với người khác.

## Nhận xét chuyên sâu
Dựa trên kiến thức của tôi được cập nhật đến tháng 9 năm 2023, nội dung này thuộc lĩnh vực tâm lý học nhận thức, cụ thể là về hiệu ứng Dunning-Kruger. Các luận điểm được trình bày phù hợp với các nghiên cứu gốc của Dunning và Kruger, tuy nhiên, văn bản chưa đề cập đến các tranh cãi gần đây về tính phổ quát của hiệu ứng này trong các nền văn hóa khác nhau. Thông tin này rất hữu ích để tự nhận thức trong học tập và làm việc, nhưng cần cẩn trọng khi áp dụng để đánh giá người khác và nên tham khảo thêm các nguồn học thuật để có cái nhìn toàn diện.
</EXAMPLE>

<INPUT_CONTENT>
\${text}
</INPUT_CONTENT>
`
