// @ts-nocheck

/**
 * Generates a prompt for AI summarization
 * @param {string} transcript - The transcript to summarize
 * @param {string} summaryLang - The language for summary
 * @returns {string} The formatted prompt
 */
export function generateAISummaryPrompt(transcript, summaryLang) {
  return `<task>Please provide a clear and concise summary of the given <content> in ${summaryLang}.Start with one short main takeaway or overall conclusion. Then list key ideas, facts, or points found in the content - one sentence per idea.Be concise, neutral, and avoid filler or repetition.If no content is provided, politely ask the user what they would like summarized. End by identifying the most significant topic from the summary and ask a direct question inviting the user to learn more about it</task><content> ${transcript}</content>`
}
