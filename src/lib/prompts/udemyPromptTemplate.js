// @ts-nocheck
export const udemySummaryPromptTemplate = `

<USER_TASK>
Hãy phân tích <Transcript> được cung cấp và tạo bản tóm tắt theo các <Parameters> và <Guidelines> đã nêu.
</USER_TASK>

<Parameters>
1.  Độ dài tóm tắt: \${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 2 câu) về ý chính tổng thể của bài giảng.
    - "medium": Tóm tắt ngắn gọn (2-4 câu) bao gồm các điểm chính được thảo luận.
    - "long": Tóm tắt chi tiết (5+ câu hoặc nhiều đoạn) bao gồm tất cả các phần quan trọng, điểm hỗ trợ và kết luận. Hãy cố gắng bao quát đầy đủ các khía cạnh chính được đề cập một cách cô đọng.
    *(Lưu ý: Số câu chỉ là ước tính, mục tiêu là truyền đạt đầy đủ thông tin trong phạm vi độ dài mong muốn và dựa trên nội dung transcript.)*

2.  Ngôn ngữ: \${lang}
    - Tóm tắt sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định với chất lượng dịch thuật cao nhất - chính xác, tự nhiên và lưu loát như người bản xứ, dịch các thuật ngữ chuyên ngành và tên riêng một cách chuẩn xác.

3.  Định dạng: \${format}
    - "plain": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy.
    - "heading": Tóm tắt được tổ chức với tiêu đề cấp độ h2 (##) cho chủ đề chính và tiêu đề cấp độ h3 (###) cho các phần/điểm quan trọng. Nội dung dưới mỗi tiêu đề phải phù hợp với độ dài yêu cầu (\${length}) và làm nổi bật các "key points" của phần đó.
</Parameters>

<Guidelines>
- **Phân tích:** Đọc kỹ transcript để xác định chủ đề chính, các điểm quan trọng, ví dụ/minh họa hỗ trợ, và kết luận của bài giảng.
- **Tổ chức:** Tổ chức thông tin một cách logic và mạch lạc.
- **Định dạng (Conditional):** Nếu định dạng là "heading", tạo tiêu đề rõ ràng cho chủ đề chính (##) và các phần/điểm quan trọng (###).
- **Cô đọng:** Loại bỏ chi tiết không cần thiết, thông tin trùng lặp, các từ/câu nói thừa, và các đoạn chuyển không mang nội dung (ví dụ: "uhm", "à", "bạn biết đấy"). Chỉ giữ lại nội dung cốt lõi.
- **Khách quan & Chính xác:** Giữ giọng điệu khách quan và chính xác, chỉ dựa trên nội dung *từ* transcript. Không suy diễn hoặc thêm thông tin từ bên ngoài.
- **Nội dung Cụ Thể:** Nếu bài giảng chứa thuật ngữ chuyên ngành, số liệu thống kê, hoặc nghiên cứu, hãy bao gồm thông tin này một cách chính xác trong tóm tắt phù hợp với độ dài yêu cầu.
- **Quan điểm:** Nếu người nói chia sẻ quan điểm cá nhân hoặc ý kiến, nêu rõ đây là quan điểm *được trình bày trong bài giảng* (ví dụ: "Người nói cho rằng...", "Theo quan điểm được chia sẻ trong bài giảng...").
- **Các Bước/Hướng dẫn:** Nếu có phần thảo luận về các bước cụ thể hoặc hướng dẫn, tóm tắt các bước chính một cách ngắn gọn và rõ ràng (đặc biệt quan trọng cho độ dài "medium" và "long").
- **Độ dài & Chi tiết:** Đảm bảo mức độ chi tiết và số lượng nội dung trong tóm tắt tổng thể phù hợp với độ dài yêu cầu (\${length}). Nếu dùng format "heading", nội dung dưới mỗi heading cũng cần tương xứng.
- **Xử lý Transcript Không Đủ Thông tin:** Nếu <Transcript> quá ngắn, không có nội dung liên quan hoặc quá nhiễu để tạo bản tóm tắt có nghĩa theo độ dài yêu cầu, hãy trả về bản tóm tắt ngắn nhất có thể (có thể chỉ 1-2 câu) về những gì có trong transcript hoặc thông báo (bằng ngôn ngữ yêu cầu \${lang}) rằng "Không đủ thông tin trong transcript để tạo tóm tắt chi tiết."
- **Ràng buộc:**
    - Không thêm bất kỳ lời chào, lời giới thiệu, kết luận cá nhân hoặc bất kỳ văn bản nào khác ngoài cấu trúc và định dạng bắt buộc của bản tóm tắt.
    - Không hiển thị thông tin về cài đặt (như độ dài, ngôn ngữ, định dạng yêu cầu) trong kết quả đầu ra.
    - Không sử dụng markdown block bao quanh đầu ra.
</Guidelines>

<Example Output format="heading" lang="vi" length="medium">
## Tóm tắt bài giảng về JavaScript Closures:

### Khái niệm Closure
Closure trong JavaScript là một hàm bên trong có thể truy cập các biến từ phạm vi bên ngoài của nó, ngay cả sau khi hàm bên ngoài đã kết thúc thực thi. Điều này cho phép hàm bên trong "ghi nhớ" môi trường mà nó được tạo ra.

### Cách hoạt động
Khi một hàm được định nghĩa bên trong một hàm khác, hàm bên trong tạo ra một closure. Closure này bao gồm hàm bên trong và môi trường từ vựng của hàm bên ngoài (tức là các biến và đối số của hàm bên ngoài).

### Ứng dụng thực tế
Closure rất hữu ích trong việc tạo ra các hàm riêng tư, quản lý trạng thái trong các module, và xây dựng các hàm factory. Chúng là một khái niệm mạnh mẽ trong JavaScript để tạo ra các cấu trúc dữ liệu linh hoạt và bảo mật.
</Example Output>

<Transcript>
\${text}
</Transcript>
`

export const udemyConceptsPromptTemplate = `

<USER_TASK>
Bạn là một trợ lý chuyên phân tích transcript của các bài giảng Udemy. Nhiệm vụ của bạn là xác định các thuật ngữ hoặc khái niệm kỹ thuật quan trọng được nhắc đến trong <Transcript> và cung cấp giải thích ngắn gọn, rõ ràng cho từng thuật ngữ đó.
</USER_TASK>

<Parameters>
1.  Ngôn ngữ giải thích: \${lang}
    - Các giải thích sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định với chất lượng dịch thuật cao nhất - chính xác, tự nhiên và lưu loát như người bản xứ, dịch các thuật ngữ chuyên ngành và tên riêng một cách chuẩn xác.

2.  Định dạng: \${format}
    - "plain": Danh sách các thuật ngữ và giải thích dưới dạng văn bản thuần túy.
    - "markdown": Danh sách các thuật ngữ và giải thích được định dạng bằng Markdown, với mỗi thuật ngữ là một tiêu đề cấp độ h3 (###) và giải thích là đoạn văn bản dưới đó.
</Parameters>

<Guidelines>
- **Xác định Thuật Ngữ:** Đọc kỹ transcript để xác định các thuật ngữ, khái niệm, từ viết tắt hoặc tên công nghệ quan trọng mà người học có thể cần được giải thích. Ưu tiên các thuật ngữ kỹ thuật hoặc chuyên ngành.
- **Giải thích Ngắn Gọn:** Cung cấp một giải thích súc tích (1-3 câu) cho mỗi thuật ngữ. Giải thích phải rõ ràng, dễ hiểu và chỉ dựa trên kiến thức chung hoặc thông tin có thể suy ra từ ngữ cảnh của transcript.
- **Không Suy Diễn:** Không thêm thông tin từ bên ngoài transcript trừ khi đó là kiến thức chung về thuật ngữ đó.
- **Định dạng:**
    - Nếu format là "plain", liệt kê mỗi thuật ngữ và giải thích trên một dòng mới, ví dụ: "Thuật ngữ: Giải thích."
    - Nếu format là "markdown", sử dụng tiêu đề cấp độ h3 (###) cho mỗi thuật ngữ và đoạn văn bản cho giải thích.
- **Số lượng:** Cố gắng xác định từ 5 đến 10 thuật ngữ quan trọng nhất. Nếu transcript quá ngắn hoặc không có đủ thuật ngữ, hãy liệt kê những gì có thể.
- **Xử lý Transcript Không Đủ Thông tin:** Nếu <Transcript> quá ngắn, không có nội dung liên quan hoặc quá nhiễu để xác định thuật ngữ, hãy trả về thông báo (bằng ngôn ngữ yêu cầu \${lang}) rằng "Không đủ thuật ngữ hoặc khái niệm trong transcript để giải thích."
- **Ràng buộc:**
    - Không thêm bất kỳ lời chào, lời giới thiệu, kết luận cá nhân hoặc bất kỳ văn bản nào khác ngoài cấu trúc và định dạng bắt buộc của đầu ra.
    - Không hiển thị thông tin về cài đặt (như ngôn ngữ, định dạng yêu cầu) trong kết quả đầu ra.
    - Không sử dụng markdown block bao quanh đầu ra.
</Guidelines>

<Example Output format="markdown" lang="vi">
### Closure
Closure trong JavaScript là một hàm bên trong có thể truy cập các biến từ phạm vi bên ngoài của nó, ngay cả sau khi hàm bên ngoài đã kết thúc thực thi. Điều này cho phép hàm bên trong "ghi nhớ" môi trường mà nó được tạo ra.

### Scope
Scope (phạm vi) trong lập trình xác định khả năng truy cập của các biến, hàm và đối tượng trong một phần cụ thể của chương trình. Có hai loại scope chính: global scope và local scope.

### Callback Function
Callback function là một hàm được truyền vào một hàm khác làm đối số, và sau đó được gọi lại (thực thi) bên trong hàm bên ngoài để hoàn thành một loại hành động nào đó.
</Example Output>

<Transcript>
\${text}
</Transcript>
`
