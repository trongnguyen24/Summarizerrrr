// @ts-nocheck
export const selectedTextPromptTemplate = `<USER_TASK>
Bạn là một trợ lý AI, nhiệm vụ của bạn là:
      1.  Tạo bản tóm tắt nội dung chính của văn bản <Input_Content> theo các <Parameters> được chỉ định.
      2.  Sau bản tóm tắt, đưa ra một nhận xét chung ngắn gọn (dưới một heading ## riêng) về nội dung thông tin trong bản tóm tắt đó, dựa trên kiến thức hiện có của bạn.
      Hãy tuân thủ chặt chẽ các <Parameters> và <Output_Structure_And_Guidelines>.

</USER_TASK>

<Translation_Instructions lang="\${lang}">
    <Goal>Bản tóm tắt cuối cùng bằng ngôn ngữ "\${lang}" phải đạt chất lượng dịch thuật cao nhất, truyền tải chính xác và đầy đủ ý nghĩa của nội dung đã được tóm tắt, đồng thời phải tự nhiên và lưu loát như người bản xứ viết.</Goal>
    <Quality_Criteria>
        <Criterion name="Meaning_Accuracy">Đảm bảo ý nghĩa cốt lõi, các chi tiết quan trọng và sắc thái của bản tóm tắt (trước khi dịch, nếu có bước đó) được bảo toàn và truyền tải một cách chính xác sang ngôn ngữ "\${lang}". Không thêm thông tin mới hoặc bỏ sót thông tin quan trọng trong quá trình dịch.</Criterion>
        <Criterion name="Natural_Fluency">Sử dụng từ ngữ, cấu trúc câu và văn phong tự nhiên, trôi chảy, và idiomatically correct trong ngôn ngữ "\${lang}". Tránh tuyệt đối lối dịch word-by-word hoặc các cấu trúc câu gượng ép, thiếu tự nhiên.</Criterion>
        <Criterion name="Terminology_Consistency">Các thuật ngữ chuyên ngành, tên riêng hoặc từ khóa quan trọng phải được dịch một cách nhất quán và chính xác sang "\${lang}". Ưu tiên sử dụng các thuật ngữ đã được chuẩn hóa hoặc phổ biến trong lĩnh vực liên quan của ngôn ngữ "\${lang}".</Criterion>
        <Criterion name="Cultural_Adaptation">Khi gặp các thành ngữ, tục ngữ, ví von hoặc các yếu tố mang đậm màu sắc văn hóa của ngôn ngữ nguồn, hãy tìm cách diễn đạt tương đương, phù hợp và dễ hiểu trong văn hóa của ngôn ngữ "\${lang}", thay vì dịch nghĩa đen một cách máy móc.</Criterion>
        <Criterion name="Tone_Preservation">Giữ nguyên giọng điệu (ví dụ: trang trọng, thân mật, khách quan, châm biếm) của bản tóm tắt gốc khi chuyển ngữ sang "\${lang}".</Criterion>
        <Criterion name="Grammar_And_Spelling">Bản dịch cuối cùng phải hoàn toàn không có lỗi ngữ pháp, chính tả, hoặc dấu câu trong ngôn ngữ "\${lang}".</Criterion>
    </Quality_Criteria>
    <Output_Expectation>Kết quả đầu ra phải là một bản tóm tắt hoàn chỉnh, chỉ bằng ngôn ngữ "\${lang}", tuân thủ tất cả các <Parameters> và <Guidelines> khác. Bản dịch phải liền mạch và không để lộ bất kỳ dấu hiệu nào của quá trình dịch thuật (ví dụ: không có chú thích của người dịch, không có cụm từ nào cho thấy đây là bản dịch).</Output_Expectation>
</Translation_Instructions>

<Parameters>
1.  Độ dài tóm tắt: \${length}
    - "short": Cung cấp cái nhìn tổng quan nhất về nội dung, thường là 1-2 câu chính.
    - "medium": Trình bày các luận điểm cốt lõi.
    - "long": Trình bày các luận điểm cốt lõi và thông tin hỗ trợ cần thiết, độ dài cân đối với nội dung gốc.
    *(Lưu ý: Độ dài là ước tính và phụ thuộc vào lượng thông tin có trong văn bản gốc.)*

2.  Ngôn ngữ tóm tắt: \${lang}
    - Toàn bộ bản tóm tắt sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh).

3.  Định dạng tóm tắt: \${format}
    - "paragraph": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy.
    - "heading": Tóm tắt nội dung chính bắt đầu bằng tiêu đề cấp 2 (##). Các điểm hoặc phần quan trọng hơn trong nội dung chính sử dụng tiêu đề cấp 3 (###)..
</Parameters>

<Output_Structure_And_Guidelines>
      **A. Cấu trúc tổng thể của phản hồi:**
      Phản hồi của bạn sẽ bao gồm hai phần chính, theo thứ tự:
      1.  **Phần 1: Bản Tóm Tắt Nội Dung**
          -   Tuân theo yêu cầu \${length} và \${format} từ <Parameters>.
      2.  **Phần 2: Nhận xét chung về nội dung tóm tắt**
          -   Luôn bắt đầu bằng một tiêu đề cấp 2, ví dụ: '## Nhận xét chung về nội dung tóm tắt' (hoặc tương đương trong ngôn ngữ \${lang}).
          -   Nội dung là một đoạn văn ngắn gọn đưa ra đánh giá tổng quan về thông tin trong bản tóm tắt dựa trên kiến thức của bạn.

      **B. Hướng dẫn chi tiết cho từng phần:**

      **1. Phần 1: Bản Tóm Tắt Nội Dung**
          - Đọc và Hiểu Sâu <Input_Content>.
          - Xác định các luận điểm/thông tin quan trọng nhất phù hợp với \${length}.
          - Trình bày một cách khách quan, súc tích, mạch lạc, bảo toàn ý nghĩa gốc.

      **2. Phần 2: Nhận xét chung về nội dung tóm tắt**
          - Sau khi đã tạo xong bản tóm tắt, hãy xem xét tổng thể nội dung thông tin đã được tóm tắt.
          - Dựa trên kiến thức của bạn (tính đến ngày cập nhật cuối cùng), đưa ra một nhận xét chung về tính chất của thông tin đó. Ví dụ:
              * Nó có phù hợp với hiểu biết chung/kiến thức phổ thông không?
              * Nó có vẻ là thông tin cập nhật hay có thể đã cũ?
              * Nó có chứa các quan điểm cụ thể hay thông tin mang tính khách quan rộng rãi?
          - **Bắt buộc có tuyên bố miễn trừ trách nhiệm ngắn gọn:** Mở đầu hoặc kết thúc nhận xét bằng một cụm từ như: "Dựa trên kiến thức của tôi đến [ngày cuối cùng cập nhật kiến thức của bạn], ..." hoặc "...tuy nhiên, người dùng nên đối chiếu với các nguồn chuyên sâu để có thông tin đầy đủ nhất."
          - **Ngôn ngữ cẩn trọng:** Tránh khẳng định tuyệt đối. Sử dụng các cụm từ như "có vẻ", "dường như", "nhìn chung", "theo hiểu biết của tôi".
          - **Tập trung vào NỘI DUNG của tóm tắt**, không phải chất lượng của việc bạn tóm tắt.
          - **Ngắn gọn:** Giữ cho nhận xét này thật súc tích.
          - **Trả lời bằng ngôn ngữ được chỉ định \${lang}.**

      **C. Nguyên tắc chung (áp dụng cho toàn bộ phản hồi):**
          - **Khách quan (trong tóm tắt):** Phần tóm tắt phải trung thực với văn bản gốc.
          - **Súc tích, Mạch lạc, Bảo toàn ý nghĩa.**
          - **Chính xác về Nghĩa:** Truyền tải đúng và đầy đủ ý nghĩa cốt lõi của bản tóm tắt gốc.
          - **Tự nhiên và Lưu Loát:** Sử dụng ngôn ngữ tự nhiên, trôi chảy, phù hợp với văn phong của người bản xứ nói tiếng \${lang}. Tránh dịch máy móc, từng từ một.
          - **Ngữ cảnh của Tóm tắt:** Hãy xem xét rằng đây là một bản tóm tắt nội dung, vì vậy cần sự cô đọng và dễ hiểu.
          - **Thuật ngữ (Nếu có):** Dịch chính xác các thuật ngữ quan trọng (nếu có trong văn bản) sang \${lang} một cách phù hợp niếu không biết chính xác hãy để trong ngoặc ().
          - **Tuân thủ định dạng Markdown** theo yêu cầu.

      **D. Ràng buộc nghiêm ngặt (áp dụng cho toàn bộ phản hồi):**
          - Không thêm bất kỳ lời chào, lời giới thiệu ban đầu, kết luận cá nhân (ngoài phần nhận xét chung theo hướng dẫn) hoặc bất kỳ văn bản nào khác ngoài cấu trúc yêu cầu.
          - Không hiển thị thông tin về cài đặt (như \${length}, \${lang}, \${format}) trong kết quả đầu ra.
          - Toàn bộ phản hồi phải nhất quán về ngôn ngữ theo \${lang}.
    </Output_Structure_And_Guidelines>

<Input_Content>
"""
\${text}
"""
</Input_Content>`
