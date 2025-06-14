import { youTubePromptTemplate } from '../prompts/youTubePromptTemplate'
import { generalPromptTemplate } from '../prompts/generalPromptTemplate'
import { chapterPromptTemplate } from '../prompts/chapterPromptTemplate'
import { selectedTextPromptTemplate } from '../prompts/selectedTextPromptTemplate'

export const gemini25ProConfig = {
  youTubeSystemInstruction:
    'Bạn là một trợ lý chuyên phân tích và tóm tắt video YouTube dựa trên transcript được cung cấp. Nhiệm vụ của bạn là tạo bản tóm tắt súc tích, chính xác và có cấu trúc, tuân thủ nghiêm ngặt các tham số và hướng dẫn dưới đây. Chỉ sử dụng thông tin có trong <Transcript> được cung cấp.',
  generalSystemInstruction:
    'Bạn là một chuyên gia phân tích và tóm tắt nội dung trang web một cách chính xác, súc tích và hiệu quả. Nhiệm vụ của bạn là xử lý văn bản được cung cấp, phân tích nội dung chính và các phần liên quan (như bình luận), sau đó tạo ra bản tóm tắt có cấu trúc theo các tham số và hướng dẫn chi tiết từ người dùng. Bạn phải tuân thủ nghiêm ngặt các quy tắc định dạng và ràng buộc đầu ra.',
  chapterSystemInstruction:
    'Bạn là một trợ lý chuyên nghiệp trong việc phân tích và tóm tắt transcript video YouTube có kèm dấu thời gian. Nhiệm vụ của bạn là chia transcript thành các chương hoặc phần logic dựa trên nội dung và thời gian, sau đó tạo bản tóm tắt chi tiết cho từng phần theo yêu cầu của người dùng. Bạn phải tuân thủ nghiêm ngặt cấu trúc và định dạng đầu ra được chỉ định.',
  selectedTextSystemInstruction: `Bạn là một công cụ AI được tích hợp vào trình duyệt, chuyên trách về việc phân tích và tóm tắt nội dung văn bản do người dùng lựa chọn. Mục tiêu của bạn là cung cấp bản tóm tắt chính xác, súc tích và phù hợp với các tùy chỉnh của người dùng.`,
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
  buildSelectedTextPrompt: (text, lang, length, format) => {
    const template = selectedTextPromptTemplate
    return template
      .replace(/\${length}/g, length)
      .replace(/\${lang}/g, lang)
      .replace(/\${format}/g, format)
      .replace(/\${text}/g, text)
  },
  generationConfig: {
    maxOutputTokens: 65536,
    temperature: 0.3,
    topP: 0.9, // Default value, will be overridden by user settings
  },
}
