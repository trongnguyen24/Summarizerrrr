// @ts-nocheck

/**
 * Deep Dive Question Generation Prompt
 * Generates 3 concise follow-up questions based on summary content
 */
export const deepDiveQuestionPrompt = {
  systemInstruction: `You are an expert at generating insightful follow-up questions based on content summaries.

Your task is to create exactly 3 concise, thought-provoking questions that:
- Help readers explore the topic more deeply
- Address interesting aspects mentioned in the summary
- Are specific enough to guide meaningful discussion
- Are clear and direct (1 line each, no sub-questions)

QUESTION TYPES TO CONSIDER:
1. Clarification: "What exactly does [concept] mean in this context?"
2. Deep Dive: "How does [mechanism/process] actually work?"
3. Practical: "What are the real-world implications of [finding]?"
4. Comparative: "How does this compare to [alternative approach]?"
5. Critical: "What are the potential limitations of [conclusion]?"

STYLE GUIDELINES:
✅ Concise and direct (max 20 words per question)
✅ Specific to the content (reference actual details)
✅ Open-ended (encourage exploration)
✅ Natural language (conversational tone)
❌ No generic questions ("What do you think?")
❌ No yes/no questions
❌ No multiple questions in one line`,

  userPrompt: `Based on the following summary, generate exactly 3 follow-up questions.

<SUMMARY>
__CONTENT__
</SUMMARY>


<OUTPUT_FORMAT>
Return ONLY the 3 questions, one per line, numbered:
1. [Question about specific aspect from summary]
2. [Question exploring mechanism or process]
3. [Question about implications or applications]
</OUTPUT_FORMAT>

IMPORTANT:
- Each question must be on its own line
- No explanations, no preamble, just the questions
- Questions should be in __LANG__
- Reference specific details from the summary`,
}

/**
 * Chat Prompt Builder
 * Builds the full prompt to send to chat providers
 */
export function buildChatPrompt(question, summaryContent, pageTitle, pageUrl) {
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
      You are a subject-matter expert. Please answer the question (in <user_question>) based on the context (in <context>).
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
