// @ts-nocheck
import { settings } from '../stores/settingsStore.svelte.js'
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
      let systemInstruction = promptBuilders.youtube.systemInstruction
      let userPrompt = youTubePromptTemplate

      if (settings.isSummaryAdvancedMode && settings.youtubePromptSelection) {
        systemInstruction = settings.youtubeCustomSystemInstructionContent || ''
        userPrompt = settings.youtubeCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  general: {
    systemInstruction:
      'Bạn là một chuyên gia phân tích và tóm tắt nội dung trang web một cách chính xác, súc tích và hiệu quả. Nhiệm vụ của bạn là xử lý văn bản được cung cấp, phân tích nội dung chính và các phần liên quan (như bình luận), sau đó tạo ra bản tóm tắt có cấu trúc theo các tham số và hướng dẫn chi tiết từ người dùng. Bạn phải tuân thủ nghiêm ngặt các quy tắc định dạng và ràng buộc đầu ra.',
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = promptBuilders.general.systemInstruction
      let userPrompt = generalPromptTemplate

      if (settings.isSummaryAdvancedMode && settings.webPromptSelection) {
        systemInstruction = settings.webCustomSystemInstructionContent || ''
        userPrompt = settings.webCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  chapter: {
    systemInstruction:
      'Bạn là một trợ lý chuyên nghiệp trong việc phân tích và tóm tắt transcript video YouTube có kèm dấu thời gian. Nhiệm vụ của bạn là chia transcript thành các chương hoặc phần logic dựa trên nội dung và thời gian, sau đó tạo bản tóm tắt chi tiết cho từng phần theo yêu cầu của người dùng. Bạn phải tuân thủ nghiêm ngặt cấu trúc và định dạng đầu ra được chỉ định.',
    buildPrompt: (timestampedTranscript, lang, length, tone) => {
      let systemInstruction = promptBuilders.chapter.systemInstruction
      let userPrompt = chapterPromptTemplate

      if (settings.isSummaryAdvancedMode && settings.chapterPromptSelection) {
        systemInstruction = settings.chapterCustomSystemInstructionContent || ''
        userPrompt = settings.chapterCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LANG__/g, lang)
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, timestampedTranscript)
      return { systemInstruction, userPrompt }
    },
  },
  selectedText: {
    systemInstruction: `Bạn là một công cụ AI được tích hợp vào trình duyệt, chuyên trách về việc phân tích và tóm tắt nội dung văn bản do người dùng lựa chọn. Mục tiêu của bạn là cung cấp bản tóm tắt chính xác, súc tích và phù hợp với các tùy chỉnh của người dùng.`,
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = promptBuilders.selectedText.systemInstruction
      let userPrompt = selectedTextPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.selectedTextPromptSelection
      ) {
        systemInstruction =
          settings.selectedTextCustomSystemInstructionContent || ''
        userPrompt = settings.selectedTextCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  udemySummary: {
    systemInstruction:
      'Bạn là một trợ lý chuyên phân tích và tóm tắt bài giảng Udemy dựa trên transcript được cung cấp. Nhiệm vụ của bạn là tạo bản tóm tắt súc tích, chính xác và có cấu trúc, tuân thủ nghiêm ngặt các tham số và hướng dẫn dưới đây. Chỉ sử dụng thông tin có trong <Transcript> được cung cấp.',
    buildPrompt: (text, lang, length, format, tone) => {
      let systemInstruction = promptBuilders.udemySummary.systemInstruction
      let userPrompt = udemySummaryPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.udemySummaryPromptSelection
      ) {
        systemInstruction =
          settings.udemySummaryCustomSystemInstructionContent || ''
        userPrompt = settings.udemySummaryCustomPromptContent || ''
      } else {
        const lengthDescription = parameterDefinitions.length[length]
        const lengthNote = parameterDefinitions.length.note
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LENGTH_DESCRIPTION__/g, lengthDescription)
          .replace(/__LENGTH_NOTE__/g, lengthNote)
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
  udemyConcepts: {
    systemInstruction:
      'Mục tiêu của tôi là hiểu sâu hơn về các khái niệm chuyên ngành được đề cập trong một khoá học trực tuyến. Bạn cần sử dụng kiến thức rộng lớn của mình để cung cấp những giải thích chi tiết, chuyên sâu và dễ hiểu về các thuật ngữ này',
    buildPrompt: (text, lang, format, tone) => {
      let systemInstruction = promptBuilders.udemyConcepts.systemInstruction
      let userPrompt = udemyConceptsPromptTemplate

      if (
        settings.isSummaryAdvancedMode &&
        settings.udemyConceptsPromptSelection
      ) {
        systemInstruction =
          settings.udemyConceptsCustomSystemInstructionContent || ''
        userPrompt = settings.udemyConceptsCustomPromptContent || ''
      } else {
        const formatDescription = parameterDefinitions.format[format]
        const toneDescription = parameterDefinitions.tone[tone]
        userPrompt = userPrompt
          .replace(/__LANG__/g, lang)
          .replace(/__FORMAT_DESCRIPTION__/g, formatDescription)
          .replace(/__TONE_DESCRIPTION__/g, toneDescription)
      }

      userPrompt = userPrompt.replace(/__CONTENT__/g, text)
      return { systemInstruction, userPrompt }
    },
  },
}
