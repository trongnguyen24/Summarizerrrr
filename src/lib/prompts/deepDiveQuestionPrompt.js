// @ts-nocheck

/**
 * Generates a prompt for LLM to generate 3 follow-up questions from a summary
 * @param {string} summary - The summary content to generate questions from
 * @param {string} summaryLang - The language of the summary (e.g., 'English', 'Vietnamese')
 * @returns {string} The formatted prompt for question generation
 */
export function generateDeepDiveQuestionsPrompt(summary, summaryLang) {
  return `You are an expert at creating thought-provoking follow-up questions. Based on the summary below, generate exactly 3 insightful questions that would help someone dive deeper into the topic.

Requirements:
- Generate exactly 3 questions
- Questions should be in ${summaryLang}
- Each question should explore different aspects (e.g., practical application, deeper concepts, related topics)
- Questions should be specific and actionable
- Keep each question concise (one sentence)
- Return ONLY a JSON array of 3 strings, nothing else
- Format: ["Question 1?", "Question 2?", "Question 3?"]

Summary:
${summary}

Generate the 3 follow-up questions now:`
}
