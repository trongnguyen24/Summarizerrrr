// @ts-nocheck

/**
 * Builds the prompt to send to AI provider for deep dive chat
 * @param {Object} params - Parameters for building the prompt
 * @param {string} params.summary - The summary of the content
 * @param {string} params.question - The user's question
 * @param {string} params.pageTitle - The title of the page
 * @param {string} params.pageUrl - The URL of the page
 * @param {string} params.originalContent - The original content (optional, for web articles)
 * @param {string} params.contentType - Type of content ('youtube', 'course', or 'web')
 * @returns {string} The formatted prompt for deep dive chat
 */
export function buildDeepDivePrompt({
  summary,
  question,
  pageTitle,
  pageUrl,
  originalContent = null,
  contentType = 'web',
}) {
  // Base context with summary
  let prompt = `I have a question about this content:\n\n`

  prompt += `**Title:** ${pageTitle}\n`
  prompt += `**Source:** ${pageUrl}\n\n`

  // For YouTube/Course videos: only include summary (transcript is too long)
  if (contentType === 'youtube' || contentType === 'course') {
    prompt += `**Summary:**\n${summary}\n\n`
  }
  // For web articles: include original content if available (truncated to 5000 chars)
  else if (contentType === 'web' && originalContent) {
    const truncatedContent =
      originalContent.length > 5000
        ? originalContent.substring(0, 5000) +
          '...\n[Content truncated for length]'
        : originalContent

    prompt += `**Original Content:**\n${truncatedContent}\n\n`
    prompt += `**Summary:**\n${summary}\n\n`
  }
  // Fallback: only summary
  else {
    prompt += `**Summary:**\n${summary}\n\n`
  }

  // Add the user's question
  prompt += `**My Question:**\n${question}\n\n`
  prompt += `Please provide a detailed and helpful answer to my question based on the content above.`

  return prompt
}
