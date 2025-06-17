// @ts-nocheck
export const selectedTextPromptTemplate = `<USER_TASK>
Bạn là một trợ lý AI. Nhiệm vụ của bạn là phân tích văn bản <Input_Content> và tạo ra một phản hồi gồm hai phần theo một cấu trúc chặt chẽ.

**Quy trình thực hiện:**
1.  **Bước 1 (Phân tích & Tóm tắt):** Trước tiên, hãy đọc kỹ và tạo một bản tóm tắt nội dung chính của <Input_Content> theo các <Parameters> được chỉ định.
2.  **Bước 2 (Nhận xét):** Dựa trên nội dung bạn vừa tóm tắt và kiến thức nền của mình, hãy đưa ra một nhận xét chuyên sâu về thông tin đó.

**Cấu trúc trình bày cuối cùng:** Phản hồi của bạn phải được trình bày theo thứ tự ngược lại: **Phần Nhận xét sẽ xuất hiện TRƯỚC Phần Tóm tắt.**

Hãy tuân thủ nghiêm ngặt các <Parameters> và <Output_Structure_And_Guidelines>.
</USER_TASK>


<Parameters>
1.  Độ dài tóm tắt: \${length}
    - "short": Cung cấp cái nhìn tổng quan nhất, thường là 1-2 câu.
    - "medium": Trình bày các luận điểm cốt lõi.
    - "long": Trình bày chi tiết các luận điểm cốt lõi và thông tin hỗ trợ cần thiết.
    *(Lưu ý: Độ dài là ước tính và phụ thuộc vào lượng thông tin trong văn bản gốc.)*

2.  Ngôn ngữ phản hồi: \${lang}
    - Toàn bộ phản hồi phải được viết bằng ngôn ngữ được chỉ định với chất lượng cao, tự nhiên và lưu loát. Dịch thuật chính xác các thuật ngữ chuyên ngành và tên riêng.

3.  Định dạng tóm tắt: \${format}
    - "paragraph": Dạng một hoặc nhiều đoạn văn thuần túy.
    - "heading": Dạng tiêu đề cấp 2 (##) cho chủ đề chính và tiêu đề cấp 3 (###) cho các luận điểm phụ.
</Parameters>

<Output_Structure_And_Guidelines>
      **A. Cấu trúc tổng thể của phản hồi (BẮT BUỘC):**
      Phản hồi của bạn PHẢI bao gồm hai phần theo đúng thứ tự sau:
      1.  **Phần 1: Nhận xét chuyên sâu**
      2.  **Phần 2: Bản Tóm Tắt Nội Dung**

      **B. Hướng dẫn chi tiết cho từng phần:**

      **1. Phần 1: Nhận xét chuyên sâu**
          - **Mục tiêu:** Cung cấp phân tích, bối cảnh và đánh giá về thông tin trong văn bản.
          - **Nội dung cần có:**
              * **Bối cảnh và phân loại:** Nội dung thuộc lĩnh vực nào? Nó phù hợp với bối cảnh, xu hướng nào?
              * **Đánh giá thông tin:** Luận điểm có logic không? Có dấu hiệu của sự thiên vị (bias) không? Thông tin có còn cập nhật không?
              * **Góc nhìn bổ sung:** Có quan điểm trái chiều hoặc nghiên cứu nào khác liên quan không? Có thiếu sót thông tin quan trọng nào không?
              * **Tính thực tiễn:** Thông tin có thể áp dụng vào thực tế không? Cần lưu ý những hạn chế nào?
          
          **Yêu cầu cụ thể cho phần nhận xét:**
          - **Tuyên bố miễn trừ trách nhiệm:** Bắt đầu bằng "Dựa trên kiến thức của tôi được cập nhật đến [nêu rõ ngày cập nhật kiến thức của bạn]..." và kết thúc bằng khuyến nghị người dùng nên xác minh từ các nguồn chuyên môn.
          - **Độ dài:** Súc tích nhưng đầy đủ, khoảng **1-2 đoạn văn ngắn**.
          - **Ngôn ngữ:** Trả lời bằng ngôn ngữ được chỉ định trong \${lang}.

      **2. Phần 2: Bản Tóm Tắt Nội Dung**
          - **Mục tiêu:** Trình bày lại các ý chính của <Input_Content> một cách khách quan.
          - **Yêu cầu:** Tuân thủ chặt chẽ các tham số \${length} và \${format}. Giữ nguyên ý nghĩa gốc, không thêm thắt thông tin hay bình luận cá nhân.

      **C. Nguyên tắc chung:**
          - **Khách quan (trong tóm tắt):** Phần tóm tắt phải trung thành tuyệt đối với văn bản gốc.
          - **Chính xác và Tự nhiên:** Ngôn ngữ sử dụng phải chính xác về ngữ nghĩa, tự nhiên như người bản xứ của ngôn ngữ \${lang}. Dịch thuật ngữ chính xác, nếu không chắc chắn, có thể để thuật ngữ gốc trong ngoặc đơn.
          - **Định dạng rõ ràng:**
            - Sử dụng tiêu đề cấp 2 ## cho các tiêu đề chính ("Nhận xét chuyên sâu", "Bản Tóm Tắt Nội Dung").
            - Tuân thủ yêu cầu về định dạng paragraph hoặc heading cho phần tóm tắt.
            - Có thể dùng **in đậm** cho các khái niệm quan trọng và gạch đầu dòng - để liệt kê nếu cần.
          
      **D. Ràng buộc nghiêm ngặt:**
          - **KHÔNG** thêm lời chào, lời giới thiệu, lời kết hay bất kỳ văn bản nào ngoài cấu trúc đã yêu cầu.
          - **KHÔNG** hiển thị lại các giá trị của tham số (như \${length}, \${lang}, \${format}) trong kết quả đầu ra.
          - Toàn bộ phản hồi phải nhất quán về ngôn ngữ theo \${lang}.
</Output_Structure_And_Guidelines>

<Input_Content>
"""
\${text}
"""
</Input_Content>

<Example_Output format="heading" lang="vietnamese" length="medium">
## Nhận xét chuyên sâu
Dựa trên kiến thức của tôi được cập nhật đến tháng 9 năm 2023, nội dung này thuộc lĩnh vực tâm lý học nhận thức, cụ thể là về hiệu ứng Dunning-Kruger. Các luận điểm được trình bày phù hợp với các nghiên cứu gốc của Dunning và Kruger, tuy nhiên, văn bản chưa đề cập đến các tranh cãi gần đây về tính phổ quát của hiệu ứng này trong các nền văn hóa khác nhau. Thông tin này rất hữu ích để tự nhận thức trong học tập và làm việc, nhưng cần cẩn trọng khi áp dụng để đánh giá người khác và nên tham khảo thêm các nguồn học thuật để có cái nhìn toàn diện.

## Bản Tóm Tắt Nội Dung
### Hiệu ứng Dunning-Kruger
**Hiệu ứng Dunning-Kruger** là một dạng sai lệch nhận thức trong đó những người có năng lực thấp ở một lĩnh vực có xu hướng đánh giá quá cao năng lực của chính họ. Nguyên nhân chính là do sự thiếu hụt kỹ năng siêu nhận thức (metacognition) để nhận ra sự yếu kém của bản thân.

### Các biểu hiện chính
- **Người năng lực thấp:** Thường không nhận ra sai lầm của mình và đánh giá năng lực bản thân cao hơn thực tế.
- **Người năng lực cao:** Có xu hướng đánh giá thấp năng lực của mình một cách tương đối, vì họ cho rằng những việc dễ dàng với họ cũng dễ dàng với người khác.
</Example_Output>`
