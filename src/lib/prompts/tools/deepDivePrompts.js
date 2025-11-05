// @ts-nocheck

/**
 * Deep Dive Question Generation Prompt
 * Generates 3 concise follow-up questions based on summary content
 */
export const deepDiveQuestionPrompt = {
  systemInstruction: `You are an expert at generating insightful follow-up questions based on content summaries.

  Generate exactly 3 follow-up questions that help readers explore deeper:

  QUESTION STRUCTURE:
  1. **Theoretical/Foundational** - Expand on core concepts, mechanisms, or principles
    - Explore underlying theory, how/why things work
    - Clarify fundamental concepts or relationships

  2. **Practical/Applied** - Connect to real-world use cases or concrete examples
    - Ask about specific applications or scenarios
    - Explore practical implications or implementations

  3. **Critical/Exploratory** - Challenge assumptions, explore alternatives, or new perspectives
    - Question limitations, trade-offs, or edge cases
    - Compare with alternatives or explore extensions
    - Open new angles not covered in the summary

  REQUIREMENTS:
  ✅ Concise and clear (max 20 words per question)
  ✅ Directly related to the summary content (reference specific details)
  ✅ Thought-provoking (encourage deeper exploration)
  ✅ Non-redundant (don't repeat what's already answered)
  ✅ Open-ended (avoid yes/no questions)
  ❌ No generic questions
  ❌ No explanations, just the questions`,

  userPrompt: `Based on the following summary, generate exactly 3 follow-up questions.

<SUMMARY>
__CONTENT__
</SUMMARY>

<OUTPUT_FORMAT>
Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{"questions": ["question 1 text here", "question 2 text here", "question 3 text here"]}

CRITICAL:
- Must be valid JSON with double quotes
- Each question should end with "?"
- Questions should be in __LANG__
- No explanations, no numbering in the text
- Follow the priority order: Deep Dive → Practical → Critical/Comparative/Clarification
</OUTPUT_FORMAT>`,
}

/**
 * Chat Prompt Builder
 * Builds the full prompt to send to chat providers
 */
export function buildChatPrompt(
  question,
  summaryContent,
  pageTitle,
  pageUrl,
  summaryLang = 'English'
) {
  return `<context>
    <source_document>
      <title>${pageTitle}</title>
      <url>${pageUrl}</url>
    </source_document>
    <summary>
      <![CDATA[
      ${summaryContent}
      ]]>
    </summary>
  </context>
  
  <task>
    <user_question>
      ${question}
    </user_question>
    
    <instructions>
      You are a subject-matter expert. Please answer the question (in <user_question>) based on the context (in <context>) in ${summaryLang}.
      The objective is to help the user **deepen their knowledge**. Please:

      1.  **Direct Answer:** Address the user's question directly.
      2.  **In-depth Explanation:** Clarify core terms and concepts. Don't just state "what," but explain the "why" and "how."
      3.  **Expand:** Provide related information, real-world examples, or historical/technical context (if appropriate) that the summary may have omitted.
      4.  **Reference Source:** Refer to the <url> to ensure accuracy and gather more details if needed.
    </instructions>
  </task>`
}

/**
 * Chat Provider URLs
 * URLs for each supported chat provider with ref parameter
 */
export const chatProviderUrls = {
  gemini: 'https://gemini.google.com/app?ref=summarizerrrr',
  chatgpt: 'https://chatgpt.com/?ref=summarizerrrr',
  perplexity: 'https://www.perplexity.ai/?ref=summarizerrrr',
  grok: 'https://grok.com/?ref=summarizerrrr',
}

/**
 * Chat Provider Display Names
 */
export const chatProviderNames = {
  gemini: 'Google Gemini',
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  grok: 'Grok',
}

/**
 * Get chat provider URL
 * @param {string} providerId - Provider ID
 * @returns {string} Provider URL
 */
export function getChatProviderUrl(providerId) {
  return chatProviderUrls[providerId] || chatProviderUrls.gemini
}

/**
 * Get chat provider name
 * @param {string} providerId - Provider ID
 * @returns {string} Provider display name
 */
export function getChatProviderName(providerId) {
  return chatProviderNames[providerId] || 'AI Chat'
}
