import { youTubePromptTemplate } from '../prompts/youTubePromptTemplate'
import { generalPromptTemplate } from '../prompts/generalPromptTemplate'
import { chapterPromptTemplate } from '../prompts/chapterPromptTemplate'

export const gemini20ProConfig = {
  youTubeSystemInstruction:
    'Bạn là một trợ lý chuyên phân tích và tóm tắt video YouTube dựa trên transcript được cung cấp. Nhiệm vụ của bạn là tạo bản tóm tắt súc tích, chính xác và có cấu trúc, tuân thủ nghiêm ngặt các tham số và hướng dẫn dưới đây. Chỉ sử dụng thông tin có trong <Transcript> được cung cấp.',
  generalSystemInstruction:
    'Bạn là một chuyên gia phân tích và tóm tắt nội dung trang web một cách chính xác, súc tích và hiệu quả. Nhiệm vụ của bạn là xử lý văn bản được cung cấp, phân tích nội dung chính và các phần liên quan (như bình luận), sau đó tạo ra bản tóm tắt có cấu trúc theo các tham số và hướng dẫn chi tiết từ người dùng. Bạn phải tuân thủ nghiêm ngặt các quy tắc định dạng và ràng buộc đầu ra.',
  chapterSystemInstruction:
    'Bạn là một trợ lý chuyên nghiệp trong việc phân tích và tóm tắt transcript video YouTube có kèm dấu thời gian. Nhiệm vụ của bạn là chia transcript thành các chương hoặc phần logic dựa trên nội dung và thời gian, sau đó tạo bản tóm tắt chi tiết cho từng phần theo yêu cầu của người dùng. Bạn phải tuân thủ nghiêm ngặt cấu trúc và định dạng đầu ra được chỉ định.',
  buildYouTubePrompt: (text, lang, length, format) => {
    const template = youTubePromptTemplate
    return template
      .replace(/\${length}/g, length)
      .replace(/\${lang}/g, lang)
      .replace(/\${format}/g, format)
      .replace(/\${text}/g, text)
  },
  buildGeneralPrompt: (text, lang, length, format) => {
    const template = generalPromptTemplate
    return template
      .replace(/\${length}/g, length)
      .replace(/\${lang}/g, lang)
      .replace(/\${format}/g, format)
      .replace(/\${text}/g, text)
  },
  buildChapterPrompt: (timestampedTranscript, lang, length) => {
    const template = chapterPromptTemplate
    return template
      .replace(/\${lang}/g, lang)
      .replace(/\${length}/g, length)
      .replace(/\${timestampedTranscript}/g, timestampedTranscript)
  },
  generationConfig: {
    maxOutputTokens: 32768,
    temperature: 0.3,
  },
}
