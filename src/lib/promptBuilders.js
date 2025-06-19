// @ts-nocheck
import { youTubePromptTemplate } from './prompts/youTubePromptTemplate.js'
import { generalPromptTemplate } from './prompts/generalPromptTemplate.js'
import { chapterPromptTemplate } from './prompts/chapterPromptTemplate.js'
import { selectedTextPromptTemplate } from './prompts/selectedTextPromptTemplate.js'
import { udemySummaryPromptTemplate } from './prompts/udemySummaryPromptTemplate.js'
import { udemyConceptsPromptTemplate } from './prompts/udemyConceptsPromptTemplate.js'
import { parameterDefinitions } from './prompts/modules/parameterDefinitions.js'

export const promptBuilders = {
  youtube: {
    systemInstruction:
      'Bạn là một trợ lý chuyên phân tích và tóm tắt video YouTube dựa trên transcript được cung cấp. Nhiệm vụ của bạn là tạo bản tóm tắt súc tích, chính xác và có cấu trúc, tuân thủ nghiêm ngặt các tham số và hướng dẫn dưới đây. Chỉ sử dụng thông tin có trong <Transcript> được cung cấp.',
    buildPrompt: (text, lang, length, format, tone) => {
      let template = youTubePromptTemplate
      const lengthDescription = parameterDefinitions.length[length]
      const lengthNote = parameterDefinitions.length.note
      const formatDescription = parameterDefinitions.format[format]
      const toneDescription = parameterDefinitions.tone[tone]
      template = template
        .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
        .replace(/__LENGTH_NOTE__/g, lengthNote)
        .replace(/__LANG__/g, lang)
        .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
        .replace(/__TONE_DESCRIPTION__/g, toneDescription)
        .replace(/\${text}/g, text)
      console.log('YouTube Prompt:', template) // Di chuyển console.log lên trước return
      return template
    },
  },
  general: {
    systemInstruction:
      'Bạn là một chuyên gia phân tích và tóm tắt nội dung trang web một cách chính xác, súc tích và hiệu quả. Nhiệm vụ của bạn là xử lý văn bản được cung cấp, phân tích nội dung chính và các phần liên quan (như bình luận), sau đó tạo ra bản tóm tắt có cấu trúc theo các tham số và hướng dẫn chi tiết từ người dùng. Bạn phải tuân thủ nghiêm ngặt các quy tắc định dạng và ràng buộc đầu ra.',
    buildPrompt: (text, lang, length, format, tone) => {
      let template = generalPromptTemplate
      const lengthDescription = parameterDefinitions.length[length]
      const lengthNote = parameterDefinitions.length.note
      const formatDescription = parameterDefinitions.format[format]
      const toneDescription = parameterDefinitions.tone[tone]
      template = template
        .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
        .replace(/__LENGTH_NOTE__/g, lengthNote)
        .replace(/__LANG__/g, lang)
        .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
        .replace(/__TONE_DESCRIPTION__/g, toneDescription)
        .replace(/\${text}/g, text)
      console.log('General Prompt:', template) // Di chuyển console.log lên trước return
      return template
    },
  },
  chapter: {
    systemInstruction:
      'Bạn là một trợ lý chuyên nghiệp trong việc phân tích và tóm tắt transcript video YouTube có kèm dấu thời gian. Nhiệm vụ của bạn là chia transcript thành các chương hoặc phần logic dựa trên nội dung và thời gian, sau đó tạo bản tóm tắt chi tiết cho từng phần theo yêu cầu của người dùng. Bạn phải tuân thủ nghiêm ngặt cấu trúc và định dạng đầu ra được chỉ định.',
    buildPrompt: (timestampedTranscript, lang, length, tone) => {
      let template = chapterPromptTemplate // Thêm let để có thể gán lại
      const lengthDescription = parameterDefinitions.length[length]
      const lengthNote = parameterDefinitions.length.note
      const toneDescription = parameterDefinitions.tone[tone]
      template = template
        .replace(/__LANG__/g, lang)
        .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
        .replace(/__LENGTH_NOTE__/g, lengthNote)
        .replace(/__TONE_DESCRIPTION__/g, toneDescription)
        .replace(/\${timestampedTranscript}/g, timestampedTranscript)
      console.log('Chapter Prompt:', template) // Di chuyển console.log lên trước return
      return template
    },
  },
  selectedText: {
    systemInstruction: `Bạn là một công cụ AI được tích hợp vào trình duyệt, chuyên trách về việc phân tích và tóm tắt nội dung văn bản do người dùng lựa chọn. Mục tiêu của bạn là cung cấp bản tóm tắt chính xác, súc tích và phù hợp với các tùy chỉnh của người dùng.`,
    buildPrompt: (text, lang, length, format, tone) => {
      let template = selectedTextPromptTemplate // Thêm let để có thể gán lại
      const lengthDescription = parameterDefinitions.length[length]
      const lengthNote = parameterDefinitions.length.note
      const formatDescription = parameterDefinitions.format[format]
      const toneDescription = parameterDefinitions.tone[tone]
      template = template
        .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
        .replace(/__LENGTH_NOTE__/g, lengthNote)
        .replace(/__LANG__/g, lang)
        .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
        .replace(/__TONE_DESCRIPTION__/g, toneDescription)
        .replace(/\${text}/g, text)
      console.log('Selected Text Prompt:', template) // Di chuyển console.log lên trước return
      return template
    },
  },
  udemySummary: {
    systemInstruction:
      'Bạn là một trợ lý chuyên phân tích và tóm tắt bài giảng Udemy dựa trên transcript được cung cấp. Nhiệm vụ của bạn là tạo bản tóm tắt súc tích, chính xác và có cấu trúc, tuân thủ nghiêm ngặt các tham số và hướng dẫn dưới đây. Chỉ sử dụng thông tin có trong <Transcript> được cung cấp.',
    buildPrompt: (text, lang, length, format, tone) => {
      let template = udemySummaryPromptTemplate // Thêm let để có thể gán lại
      const lengthDescription = parameterDefinitions.length[length]
      const lengthNote = parameterDefinitions.length.note
      const formatDescription = parameterDefinitions.format[format]
      const toneDescription = parameterDefinitions.tone[tone]
      template = template
        .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
        .replace(/__LENGTH_NOTE__/g, lengthNote)
        .replace(/__LANG__/g, lang)
        .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
        .replace(/__TONE_DESCRIPTION__/g, toneDescription)
        .replace(/\${text}/g, text)
      console.log('Udemy Summary Prompt:', template) // Di chuyển console.log lên trước return
      return template
    },
  },
  udemyConcepts: {
    systemInstruction:
      'Mục tiêu của tôi là hiểu sâu hơn về các khái niệm chuyên ngành được đề cập trong một khoá học trực tuyến. Bạn cần sử dụng kiến thức rộng lớn của mình để cung cấp những giải thích chi tiết, chuyên sâu và dễ hiểu về các thuật ngữ này',
    buildPrompt: (text, lang, format, tone) => {
      let template = udemyConceptsPromptTemplate // Thêm let để có thể gán lại
      const formatDescription = parameterDefinitions.format[format]
      const toneDescription = parameterDefinitions.tone[tone]
      template = template
        .replace(/__LANG__/g, lang)
        .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
        .replace(/__TONE_DESCRIPTION__/g, toneDescription)
        .replace(/\${text}/g, text)
      console.log('Udemy Concepts Prompt:', template) // Di chuyển console.log lên trước return
      return template
    },
  },
}
