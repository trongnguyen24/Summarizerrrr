// @ts-nocheck
/**
 * Builds a prompt for summarizing selected text.
 * @param {string} text - The selected text to summarize.
 * @param {string} lang - Desired language for the summary.
 * @param {string} length - Desired length for the summary ('short', 'medium', 'long').
 * @param {string} format - Desired format for the summary ('heading', 'paragraph').
 * @returns {string} - The generated prompt string.
 */
export function buildSelectedTextPrompt(text, lang, length, format) {
  let lengthInstruction = ''
  if (length === 'short') {
    lengthInstruction = 'Hãy tóm tắt ngắn gọn.'
  } else if (length === 'medium') {
    lengthInstruction = 'Hãy tóm tắt với độ dài vừa phải.'
  } else if (length === 'long') {
    lengthInstruction = 'Hãy tóm tắt chi tiết.'
  }

  let formatInstruction = ''
  if (format === 'heading') {
    formatInstruction =
      'Kết quả tóm tắt nên có các tiêu đề phụ (subheadings) nếu phù hợp.'
  } else if (format === 'paragraph') {
    formatInstruction = 'Kết quả tóm tắt nên ở dạng đoạn văn.'
  }

  return `Bạn là một trợ lý tóm tắt văn bản chuyên nghiệp.
Nhiệm vụ của bạn là tóm tắt văn bản sau đây.
${lengthInstruction} ${formatInstruction}
Kết quả tóm tắt phải bằng tiếng ${lang}.

Văn bản cần tóm tắt:
"""
${text}
"""

Kết quả tóm tắt:`
}

/**
 * System instruction for summarizing selected text.
 */
export const selectedTextSystemInstruction = `Bạn là một trợ lý tóm tắt văn bản chuyên nghiệp.
Nhiệm vụ của bạn là tóm tắt văn bản do người dùng cung cấp.
Hãy trả lời bằng tiếng Việt.`
