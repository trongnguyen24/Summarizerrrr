// @ts-nocheck
import { generateContent } from '@/lib/api/aiSdkAdapter.js'
import { settings } from '@/stores/settingsStore.svelte.js'
import { generateDeepDiveQuestionsPrompt } from '@/lib/prompts/deepDiveQuestionPrompt.js'
import { buildDeepDivePrompt } from '@/lib/prompts/deepDiveContentPrompt.js'
import { browser } from 'wxt/browser'

/**
 * Generates 3 follow-up questions from a summary using LLM
 * @param {string} summary - The summary content
 * @returns {Promise<string[] | null>} Array of 3 questions or null if generation fails
 */
export async function generateFollowUpQuestions(summary) {
  try {
    console.log('[deepDiveService] Generating follow-up questions...')

    // Get current provider settings
    const providerId = settings.selectedProvider || 'gemini'
    const summaryLang = settings.summaryLang || 'English'

    // Build prompt for question generation
    const prompt = generateDeepDiveQuestionsPrompt(summary, summaryLang)

    // Call LLM to generate questions
    const response = await generateContent(
      providerId,
      settings,
      'You are a helpful assistant that generates follow-up questions.',
      prompt
    )

    console.log('[deepDiveService] LLM response:', response)

    // Parse JSON response
    try {
      // Try to extract JSON array from response
      const jsonMatch = response.match(/\[.*\]/s)
      if (!jsonMatch) {
        throw new Error('No JSON array found in response')
      }

      const questions = JSON.parse(jsonMatch[0])

      // Validate: should be array of 3 strings
      if (!Array.isArray(questions) || questions.length !== 3) {
        throw new Error('Invalid questions format: expected array of 3 strings')
      }

      console.log('[deepDiveService] Generated questions:', questions)
      return questions
    } catch (parseError) {
      console.error('[deepDiveService] Failed to parse questions:', parseError)
      return null
    }
  } catch (error) {
    console.error('[deepDiveService] Error generating questions:', error)
    return null
  }
}

/**
 * Opens a new tab with AI provider and auto-fills the deep dive prompt
 * @param {Object} params - Parameters for deep dive chat
 * @param {string} params.provider - Provider ID ('gemini', 'chatgpt', 'perplexity', 'grok')
 * @param {string} params.question - The user's question
 * @param {string} params.summary - The summary content
 * @param {string} params.pageTitle - Page title
 * @param {string} params.pageUrl - Page URL
 * @param {string} params.originalContent - Original content (optional)
 * @param {string} params.contentType - Content type ('youtube', 'course', 'web')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function openDeepDiveChat({
  provider,
  question,
  summary,
  pageTitle,
  pageUrl,
  originalContent = null,
  contentType = 'web',
}) {
  try {
    console.log(`[deepDiveService] Opening ${provider} for deep dive...`)

    // Build the prompt to send to AI provider
    const prompt = buildDeepDivePrompt({
      summary,
      question,
      pageTitle,
      pageUrl,
      originalContent,
      contentType,
    })

    console.log('[deepDiveService] Prompt length:', prompt.length)

    // Map provider to message type
    const messageTypeMap = {
      gemini: 'DEEP_DIVE_ON_GEMINI',
      chatgpt: 'DEEP_DIVE_ON_CHATGPT',
      perplexity: 'DEEP_DIVE_ON_PERPLEXITY',
      grok: 'DEEP_DIVE_ON_GROK',
    }

    const messageType = messageTypeMap[provider]
    if (!messageType) {
      throw new Error(`Unsupported provider: ${provider}`)
    }

    // Send message to background script to open tab and fill form
    // Note: background script uses async IIFE with setTimeout,
    // so response might not have success flag immediately
    // We'll return success after sending the message
    console.log('[deepDiveService] Sending message to background:', messageType)

    browser.runtime
      .sendMessage({
        type: messageType,
        prompt: prompt,
      })
      .then((response) => {
        console.log('[deepDiveService] Background response:', response)
      })
      .catch((error) => {
        console.error('[deepDiveService] Background error:', error)
      })

    // Since background script opens tab asynchronously,
    // we consider it successful if message was sent
    console.log('[deepDiveService] Deep dive chat request sent successfully')
    return { success: true }
  } catch (error) {
    console.error('[deepDiveService] Error opening deep dive chat:', error)
    return {
      success: false,
      error: error.message || 'Unknown error',
    }
  }
}
