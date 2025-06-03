// @ts-nocheck
export const selectedTextPromptTemplate = `<USER_TASK>
Bạn là một trợ lý AI, nhiệm vụ của bạn là:
      1.  Tạo bản tóm tắt nội dung chính của văn bản <Input_Content> theo các <Parameters> được chỉ định.
      2.  Sau bản tóm tắt, đưa ra một nhận xét chuyên sâu và cụ thể (dưới một heading ## riêng) về nội dung thông tin trong bản tóm tắt đó, dựa trên kiến thức hiện có của bạn.
      Hãy tuân thủ chặt chẽ các <Parameters> và <Output_Structure_And_Guidelines>.

</USER_TASK>


<Parameters>
1.  Độ dài tóm tắt: \${length}
    - "short": Cung cấp cái nhìn tổng quan nhất về nội dung, thường là 1-2 câu chính.
    - "medium": Trình bày các luận điểm cốt lõi.
    - "long": Trình bày các luận điểm cốt lõi và thông tin hỗ trợ cần thiết, độ dài cân đối với nội dung gốc.
    *(Lưu ý: Độ dài là ước tính và phụ thuộc vào lượng thông tin có trong văn bản gốc.)*

2.  Ngôn ngữ tóm tắt: \${lang}
    - Tóm tắt sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định với chất lượng dịch thuật cao nhất - chính xác, tự nhiên và lưu loát như người bản xứ, dịch các thuật ngữ chuyên ngành và tên riêng một cách chuẩn xác.

3.  Định dạng tóm tắt: \${format}
    - "paragraph": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy.
    - "heading": Tóm tắt nội dung chính bắt đầu bằng tiêu đề cấp 2 (##). Các điểm hoặc phần quan trọng hơn trong nội dung chính sử dụng tiêu đề cấp 3 (###)..
</Parameters>

<Output_Structure_And_Guidelines>
      **A. Cấu trúc tổng thể của phản hồi:**
      Phản hồi của bạn sẽ bao gồm hai phần chính, theo thứ tự:
      1.  **Phần 1: Nhận xét chuyên sâu về nội dung tóm tắt**
          -   Luôn bắt đầu bằng một tiêu đề cấp 2, ví dụ: '## Nhận xét và đánh giá' (hoặc tương đương trong ngôn ngữ \${lang}).
          -   Nội dung là một đoạn văn cụ thể và có giá trị đưa ra phân tích chuyên sâu về thông tin trong bản tóm tắt.
      2.  **Phần 2: Bản Tóm Tắt Nội Dung**
          -   Tuân theo yêu cầu \${length} và \${format} từ <Parameters>.

      **B. Hướng dẫn chi tiết cho từng phần:**

      **1. Phần 1: Nhận xét chuyên sâu về nội dung tóm tắt**
          - **Phân tích tính chất và bối cảnh:** Xác định lĩnh vực/chủ đề cụ thể mà nội dung thuộc về và đặt nó trong bối cảnh rộng hơn.
          - **Đánh giá độ tin cậy và nguồn gốc:** 
              * Nếu có thể xác định được nguồn, hãy comment về uy tín của nguồn đó
              * Đánh giá tính logic và nhất quán của các luận điểm
              * Chỉ ra nếu có bias rõ ràng hoặc thiếu khách quan
          - **Phân tích chất lượng thông tin:**
              * Thông tin có cập nhật/phù hợp với xu hướng hiện tại không?
              * Có thiếu sót hoặc cần bổ sung thông tin quan trọng nào không?
              * Độ phức tạp và mức độ chuyên môn của nội dung
          - **Đưa ra góc nhìn bổ sung:**
              * So sánh với các quan điểm/nghiên cứu khác trong cùng lĩnh vực (nếu có)
              * Chỉ ra các ứng dụng thực tế hoặc tác động tiềm năng
              * Đề xuất hướng tìm hiểu sâu hơn nếu cần thiết
          - **Đánh giá tính thực tiễn:**
              * Thông tin có thể áp dụng được trong thực tế không?
              * Có những hạn chế hoặc điều kiện áp dụng nào cần lưu ý?
          
          **Yêu cầu cụ thể cho phần nhận xét:**
          - **Tuyên bố miễn trừ trách nhiệm:** Bắt đầu bằng "Dựa trên kiến thức của tôi..." và kết thúc bằng khuyến nghị xác minh từ nguồn chuyên môn.
          - **Ngôn ngữ chuyên nghiệp nhưng dễ hiểu:** Tránh thuật ngữ quá phức tạp, giải thích rõ ràng.
          - **Cụ thể và có giá trị:** Mỗi nhận xét phải mang lại insight thực sự cho người đọc.
          - **Độ dài phù hợp:** 3-5 câu để đảm bảo đủ thông tin mà không quá dài.
          - **Trả lời bằng ngôn ngữ được chỉ định \${lang}.**

      **2. Phần 2: Bản Tóm Tắt Nội Dung**
          - Đọc và Hiểu Sâu <Input_Content>.
          - Xác định các luận điểm/thông tin quan trọng nhất phù hợp với \${length}.
          - Trình bày một cách khách quan, súc tích, mạch lạc, bảo toàn ý nghĩa gốc.

      **C. Nguyên tắc chung (áp dụng cho toàn bộ phản hồi):**
          - **Khách quan (trong tóm tắt):** Phần tóm tắt phải trung thực với văn bản gốc.
          - **Súc tích, Mạch lạc, Bảo toàn ý nghĩa.**
          - **Chính xác về Nghĩa:** Truyền tải đúng và đầy đủ ý nghĩa cốt lõi của bản tóm tắt gốc.
          - **Tự nhiên và Lưu Loát:** Sử dụng ngôn ngữ tự nhiên, trôi chảy, phù hợp với văn phong của người bản xứ nói tiếng \${lang}. Tránh dịch máy móc, từng từ một.
          - **Ngữ cảnh của Tóm tắt:** Hãy xem xét rằng đây là một bản tóm tắt nội dung, vì vậy cần sự cô đọng và dễ hiểu.
          - **Thuật ngữ (Nếu có):** Dịch chính xác các thuật ngữ quan trọng (nếu có trong văn bản) sang \${lang} một cách phù hợp niếu không biết chính xác hãy để trong ngoặc ().
          - **Tuân thủ định dạng Markdown** theo yêu cầu.
          - **Trình bày rõ ràng:**
            - Sử dụng tiêu đề cấp 2 (##) cho phần nhận xét chung.
            - Sử dụng tiêu đề cấp 3 (###) cho các phần trong bản tóm tắt nếu định dạng là "heading".
            - Sử dụng **in đậm** cho các thuật ngữ hoặc khái niệm quan trọng.
            - Sử dụng bullet points (-) hoặc tiêu đề cấp 4 (####) nếu cần làm nổi bật các luận điểm hoặc chi tiết quan trọng trong bản tóm tắt.
          


      **D. Ràng buộc nghiêm ngặt (áp dụng cho toàn bộ phản hồi):**
          - Không thêm bất kỳ lời chào, lời giới thiệu ban đầu, kết luận cá nhân (ngoài phần nhận xét chung theo hướng dẫn) hoặc bất kỳ văn bản nào khác ngoài cấu trúc yêu cầu.
          - Không hiển thị thông tin về cài đặt (như \${length}, \${lang}, \${format}) trong kết quả đầu ra.
          - Toàn bộ phản hồi phải nhất quán về ngôn ngữ theo \${lang}.
    </Output_Structure_And_Guidelines>

<Input_Content>
"""
\${text}
"""
</Input_Content>

<Example_Output format="heading" lang="vietnamese" length="medium">
## Nhận xét và đánh giá chuyên môn
Dựa trên kiến thức của tôi đến tháng 1/2025, nội dung này thuộc lĩnh vực [cụ thể hóa lĩnh vực] và phản ánh xu hướng hiện tại trong [bối cảnh cụ thể]. Các luận điểm được trình bày có tính logic cao và phù hợp với các nghiên cứu gần đây, tuy nhiên cần lưu ý rằng [chỉ ra điểm cần cân nhắc cụ thể]. Thông tin này có thể được áp dụng hiệu quả trong [ứng dụng thực tế], nhưng người dùng nên tham khảo thêm các nguồn chuyên môn để có cái nhìn toàn diện hơn.

## Bản Tóm Tắt Nội Dung
### Luận điểm chính
**Khái niệm cốt lõi**: [Giải thích cụ thể]
- Chi tiết quan trọng 1
- Chi tiết quan trọng 2

### Các yếu tố hỗ trợ
- Bằng chứng/dữ liệu được đề cập
- Ví dụ minh họa cụ thể
</Example_Output>`
