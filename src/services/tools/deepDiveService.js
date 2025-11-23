// @ts-nocheck
import { browser } from 'wxt/browser'
import {
  getToolAIModel,
  resolveToolProvider,
  buildModelSettings,
} from './toolProviderService.js'
import { generateContent } from '@/lib/api/aiSdkAdapter.js'
import {
  deepDiveQuestionPrompt,
  deepDiveRegeneratePrompt,
  buildChatPrompt,
  buildOpenEndedChatPrompt,
  getChatProviderUrl,
  buildHistorySection,
} from '@/lib/prompts/tools/deepDive.js'
import { settings } from '@/stores/settingsStore.svelte.js'

/**
 * Generates follow-up questions based on summary content
 * @param {string} summaryContent - The summary text
 * @param {string} pageTitle - The page title
 * @param {string} pageUrl - The page URL
 * @param {string} summaryLang - Summary language for questions
 * @param {Array<Array<string>>} questionHistory - Previous question generations
 * @param {boolean} isRegenerate - Whether this is a regeneration request
 * @returns {Promise<Array<string>>} Array of 3 questions
 */
export async function generateFollowUpQuestions(
  summaryContent,
  pageTitle,
  pageUrl,
  summaryLang = 'English',
  questionHistory = [],
  isRegenerate = false
) {
  console.log('[deepDiveService] Generating follow-up questions...')
  console.log('[deepDiveService] History size:', questionHistory.length)
  console.log('[deepDiveService] Is regenerate:', isRegenerate)

  try {
    // Validate input
    if (!summaryContent || summaryContent.trim() === '') {
      throw new Error('Summary content is required')
    }

    // Check if tool is enabled and has valid provider
    const toolConfig = settings.tools?.deepDive
    if (!toolConfig?.enabled) {
      throw new Error(
        'Deep Dive tool is disabled. Please enable it in Settings > Tools.'
      )
    }

    // Get provider config và build full settings
    const providerConfig = resolveToolProvider('deepDive')

    console.log(
      `[deepDiveService] Using provider: ${providerConfig.provider}, model: ${providerConfig.model}`
    )

    // Build history section dynamically
    const historySection = buildHistorySection(questionHistory)

    // Choose appropriate prompt based on context
    // Use regenerate prompt when regenerating and has history
    const promptTemplate =
      isRegenerate && questionHistory.length > 0
        ? deepDiveRegeneratePrompt
        : deepDiveQuestionPrompt

    console.log(
      `[deepDiveService] Using prompt: ${
        isRegenerate ? 'regenerate (flexible)' : 'initial (structured)'
      }`
    )

    // Build prompt với source URL and history
    const systemInstruction = promptTemplate.systemInstruction
    const userPrompt = promptTemplate.userPrompt
      .replace('__CONTENT__', summaryContent)
      .replace('__LANG__', summaryLang)
      .replace('__URL__', pageUrl || 'N/A')
      .replace('__HISTORY_SECTION__', historySection)

    // ✅ Build full settings object từ providerConfig
    const toolSettings = buildModelSettings(providerConfig, settings)

    // Attempt 1: Try with standard prompt
    let response = await generateContent(
      providerConfig.provider,
      toolSettings,
      systemInstruction,
      userPrompt
    )

    console.log('[deepDiveService] Raw AI response (attempt 1):', response)

    // Parse questions from response
    let questions = parseQuestionsFromResponse(response)

    // Retry logic: If parsing failed, try once more with corrected prompt
    if (questions.length === 0) {
      console.log(
        '[deepDiveService] First attempt failed, retrying with corrected prompt...'
      )

      // Add correction instructions to system prompt
      const correctedSystemInstruction =
        systemInstruction +
        `\n\nIMPORTANT: The previous response had JSON formatting errors. Please ensure:
1. Use SINGLE QUOTES (') for any quoted terms within question text, NOT double quotes (")
2. Ensure the JSON is valid and can be parsed by JSON.parse()
3. Double-check that all double quotes are properly used only for JSON keys and string delimiters`

      // Retry with corrected prompt
      try {
        response = await generateContent(
          providerConfig.provider,
          toolSettings,
          correctedSystemInstruction,
          userPrompt
        )

        console.log(
          '[deepDiveService] Raw AI response (attempt 2 - corrected):',
          response
        )
        questions = parseQuestionsFromResponse(response)
      } catch (retryError) {
        console.error('[deepDiveService] Retry attempt failed:', retryError)
        // Continue with empty questions array to trigger final error
      }
    }

    if (questions.length === 0) {
      throw new Error(
        'No questions generated after multiple attempts. Please try again.'
      )
    }

    console.log(
      `[deepDiveService] Generated ${questions.length} questions:`,
      questions
    )

    return questions
  } catch (error) {
    console.error('[deepDiveService] Error generating questions:', error)

    // Provide user-friendly error messages
    if (error.message.includes('API key')) {
      throw new Error(
        'API key is missing or invalid. Please check your settings.'
      )
    } else if (error.message.includes('disabled')) {
      throw error // Re-throw tool disabled error as-is
    } else {
      throw new Error(
        `Failed to generate questions: ${error.message || 'Unknown error'}`
      )
    }
  }
}

/**
 * Sanitizes JSON string by escaping unescaped quotes in values
 * @param {string} str - Potentially broken JSON string
 * @returns {string} Sanitized JSON string
 */
function sanitizeJsonString(str) {
  // Strategy: Extract the questions array content and rebuild JSON
  try {
    // Find the questions array content between [ and ]
    const arrayMatch = str.match(/"questions"\s*:\s*\[([\s\S]*?)\](?:\s*\})?/)
    if (!arrayMatch) return str

    const arrayContent = arrayMatch[1]

    // Extract individual question strings with regex
    // This handles both properly quoted and improperly quoted strings
    const questions = []
    const questionRegex = /"([^"]*(?:"[^"]*"[^"]*)*?)"\s*(?:,|\])/g

    let match
    while ((match = questionRegex.exec(arrayContent)) !== null) {
      questions.push(match[1])
    }

    // If we found questions, rebuild the JSON
    if (questions.length > 0) {
      // Escape any remaining unescaped quotes in the questions
      const sanitizedQuestions = questions.map(
        (q) =>
          q
            .replace(/\\"/g, "'") // Replace escaped quotes with single quotes
            .replace(/(?<!\\)"/g, "'") // Replace unescaped quotes with single quotes
      )

      return JSON.stringify({ questions: sanitizedQuestions })
    }
  } catch (e) {
    console.log('[deepDiveService] Sanitization failed:', e.message)
  }

  return str
}

/**
 * Extracts questions from broken JSON using regex
 * @param {string} response - Raw response that might contain broken JSON
 * @returns {Array<string>} Array of extracted questions
 */
function extractQuestionsFromBrokenJson(response) {
  const questions = []

  // Try to find quoted strings that look like questions
  // Pattern: "text ending with ?" or text between quotes in questions array
  const patterns = [
    // Pattern 1: "text...?" with various quote styles
    /"([^"]{10,}?\?+)"/g,
    // Pattern 2: Text between quotes that looks like a question
    /"([^"]{10,})/g,
  ]

  for (const pattern of patterns) {
    const matches = [...response.matchAll(pattern)]
    for (const match of matches) {
      let question = match[1].trim()

      // Skip if it's likely not a question
      if (
        question.includes('{') ||
        question.includes('}') ||
        question === 'questions' ||
        question.length < 10
      ) {
        continue
      }

      // Clean up the question
      question = question
        .replace(/^\d+\.\s*/, '') // Remove numbering
        .replace(/\\"/g, "'") // Replace escaped quotes
        .trim()

      // Add question mark if missing
      if (!question.endsWith('?') && !question.endsWith('？')) {
        question += '?'
      }

      // Avoid duplicates
      if (!questions.includes(question)) {
        questions.push(question)
      }

      if (questions.length >= 3) {
        return questions.slice(0, 3)
      }
    }

    if (questions.length > 0) break
  }

  return questions
}

/**
 * Parses questions from AI response with robust error handling
 * Supports JSON format with multiple fallback strategies
 * @param {string} response - Raw AI response
 * @returns {Array<string>} Array of questions
 */
function parseQuestionsFromResponse(response) {
  if (!response || typeof response !== 'string') {
    return []
  }

  console.log(
    '[deepDiveService] Raw response:',
    response.substring(0, 200) + '...'
  )

  // Step 1: Clean up markdown code blocks
  let cleanedResponse = response.trim()
  if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()
  }

  // Step 2: Try to find JSON object in response
  const jsonMatch = cleanedResponse.match(
    /\{[^}]*"questions"[^}]*\[[\s\S]*?\][\s\S]*?\}/
  )
  if (jsonMatch) {
    cleanedResponse = jsonMatch[0]
  }

  // Step 3: Try standard JSON parsing
  try {
    const parsed = JSON.parse(cleanedResponse)

    if (parsed.questions && Array.isArray(parsed.questions)) {
      const validQuestions = parsed.questions
        .filter((q) => typeof q === 'string' && q.trim().length > 0)
        .slice(0, 3)
        .map((q) => {
          let cleaned = q.trim()
          if (!cleaned.endsWith('?') && !cleaned.endsWith('？')) {
            cleaned += '?'
          }
          return cleaned
        })

      if (validQuestions.length > 0) {
        console.log(
          '[deepDiveService] ✅ Parsed JSON successfully:',
          validQuestions
        )
        return validQuestions
      }
    }
  } catch (jsonError) {
    console.log(
      '[deepDiveService] Standard JSON parsing failed:',
      jsonError.message
    )

    // Step 4: Try sanitizing and re-parsing
    try {
      const sanitized = sanitizeJsonString(cleanedResponse)
      const parsed = JSON.parse(sanitized)

      if (parsed.questions && Array.isArray(parsed.questions)) {
        const validQuestions = parsed.questions
          .filter((q) => typeof q === 'string' && q.trim().length > 0)
          .slice(0, 3)
          .map((q) => {
            let cleaned = q.trim()
            if (!cleaned.endsWith('?') && !cleaned.endsWith('？')) {
              cleaned += '?'
            }
            return cleaned
          })

        if (validQuestions.length > 0) {
          console.log(
            '[deepDiveService] ✅ Parsed sanitized JSON:',
            validQuestions
          )
          return validQuestions
        }
      }
    } catch (sanitizeError) {
      console.log(
        '[deepDiveService] Sanitized JSON parsing also failed:',
        sanitizeError.message
      )
    }

    // Step 5: Try extracting from broken JSON with regex
    console.log(
      '[deepDiveService] Attempting regex extraction from broken JSON'
    )
    const extractedQuestions = extractQuestionsFromBrokenJson(response)
    if (extractedQuestions.length > 0) {
      console.log(
        '[deepDiveService] ✅ Extracted from broken JSON:',
        extractedQuestions
      )
      return extractedQuestions
    }
  }

  // Step 6: Final fallback - plain text parsing
  console.log('[deepDiveService] Using plain text parser as final fallback')
  const lines = response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const questions = []

  for (const line of lines) {
    // Skip obvious JSON structure lines
    if (
      line === '{' ||
      line === '}' ||
      line === '[' ||
      line === ']' ||
      line.includes('"questions"') ||
      line.includes('```')
    ) {
      continue
    }

    // Remove JSON remnants and numbering
    let cleaned = line
      .replace(/^"/, '') // Remove leading quote
      .replace(/"[,\s]*$/, '') // Remove trailing quote and comma
      .replace(/^\d+\.\s*/, '') // Remove "1. ", "2. ", etc.
      .replace(/^[-*]\s*/, '') // Remove "- " or "* "
      .replace(/\\"/g, "'") // Replace escaped quotes
      .trim()

    // Skip if line is too short
    if (cleaned.length < 10) {
      continue
    }

    // Add question mark if missing
    if (!cleaned.endsWith('?') && !cleaned.endsWith('？')) {
      cleaned += '?'
    }

    questions.push(cleaned)

    if (questions.length >= 3) {
      break
    }
  }

  if (questions.length > 0) {
    console.log('[deepDiveService] ✅ Extracted from plain text:', questions)
  }

  return questions
}

/**
 * Opens a new tab with chat provider and fills the form with question + context
 * @param {string} question - The question to ask (empty string for open-ended)
 * @param {string} summaryContent - Summary content for context
 * @param {string} pageTitle - Page title
 * @param {string} pageUrl - Page URL
 * @param {string} summaryLang - Language for the answer
 * @param {string} chatProvider - Chat provider ID (gemini, chatgpt, perplexity, grok)
 * @returns {Promise<void>}
 */
export async function openDeepDiveChat(
  question,
  summaryContent,
  pageTitle,
  pageUrl,
  summaryLang = 'English',
  chatProvider = 'gemini'
) {
  console.log(
    `[deepDiveService] Opening ${chatProvider} chat with question:`,
    question || '[open-ended]'
  )

  try {
    // Build full prompt - use open-ended if no question provided
    const fullPrompt =
      question && question.trim() !== ''
        ? buildChatPrompt(
            question,
            summaryContent,
            pageTitle,
            pageUrl,
            summaryLang
          )
        : buildOpenEndedChatPrompt(
            summaryContent,
            pageTitle,
            pageUrl,
            summaryLang
          )

    // Get provider URL
    const providerUrl = getChatProviderUrl(chatProvider)

    console.log(`[deepDiveService] Opening URL: ${providerUrl}`)

    // Send message to background script to open tab
    const response = await browser.runtime.sendMessage({
      type: 'OPEN_DEEP_DIVE_CHAT',
      provider: chatProvider,
      url: providerUrl,
      prompt: fullPrompt,
    })

    if (!response?.success) {
      throw new Error(response?.error || 'Failed to open chat')
    }

    console.log('[deepDiveService] Chat opened successfully')
  } catch (error) {
    console.error('[deepDiveService] Error opening chat:', error)
    throw new Error(`Failed to open chat: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Validates if Deep Dive is available and configured
 * @returns {Object} { available: boolean, reason: string }
 */
export function validateDeepDiveAvailability() {
  const toolConfig = settings.tools?.deepDive

  if (!toolConfig) {
    return {
      available: false,
      reason: 'Deep Dive tool not found in settings',
    }
  }

  if (!toolConfig.enabled) {
    return {
      available: false,
      reason: 'Deep Dive is disabled. Enable it in Settings > Tools.',
    }
  }

  // Check if provider is configured
  try {
    resolveToolProvider('deepDive')
    return {
      available: true,
      reason: '',
    }
  } catch (error) {
    return {
      available: false,
      reason: error.message,
    }
  }
}
