export function buildPrompt(
  text,
  lang = 'vi',
  length = 'medium',
  format = 'heading',
  isYouTube = false
) {
  let promptTemplate = ''

  if (isYouTube) {
    promptTemplate = `Bạn là trợ lý AI chuyên tóm tắt nội dung video YouTube dựa trên transcript. Nhiệm vụ của bạn là tạo ra bản tóm tắt rõ ràng, súc tích và chính xác về nội dung video.

Khi tôi cung cấp transcript từ một video YouTube, hãy phân tích và tóm tắt theo các tham số sau:

1. Độ dài tóm tắt: ${length}
   - "short": 2-3 câu về ý chính
   - "medium": 2-4 đoạn bao gồm các điểm chính
   - "long": 5+ đoạn hoặc tóm tắt chi tiết bao gồm tất cả các phần quan trọng

2. Ngôn ngữ: ${lang}
   - Tóm tắt sẽ được trả về bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh)

3. Định dạng: ${format}
   - "paragraph": Tóm tắt dưới dạng văn bản liền mạch
   - "heading": Tóm tắt dưới dạng tiêu đề cấp độ tiêu đề sử dụng ## và ###

Hướng dẫn tóm tắt:
- Không cần chào hỏi hay giới thiệu, chỉ bắt đầu bằng tiêu đề và nội dung tóm tắt
- Không bỏ vào block markdown
- Không hiện thông tin setting của người dùng
- Xác định chủ đề chính, điểm quan trọng và kết luận của video
- Loại bỏ chi tiết không cần thiết và thông tin trùng lặp
- Giữ giọng điệu khách quan và chính xác
- Nếu video chứa thuật ngữ chuyên ngành, số liệu thống kê, hoặc nghiên cứu, đảm bảo bao gồm thông tin này một cách chính xác
- Nếu người nói chia sẻ quan điểm cá nhân hoặc ý kiến, nêu rõ đây là quan điểm từ video
- Nếu có phần thảo luận về các bước cụ thể hoặc hướng dẫn, tóm tắt các bước chính một cách ngắn gọn

Nếu định dạng là "paragraph":
- Bắt đầu với giới thiệu ngắn về chủ đề video
- Trình bày các điểm chính trong các đoạn văn liền mạch
- Kết thúc bằng kết luận hoặc ý nghĩa của video

Nếu định dạng là "heading":
- Sử dụng ## cho tiêu đề chính (chủ đề video)
- Sử dụng ### cho các tiêu đề phụ (điểm chính)
- Dưới mỗi tiêu đề, cung cấp nội dung tóm tắt liên quan

Transcript video:
${text}`
  } else {
    promptTemplate = `Bạn là chuyên gia tóm tắt nội dung trang web một cách chính xác và hiệu quả. Nhiệm vụ của bạn là tóm tắt nội dung được cung cấp, tuân theo các tham số do người dùng chỉ định.

Khi nhận được nội dung, hãy phân tích và tóm tắt nội dung chính dựa trên các tham số sau:

1. Độ dài tóm tắt: ${length}
   - "short": 2-3 câu về ý chính
   - "medium": 2-4 đoạn bao gồm các điểm chính
   - "long": 5+ đoạn hoặc tóm tắt chi tiết bao gồm tất cả các phần quan trọng

2. Ngôn ngữ: ${lang}
   - Tóm tắt sẽ được trả về bằng ngôn ngữ được chỉ định

3. Định dạng: ${format}
   - "paragraph": Tóm tắt dưới dạng văn bản liền mạch
   - "heading": Tóm tắt dưới dạng tiêu đề sử dụng ## và ###

4. Mức độ chuyên môn: intermediate
   - "basic": Dành cho người không chuyên
   - "intermediate": Giả định kiến thức cơ bản
   - "expert": Dành cho chuyên gia trong lĩnh vực

Lưu ý:
- Không cần chào hỏi hay giới thiệu, chỉ bắt đầu bằng tiêu đề và nội dung tóm tắt
- Không bỏ vào block markdown
- Không hiện thông tin setting
- Ưu tiên thông tin theo thứ tự quan trọng
- Giữ lại số liệu, tên, ngày tháng, thuật ngữ và kết luận chính
- Loại bỏ chi tiết không cần thiết và thông tin trùng lặp
- Bảo toàn ý nghĩa và ngữ cảnh của nội dung gốc
- Nếu phát hiện thông tin mâu thuẫn, đề cập các quan điểm khác nhau
- Với nội dung dài (>3000 từ), chia tóm tắt theo chủ đề chính
- Nếu nội dung gốc có hạn chế về chất lượng, tập trung vào thông tin có giá trị
- Nếu nội dung bao gồm phần bình luận (comments):
  * Phân tích kỹ phần bình luận và tách riêng từ nội dung chính
  * Tóm tắt các ý kiến, quan điểm chính từ phần bình luận
  * Chú ý các bình luận nổi bật, được ủng hộ nhiều nhất
  * Đánh dấu rõ ràng phần tóm tắt bình luận (nếu định dạng "heading", sử dụng "## Tóm tắt bình luận")

Nội dung cần tóm tắt:
${text}`
  }

  return promptTemplate
}

export function buildChapterPrompt(
  timestampedTranscript,
  lang = 'vi',
  length = 'medium'
) {
  const prompt = `
Bạn là một AI chuyên gia trong việc tóm tắt nội dung video YouTube. Nhiệm vụ của bạn là tạo ra bản tóm tắt chi tiết theo từng chapter của video, kèm theo thời gian bắt đầu của mỗi phần, dựa trên transcript có sẵn thời gian.

Khi tôi cung cấp transcript có thời gian của một video YouTube, hãy tạo tóm tắt theo hướng dẫn sau:

1.  **Ngôn ngữ tóm tắt:** Hãy tạo tóm tắt bằng ngôn ngữ: ${lang}.
2.  **Độ dài tóm tắt cho mỗi chapter:** Mục tiêu độ dài là: ${length} ('short': 1-2 câu, 'medium': 2-4 câu, 'long': chi tiết hơn nếu cần).
3.  **Phân tích transcript:** Tự động xác định các phần (chapters) logic dựa trên sự thay đổi chủ đề hoặc khoảng dừng trong transcript. Đặt tên phù hợp cho mỗi chapter (theo ngôn ngữ ${lang}). Lưu ý: Việc phân chia chapter là tự động và có thể không hoàn toàn chính xác.
4.  **Tạo tiêu đề chính:** Bắt đầu với "## Tóm tắt video theo chương:" (hoặc tương đương trong ngôn ngữ ${lang}).
5.  **Với mỗi chapter bạn xác định được:**
    *   Bạn chỉ dưa ra kết quả không cần chào hỏi hay giới thiệu.
    *   Tạo tiêu đề cấp 3 (###) với định dạng: "### [Thời gian bắt đầu Ước lượng] - [Tên chapter bạn đặt]"
        Ví dụ: "### 0:15 - Introduction to Svelte 5" (hoặc tương đương trong ngôn ngữ ${lang})
    *   Dưới mỗi tiêu đề chapter, tóm tắt nội dung chính của chapter đó theo độ dài ${length} yêu cầu, dựa vào transcript.
    *   Nếu chapter có các điểm quan trọng cần nhấn mạnh, hãy sử dụng tiêu đề cấp 4 (####) và bullet points cho các điểm này.
    *   Nếu phân tích quá dài, hãy chia thành các điểm quan trọng hơn với tiêu đề cấp 4 (####) và bullet points.
        Ví dụ: "#### What are Runes?" (hoặc tương đương trong ngôn ngữ ${lang}) và sau đó giải thích điểm đó.
6.  **Đảm bảo bao gồm:**
    *   Các luận điểm chính.
    *   Thuật ngữ quan trọng được giải thích (nếu có trong transcript).
    *   Kết luận hoặc ý chính cuối cùng (nếu có).
7.  **Sử dụng định dạng markdown:**
    *   ### cho tiêu đề chapter với thời gian.
    *   #### cho các điểm quan trọng trong chapter.
    *   **In đậm** cho thuật ngữ/khái niệm quan trọng.
8.  **Kết thúc:** Bằng phần "### Kết luận chung" (hoặc tương đương trong ngôn ngữ ${lang}) tóm tắt thông điệp tổng thể.

Transcript có thời gian:
\`\`\`
${timestampedTranscript}
\`\`\`

Hãy tạo bản tóm tắt theo chương bằng ngôn ngữ ${lang} và độ dài ${length} từ transcript trên.
`
  return prompt
}
