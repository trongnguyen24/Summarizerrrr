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
  buildChatPrompt,
  getChatProviderUrl,
} from '@/lib/prompts/tools/deepDivePrompts.js'
import { settings } from '@/stores/settingsStore.svelte.js'

/**
 * Generates follow-up questions based on summary content
 * @param {string} summaryContent - The summary text
 * @param {string} pageTitle - The page title
 * @param {string} pageUrl - The page URL
 * @param {string} summaryLang - Summary language for questions
 * @returns {Promise<Array<string>>} Array of 3 questions
 */
export async function generateFollowUpQuestions(
  summaryContent,
  pageTitle,
  pageUrl,
  summaryLang = 'English'
) {
  console.log('[deepDiveService] Generating follow-up questions...')

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

    // Build prompt với source URL
    const systemInstruction = deepDiveQuestionPrompt.systemInstruction
    const userPrompt = deepDiveQuestionPrompt.userPrompt
      .replace('__CONTENT__', summaryContent)
      .replace('__LANG__', summaryLang)
      .replace('__URL__', pageUrl || 'N/A')

    // ✅ Build full settings object từ providerConfig
    // buildModelSettings() đã được gọi trong getToolAIModel(),
    // nhưng generateContent() cần settings object, không phải model instance
    const toolSettings = buildModelSettings(providerConfig, settings)

    const response = await generateContent(
      providerConfig.provider,
      toolSettings,
      systemInstruction,
      userPrompt
    )

    console.log('[deepDiveService] Raw AI response:', response)

    // Parse questions from response
    const questions = parseQuestionsFromResponse(response)

    if (questions.length === 0) {
      throw new Error('No questions generated. Please try again.')
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
 * Parses questions from AI response
 * Supports JSON format with fallback to plain text parsing
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

  // Try JSON parsing first
  try {
    // Remove markdown code blocks if present
    let cleanedResponse = response.trim()
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim()
    }

    // Try to find JSON in response (may have extra text before/after)
    const jsonMatch = cleanedResponse.match(
      /\{[^}]*"questions"[^}]*\[[^\]]*\][^}]*\}/s
    )
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0]
    }

    const parsed = JSON.parse(cleanedResponse)

    // Validate JSON structure
    if (parsed.questions && Array.isArray(parsed.questions)) {
      const validQuestions = parsed.questions
        .filter((q) => typeof q === 'string' && q.trim().length > 0)
        .slice(0, 3) // Ensure max 3 questions
        .map((q) => {
          let cleaned = q.trim()
          // Add question mark if missing
          if (!cleaned.endsWith('?') && !cleaned.endsWith('？')) {
            cleaned += '?'
          }
          return cleaned
        })

      if (validQuestions.length > 0) {
        console.log('[deepDiveService] ✅ Parsed JSON format:', validQuestions)
        return validQuestions
      }
    }
  } catch (jsonError) {
    console.log(
      '[deepDiveService] JSON parsing failed, falling back to plain text:',
      jsonError.message
    )
  }

  // Fallback to plain text parsing (backward compatibility)
  console.log('[deepDiveService] Using plain text parser')
  const lines = response
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const questions = []

  for (const line of lines) {
    // Skip lines that look like JSON structure
    if (
      line.includes('{') ||
      line.includes('}') ||
      line.includes('"questions"') ||
      line.includes('[') ||
      line.includes(']')
    ) {
      continue
    }

    // Remove numbering (1., 2., 3., etc.) and clean up
    let cleaned = line
      .replace(/^\d+\.\s*/, '') // Remove "1. ", "2. ", etc.
      .replace(/^[-*]\s*/, '') // Remove "- " or "* "
      .trim()

    // Skip if line is too short or doesn't look like a question
    if (cleaned.length < 10) {
      continue
    }

    // Add question mark if missing
    if (!cleaned.endsWith('?') && !cleaned.endsWith('？')) {
      cleaned += '?'
    }

    questions.push(cleaned)

    // Stop after 3 questions
    if (questions.length >= 3) {
      break
    }
  }

  return questions
}

/**
 * Opens a new tab with chat provider and fills the form with question + context
 * @param {string} question - The question to ask
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
    question
  )

  try {
    // Validate input
    if (!question || question.trim() === '') {
      throw new Error('Question is required')
    }

    // Build full prompt với source URL và summaryLang
    const fullPrompt = buildChatPrompt(
      question,
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
