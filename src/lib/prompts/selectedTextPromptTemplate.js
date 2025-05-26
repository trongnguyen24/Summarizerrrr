// @ts-nocheck
export const selectedTextPromptTemplate = `<USER_TASK>
Bạn là một trợ lý AI, nhiệm vụ của bạn là:
      1.  Tạo bản tóm tắt nội dung chính của văn bản <Input_Content> theo các <Parameters> được chỉ định.
      2.  Sau bản tóm tắt, đưa ra một nhận xét chung ngắn gọn (dưới một heading ## riêng) về nội dung thông tin trong bản tóm tắt đó, dựa trên kiến thức hiện có của bạn.
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
      1.  **Phần 1: Nhận xét chung về nội dung tóm tắt**
          -   Luôn bắt đầu bằng một tiêu đề cấp 2, ví dụ: '## Nhận xét chung về nội dung tóm tắt' (hoặc tương đương trong ngôn ngữ \${lang}).
          -   Nội dung là một đoạn văn ngắn gọn đưa ra đánh giá tổng quan về thông tin trong bản tóm tắt dựa trên kiến thức của bạn.
      2.  **Phần 2: Bản Tóm Tắt Nội Dung**
          -   Tuân theo yêu cầu \${length} và \${format} từ <Parameters>.

      **B. Hướng dẫn chi tiết cho từng phần:**

      **1. Phần 1: Nhận xét chung về nội dung tóm tắt**
          - Xem xét tổng thể nội dung thông tin từ <Input_Content>.
          - Dựa trên kiến thức của bạn, đưa ra một nhận xét chung về tính chất của thông tin đó. Ví dụ:
              * Nó có phù hợp với hiểu biết chung/kiến thức phổ thông không?
              * Nó có đáng tin cậy không? Có nguồn gốc từ một nguồn uy tín không?
              * Nó có chứa các quan điểm cụ thể hay thông tin mang tính khách quan rộng rãi?
          - **Bắt buộc có tuyên bố miễn trừ trách nhiệm ngắn gọn:** Mở đầu hoặc kết thúc nhận xét bằng một cụm từ như: "Dựa trên kiến thức của tôi đến [ngày cuối cùng cập nhật kiến thức của bạn], ..." hoặc "...tuy nhiên, người dùng nên đối chiếu với các nguồn chuyên sâu để có thông tin đầy đủ nhất."
          - **Ngôn ngữ cẩn trọng:** Tránh khẳng định tuyệt đối. Sử dụng các cụm từ như "có vẻ", "dường như", "nhìn chung", "theo hiểu biết của tôi".
          - **Tập trung vào NỘI DUNG của tóm tắt**, không phải chất lượng của việc bạn tóm tắt.
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

<Example_Output format="heading" lang="vietnamse" length="medium">
## Nhận xét chung về nội dung tóm tắt
Dựa trên kiến thức của tôi đến [ngày cuối cùng cập nhật kiến thức của bạn], nội dung tóm tắt này có vẻ phù hợp với hiểu biết chung về [chủ đề của văn bản gốc]. Tuy nhiên, người dùng nên đối chiếu với các nguồn chuyên sâu để có thông tin đầy đủ nhất.

## Bản Tóm Tắt Nội Dung
Đây là bản tóm tắt nội dung chính của văn bản gốc:
- Luận điểm chính 1
- Luận điểm chính 2
- ...
</Example_Output>`
