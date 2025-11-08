// @ts-nocheck

/**
 * Deep Dive Question Generation Prompt
 * Generates 3 concise follow-up questions based on summary content
 */
export const deepDiveQuestionPrompt = {
  systemInstruction: `You are an expert at generating **extremely concise** follow-up questions.

  **PRIMARY GOAL: BREVITY. Questions must be very short and direct.**

  Generate exactly 3 follow-up questions using this structure:

  QUESTION STRUCTURE (Keep answers brief):
  1. **Concept/Theory:** Ask "how" or "why" about a core principle.
  2. **Practical/Application:** Ask about a real-world use case or implementation.
  3. **Critical/Future:** Challenge an assumption, ask about limitations, or explore alternatives.

  REQUIREMENTS:
  ✅ **EXTREMELY CONCISE (max 15 words per question)**
  ✅ Directly related to the summary content
  ✅ Thought-provoking and open-ended (avoid yes/no)
  ✅ Non-redundant
  ❌ No generic questions
  ❌ No explanations, just the questions

  **TERMINOLOGY ANNOTATION (non-English only):**
  Format: "English Term (translation)" - annotate 1-3 CORE technical terms per question.
  
  ✅ Annotate: AI/ML techniques, novel algorithms, methodologies, acronyms (e.g., "RLHF (học tăng cường)")
  ❌ Skip: Common tech words (API, model, network), generic terms (architecture, performance)
  
  Examples: "Distillation (chưng cất) cải thiện accuracy?" | "Transfer Learning (học chuyển giao) vs Fine-tuning (tinh chỉnh)?"`,

  userPrompt: `Based on the following summary, generate exactly 3 follow-up questions.

<SUMMARY>
__CONTENT__
</SUMMARY>

<SOURCE_URL>
__URL__
</SOURCE_URL>

<OUTPUT_FORMAT>
Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{"questions": ["question 1 text here", "question 2 text here", "question 3 text here"]}

CRITICAL JSON FORMATTING RULES:
- Must be valid JSON with double quotes for keys and values
- Each question should end with "?"
- Questions should be in __LANG__
- **IMPORTANT**: If you need to use quotes in question text, use SINGLE QUOTES (') instead of double quotes (")
  ✅ CORRECT: "How does 'vibe coding' change development?"
  ❌ WRONG: "How does \"vibe coding\" change development?"
- No explanations, no numbering in the text
- No special characters that break JSON: avoid unescaped \, ", newlines in strings
- Follow the priority order: Deep Dive → Practical → Critical/Comparative/Clarification

**TERMINOLOGY ANNOTATION REMINDER:**
If __LANG__ ≠ "English": Annotate 1-3 CORE terms using "English (translation)" format.

EXAMPLE OUTPUT (English):
{"questions": ["How does X improve performance?", "What are practical uses?", "What limitations exist?"]}

EXAMPLE OUTPUT (Vietnamese):
{"questions": ["Distillation (chưng cất) hoạt động ra sao?", "Fine-tuning (tinh chỉnh) khác Distillation (chưng cất) ở đâu?", "RLHF áp dụng khi nào?"]}
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
  // Determine if terminology annotation is needed
  const needsAnnotation = summaryLang.toLowerCase() !== 'english'

  const annotationGuideline = needsAnnotation
    ? `
5. **TERMINOLOGY ANNOTATION:** Annotate CORE technical terms as "English Term (${summaryLang} translation)". Prioritize AI/ML techniques, algorithms, methodologies over common words. Example: "Constitutional AI (AI hiến pháp) uses RLHF (học tăng cường) for Training (huấn luyện)."`
    : ''

  return `<task>
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
${annotationGuideline}
</instructions>
</task>
<context>
<source_document><title>${pageTitle}</title><url>${pageUrl}</url></source_document>
<summary>
<![CDATA[
${summaryContent}
]]>
</summary>
</context>`
}

/**
 * Chat Provider URLs
 * URLs for each supported chat provider with ref parameter
 */
export const chatProviderUrls = {
  gemini: 'https://gemini.google.com/app?ref=summarizerrrr',
  chatgpt: 'https://chatgpt.com/?ref=summarizerrrr',
  perplexity: 'https://www.perplexity.ai/?ref=summarizerrrr',
  grok: 'https://grok.com/c?ref=summarizerrrr',
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
