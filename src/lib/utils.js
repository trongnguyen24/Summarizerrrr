export function buildPrompt(
  text,
  lang = 'vi',
  length = 'medium',
  format = 'heading',
  isYouTube = false
) {
  let promptTemplate = ''

  if (isYouTube) {
    promptTemplate = `

<USER_TASK>
Hãy phân tích <Transcript> được cung cấp và tạo bản tóm tắt theo các <Parameters> và <Guidelines> đã nêu.
</USER_TASK>

<Parameters>
1.  Độ dài tóm tắt: ${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 2 câu) về ý chính tổng thể của video.
    - "medium": Tóm tắt ngắn gọn (2-4 câu) bao gồm các điểm chính được thảo luận.
    - "long": Tóm tắt chi tiết (5+ câu hoặc nhiều đoạn) bao gồm tất cả các phần quan trọng, điểm hỗ trợ và kết luận. Hãy cố gắng bao quát đầy đủ các khía cạnh chính được đề cập một cách cô đọng.
    *(Lưu ý: Số câu chỉ là ước tính, mục tiêu là truyền đạt đầy đủ thông tin trong phạm vi độ dài mong muốn và dựa trên nội dung transcript.)*

2.  Ngôn ngữ: ${lang}
    - Tóm tắt sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh).

3.  Định dạng: ${format}
    - "plain": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy.
    - "heading": Tóm tắt được tổ chức với tiêu đề cấp độ h2 (##) cho chủ đề chính và tiêu đề cấp độ h3 (###) cho các phần/điểm quan trọng. Nội dung dưới mỗi tiêu đề phải phù hợp với độ dài yêu cầu (${length}) và làm nổi bật các "key points" của phần đó.
    *(Nếu yêu cầu định dạng không hợp lệ, hãy sử dụng định dạng "plain".)*
</Parameters>

<Guidelines>
- **Phân tích:** Đọc kỹ transcript để xác định chủ đề chính, các điểm quan trọng, ví dụ/minh họa hỗ trợ, và kết luận của video.
- **Tổ chức:** Tổ chức thông tin một cách logic và mạch lạc.
- **Định dạng (Conditional):** Nếu định dạng là "heading", tạo tiêu đề rõ ràng cho chủ đề chính (##) và các phần/điểm quan trọng (###).
- **Cô đọng:** Loại bỏ chi tiết không cần thiết, thông tin trùng lặp, các từ/câu nói thừa, và các đoạn chuyển không mang nội dung (ví dụ: "uhm", "à", "bạn biết đấy"). Chỉ giữ lại nội dung cốt lõi.
- **Khách quan & Chính xác:** Giữ giọng điệu khách quan và chính xác, chỉ dựa trên nội dung *từ* transcript. Không suy diễn hoặc thêm thông tin từ bên ngoài.
- **Nội dung Cụ Thể:** Nếu video chứa thuật ngữ chuyên ngành, số liệu thống kê, hoặc nghiên cứu, hãy bao gồm thông tin này một cách chính xác trong tóm tắt phù hợp với độ dài yêu cầu.
- **Quan điểm:** Nếu người nói chia sẻ quan điểm cá nhân hoặc ý kiến, nêu rõ đây là quan điểm *được trình bày trong video* (ví dụ: "Người nói cho rằng...", "Theo quan điểm được chia sẻ trong video...").
- **Các Bước/Hướng dẫn:** Nếu có phần thảo luận về các bước cụ thể hoặc hướng dẫn, tóm tắt các bước chính một cách ngắn gọn và rõ ràng (đặc biệt quan trọng cho độ dài "medium" và "long").
- **Độ dài & Chi tiết:** Đảm bảo mức độ chi tiết và số lượng nội dung trong tóm tắt tổng thể phù hợp với độ dài yêu cầu (${length}). Nếu dùng format "heading", nội dung dưới mỗi heading cũng cần tương xứng.
- **Xử lý Transcript Không Đủ Thông tin:** Nếu <Transcript> quá ngắn, không có nội dung liên quan hoặc quá nhiễu để tạo bản tóm tắt có nghĩa theo độ dài yêu cầu, hãy trả về bản tóm tắt ngắn nhất có thể (có thể chỉ 1-2 câu) về những gì có trong transcript hoặc thông báo (bằng ngôn ngữ yêu cầu ${lang}) rằng "Không đủ thông tin trong transcript để tạo tóm tắt chi tiết."
</Guidelines>

<Example Output format="heading" lang="vi" length="medium">
## Tóm tắt video Svelte 5:

### Giới thiệu về Svelte 5
Video giới thiệu Svelte 5 với thay đổi lớn là sự ra đời của Runes, cải thiện đáng kể cách quản lý trạng thái reactive trong ứng dụng Svelte so với các phiên bản trước.

### Các tính năng chính của Runes
Các Runes quan trọng được giới thiệu bao gồm $state để khai báo trạng thái reactive, $derived để tạo giá trị tính toán phụ thuộc vào trạng thái khác một cách tự động, và $effect để xử lý các side effects (như cập nhật DOM thủ công hoặc gọi API) khi trạng thái thay đổi. Đây là những khối xây dựng cốt lõi cho mô hình reactivity mới của Svelte 5.

### Lợi ích và Cải thiện Hiệu suất
Phiên bản Svelte 5 hứa hẹn mang lại những lợi ích đáng kể về hiệu suất ứng dụng nhờ kiến trúc reactivity được tối ưu, cùng với việc giảm kích thước bundle và cải thiện trải nghiệm phát triển, giúp xây dựng các ứng dụng web hiệu quả hơn.
</Example Output>

<Transcript>
${text}
</Transcript>`
  } else {
    promptTemplate = `<USER_TASK>
Hãy phân tích <Input_Content> được cung cấp (bao gồm nội dung chính và có thể có phần bình luận), và tạo bản tóm tắt dựa trên các <Parameters> và <Guidelines> dưới đây.
</USER_TASK>

<Parameters>
1.  Độ dài tóm tắt: ${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 1-2 câu) về ý chính tổng thể của nội dung chính. Nếu có bình luận, chỉ tóm tắt ý chính nhất của phần bình luận trong 1 câu riêng biệt.
    - "medium": Tóm tắt ngắn gọn (khoảng 3-5 câu) bao gồm các điểm chính của nội dung chính. Nếu có bình luận, tóm tắt các ý kiến/quan điểm chính từ bình luận trong khoảng 2-3 câu riêng biệt.
    - "long": Tóm tắt chi tiết bao gồm tất cả các phần quan trọng của nội dung chính, có thể chia thành các đoạn hoặc tiểu mục. Nếu có bình luận, tóm tắt chi tiết các ý kiến đa dạng và các điểm nổi bật trong phần bình luận, có thể chia thành các tiểu mục nhỏ.
    *(Lưu ý: Độ dài là ước tính và phụ thuộc vào lượng thông tin có trong nội dung gốc và bình luận.)*

2.  Ngôn ngữ tóm tắt: ${lang}
    - Toàn bộ bản tóm tắt (bao gồm tiêu đề và nội dung) sẽ được trả về hoàn toàn bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh).

3.  Định dạng tóm tắt: ${format}
    - "plain": Tóm tắt dưới dạng một hoặc nhiều đoạn văn thuần túy, liên tục (phần nội dung chính và phần bình luận nếu có sẽ là các đoạn riêng biệt được phân cách rõ ràng bằng một dòng trống hoặc tiêu đề đơn giản).
    - "heading": Tóm tắt nội dung chính bắt đầu bằng tiêu đề cấp 2 (##). Các điểm hoặc phần quan trọng hơn trong nội dung chính sử dụng tiêu đề cấp 3 (###). Nếu có bình luận, phần tóm tắt bình luận sẽ có tiêu đề cấp 2 riêng biệt "## Tóm tắt bình luận" (hoặc tương đương trong ngôn ngữ ${lang}), và các ý/điểm nổi bật trong bình luận có thể dùng tiêu đề cấp 3 (###) hoặc cấp 4 (####) nếu cần chi tiết.
    *(Nếu yêu cầu định dạng không hợp lệ, hãy sử dụng định dạng "plain".)*
</Parameters>

<Guidelines>
- **Phân tích Nội dung:** Đọc kỹ <Input_Content> để xác định nội dung chính (bài viết, bài đăng, v.v.) và phần bình luận (nếu có). Phân tách hai phần này trong quá trình xử lý.
- **Tóm tắt Nội dung Chính:**
    - Xác định chủ đề chính, các luận điểm quan trọng, bằng chứng/số liệu hỗ trợ, ví dụ, và kết luận của nội dung chính.
    - Tổ chức thông tin tóm tắt một cách logic và mạch lạc.
    - Giữ lại các số liệu, tên, ngày tháng, thuật ngữ quan trọng và kết luận chính có trong nội dung gốc. Sử dụng **in đậm** cho các thuật ngữ hoặc khái niệm quan trọng lần đầu xuất hiện trong tóm tắt nếu phù hợp.
    - Loại bỏ các chi tiết không cần thiết, thông tin lặp lại, và các câu/đoạn filler.
    - Đảm bảo bảo toàn ý nghĩa và ngữ cảnh của nội dung gốc.
    - Nếu nội dung gốc dài (>3000 từ được ước tính dựa trên <Input_Content>), đặc biệt khi ${length} là "long" hoặc "medium", hãy chia tóm tắt nội dung chính theo các chủ đề hoặc phần chính của nội dung gốc và sử dụng tiêu đề phù hợp (### hoặc #### nếu định dạng là "heading").
    - Nếu phát hiện thông tin mâu thuẫn hoặc các quan điểm khác nhau được trình bày trong nội dung gốc, hãy đề cập (một cách khách quan) các quan điểm đa dạng này trong tóm tắt.
    - Nếu chất lượng nội dung gốc hạn chế hoặc có nhiều thông tin nhiễu, tập trung vào việc trích xuất và tóm tắt những thông tin có giá trị và đáng tin cậy nhất có thể tìm thấy.
- **Tóm tắt Bình luận (Conditional):**
    - Nếu <Input_Content> bao gồm phần bình luận, phân tích kỹ lưỡng để xác định các ý kiến, quan điểm, câu hỏi, hoặc chủ đề thảo luận chính trong các bình luận.
    - Chú ý đến các bình luận nổi bật, được nhiều người ủng hộ hoặc phản hồi nhất.
    - Tạo phần tóm tắt riêng cho bình luận. Nếu định dạng là "heading", sử dụng tiêu đề "## Tóm tắt bình luận" (hoặc tương đương trong ngôn ngữ ${lang}).
    - Tóm tắt các ý kiến chính từ bình luận, không cần đi sâu vào từng bình luận riêng lẻ trừ khi có một bình luận cực kỳ nổi bật hoặc đại diện cho một quan điểm phổ biến. Mức độ chi tiết tuân theo ${length} yêu cầu cho phần bình luận.
- **Định dạng Bắt buộc:** Chỉ sử dụng định dạng Markdown được phép: ##, ###, ####, - (cho bullet points nếu cần cho các điểm chi tiết hoặc trong tóm tắt bình luận ở độ dài "long"), ** (cho in đậm).
- **Ràng buộc Đầu ra:**
    - Không thêm bất kỳ lời chào hỏi, giới thiệu, kết luận cá nhân, hoặc bất kỳ văn bản nào khác ngoài nội dung tóm tắt theo cấu trúc và định dạng yêu cầu.
    - Không hiện thông tin về các setting (như độ dài, ngôn ngữ, định dạng yêu cầu) trong đầu ra.
    - Chỉ sử dụng thông tin được cung cấp trong <Input_Content>. Không thêm kiến thức hoặc suy luận từ bên ngoài.
    - Toàn bộ đầu ra phải hoàn toàn bằng ngôn ngữ ${lang}.
</Guidelines>

<Example_Output_Format format="heading" lang="vi" length="medium">
## Tóm tắt bài viết: Cách hoạt động của WebAssembly

### Giới thiệu WebAssembly
Bài viết giới thiệu **WebAssembly (Wasm)** là một định dạng mã nhị phân cho máy ảo dựa trên stack, được thiết kế như một mục tiêu biên dịch portable cho ngôn ngữ bậc cao như C/C++, Rust, Go, cho phép chạy trên web với hiệu suất gần như native.

### Cấu trúc và Thực thi
Giải thích cấu trúc module Wasm bao gồm các hàm, bảng, bộ nhớ và tài nguyên toàn cục. Trình duyệt tải file .wasm, xác thực, biên dịch (JIT hoặc AOT) và thực thi trong môi trường sandbox, đảm bảo an toàn. Wasm tương tác với JavaScript thông qua WebAssembly JavaScript API để truy cập DOM và các Web API khác.

### Lợi ích chính
Các lợi ích nổi bật của Wasm bao gồm hiệu suất cao, an toàn nhờ sandbox, portable trên các nền tảng và trình duyệt khác nhau, và khả năng tái sử dụng code từ các ngôn ngữ hiện có.

## Tóm tắt bình luận
Phần bình luận thảo luận chủ yếu về tiềm năng của Wasm ngoài trình duyệt (ví dụ: server-side, edge computing) và so sánh hiệu suất thực tế với JavaScript trong các ứng dụng phức tạp. Một số bình luận bày tỏ sự hào hứng với việc sử dụng Rust kết hợp Wasm để phát triển ứng dụng web hiệu năng cao.
</Example_Output_Format>

<Input_Content>
${text}
</Input_Content>`
  }

  return promptTemplate
}

export function buildChapterPrompt(
  timestampedTranscript,
  lang = 'vi',
  length = 'medium'
) {
  const prompt = `
<USER_TASK>
Hãy phân tích <Transcript_Input> được cung cấp và tạo bản tóm tắt chi tiết theo từng chương/phần logic, kèm theo thời gian bắt đầu ước lượng cho mỗi phần. Sử dụng các <Parameters> và <Guidelines> sau để tạo ra kết quả cuối cùng.
</USER_TASK>

<Parameters>
1.  Ngôn ngữ tóm tắt: ${lang}
    - Tóm tắt hoàn chỉnh sẽ được trả về bằng ngôn ngữ được chỉ định (ví dụ: "vi" cho tiếng Việt, "en" cho tiếng Anh).

2.  Độ dài tóm tắt cho mỗi chương/phần: ${length}
    - "short": Tóm tắt rất ngắn gọn (tối đa 1-2 câu) về ý chính của chương/phần đó.
    - "medium": Tóm tắt ngắn gọn (2-4 câu) bao gồm các điểm chính của chương/phần.
    - "long": Tóm tắt chi tiết (từ 5 câu trở lên hoặc nhiều đoạn) bao gồm tất cả các phần quan trọng, luận điểm hỗ trợ và thông tin chi tiết có trong chương/phần đó.
    *(Lưu ý: Độ dài này áp dụng cho phần tóm tắt dưới tiêu đề mỗi chương và có thể linh hoạt tùy theo nội dung thực tế của chương.)*
</Parameters>

<Input_Format>
Định dạng của transcript sẽ là văn bản thô có kèm dấu thời gian ở đầu mỗi dòng hoặc đoạn văn bản. Ví dụ:
[00:05] Xin chào và quay trở lại với video hôm nay.
[00:10] Chúng ta sẽ nói về Svelte 5.
[00:15] Một trong những thay đổi lớn là sự ra đời của Runes.
...
</Input_Format>

<Guidelines>
- **Phân chia Chương:** Dựa vào các dấu thời gian, sự thay đổi chủ đề nội dung, hoặc các khoảng dừng đáng kể trong <Transcript_Input>, tự động xác định và phân chia transcript thành các chương hoặc phần logic.
- **Đặt Tên Chương:** Đặt tên ngắn gọn, súc tích và mô tả được nội dung chính của mỗi chương/phần đã xác định. Tên chương phải bằng ngôn ngữ ${lang}.
- **Xác định Thời Gian Bắt Đầu:** Thời gian bắt đầu của mỗi chương/phần sẽ là dấu thời gian sớm nhất được tìm thấy trong đoạn transcript tương ứng với chương/phần đó.
- **Cấu trúc Đầu ra:**
    1.  Bắt đầu đầu ra bằng tiêu đề chính: ## Tóm tắt video theo chương: (hoặc tiêu đề tương đương trong ngôn ngữ ${lang}).
    2.  Đối với *mỗi* chương/phần đã xác định, tạo một tiêu đề cấp 3 (###) theo định dạng: ### [Thời gian bắt đầu Ước lượng] - [Tên chương bạn đặt] (bằng ngôn ngữ <span class="math-inline">\{lang\}\)\.
3\.  Dưới tiêu đề cấp 3 của mỗi chương, tạo phần tóm tắt nội dung chính của chương đó, tuân thủ độ dài yêu cầu \(</span>{length}).
    4.  Nếu độ dài yêu cầu là "long" hoặc chương đó có nhiều điểm phức tạp, sử dụng tiêu đề cấp 4 (####) và danh sách gạch đầu dòng (-) để làm nổi bật các luận điểm hoặc chi tiết quan trọng bên trong phần tóm tắt của chapter đó.
    5.  Đảm bảo phần tóm tắt mỗi chương (và các tiểu mục nếu có) bao gồm các luận điểm chính, thuật ngữ quan trọng (in đậm **Term** bằng ngôn ngữ ${lang}) được đề cập trong chapter đó, và thông tin cốt lõi.
    6.  Kết thúc toàn bộ tóm tắt bằng một tiêu đề cấp 2 (##) ## Kết luận chung (hoặc tiêu đề tương đương trong ngôn ngữ ${lang}), tóm tắt thông điệp tổng thể hoặc ý chính xuyên suốt video.
- **Định dạng Bắt buộc:** Chỉ sử dụng định dạng Markdown sau: ##, ###, ####, - (cho bullet points), ** (cho in đậm).
- **Ràng buộc:**
    - Không thêm bất kỳ lời chào hỏi, giới thiệu, kết luận cá nhân, hoặc văn bản nào khác ngoài cấu trúc và nội dung yêu cầu.
    - Chỉ sử dụng thông tin và thuật ngữ có trong <Transcript_Input>. Không thêm kiến thức từ bên ngoài.
    - Nếu một chương/phần được xác định quá ngắn hoặc không có nội dung đáng kể, hãy tóm tắt nó một cách cô đọng nhất có thể (có thể chỉ 1 câu), không cố gắng đạt đủ độ dài yêu cầu cho chapter đó nếu không có đủ thông tin.
- **Ngôn ngữ:** Toàn bộ đầu ra (bao gồm tiêu đề, tên chương, nội dung tóm tắt, kết luận) phải hoàn toàn bằng ngôn ngữ ${lang}.
</Guidelines>

<Example_Output_Format>
## Tóm tắt video theo chương:

### 0:00 - Giới thiệu Svelte 5 và Runes
Video mở đầu giới thiệu Svelte 5 là một bản cập nhật lớn, nhấn mạnh sự ra đời của một khái niệm mới gọi là **Runes** sẽ thay đổi cách làm việc với reactivity.

### 0:45 - Tìm hiểu sâu về Runes
#### $state Rune
Giải thích cách sử dụng $state để khai báo trạng thái reactive. Đây là cách cơ bản nhất để làm cho dữ liệu thay đổi được theo dõi bởi Svelte.
#### $derived Rune
Mô tả $derived dùng để tạo ra các giá trị phụ thuộc vào trạng thái khác. Khi trạng thái gốc thay đổi, giá trị $derived sẽ tự động cập nhật lại.
#### $effect Rune
Trình bày $effect cho phép thực hiện các hành động phụ (side effects) như cập nhật DOM thủ công hoặc gọi API khi một trạng thái reactive thay đổi.

### 5:10 - Lợi ích về Hiệu suất và Cú pháp
Svelte 5 được kỳ vọng mang lại **cải thiện đáng kể về hiệu suất** runtime và tối ưu kích thước bundle. Cú pháp với Runes được giới thiệu là trực quan và dễ hiểu hơn.

## Kết luận chung
Svelte 5 với mô hình reactivity dựa trên Runes là một bước tiến lớn, hứa hẹn việc phát triển ứng dụng web hiệu quả và đơn giản hơn với hiệu suất cao hơn.
</Example_Output_Format>

<Transcript_Input>
${timestampedTranscript}
</Transcript_Input>
`
  return prompt
}
