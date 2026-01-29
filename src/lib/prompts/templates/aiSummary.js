// @ts-nocheck

/**
 * Generates a prompt for AI summarization
 * @param {string} transcript - The transcript to summarize
 * @param {string} summaryLang - The language for summary
 * @param {string} sourceUrl - Optional URL of the source content
 * @returns {string} The formatted prompt
 */
export function generateAISummaryPrompt(transcript, summaryLang, sourceUrl = '') {
  const urlPart = sourceUrl ? `\n\nSource URL: ${sourceUrl}` : ''
  return `<task>Please provide a clear and concise summary of the given <content> in ${summaryLang}.${urlPart}

Instructions:
- Start with one short main takeaway or overall conclusion
- Then list key ideas, facts, or points found in the content - one sentence per idea and Include relevant timestamps link to video.
- Be concise, neutral, and avoid filler or repetition
- End with a question asking what specific topic from this content the user would like to explore further</task>
<content>${transcript}</content>`
}

/**
 * Generates a prompt for Gemini to summarize a YouTube video directly via URL
 * This is used when no transcript is available - Gemini can process YouTube videos directly
 * @param {string} youtubeUrl - The YouTube video URL
 * @param {string} summaryLang - The language for summary
 * @returns {string} The formatted prompt
 */
export function generateYouTubeAISummaryPrompt(youtubeUrl, summaryLang) {
  return `<task>Please watch and provide a clear and concise summary of the YouTube video in ${summaryLang}.

Video URL: ${youtubeUrl}

Instructions:
- Start with one short main takeaway or overall conclusion
- Then list key ideas, facts, or points found in the video - one sentence per idea and Include relevant timestamps link to video.
- Be concise, neutral, and avoid filler or repetition
- End with a question asking what specific topic from this content the user would like to explore further</task>`
}
