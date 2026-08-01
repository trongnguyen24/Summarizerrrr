// @ts-nocheck
/**
 * Gemini Auto-Fallback Utility
 * Automatically switches to lighter Gemini models when overload is detected
 * Only applies to Gemini Basic mode
 */

import { GEMINI_FREE_FALLBACK_CHAIN } from '@/lib/providers/geminiFreeTier.js'

/**
 * Fallback chain, derived from the Free-tier quota table in
 * `lib/providers/geminiFreeTier.js` — most daily quota first, so a model that
 * just answered 503/429 is followed by one with real headroom.
 * Add a new free model there and it lands here automatically.
 */
export const GEMINI_FALLBACK_CHAIN = GEMINI_FREE_FALLBACK_CHAIN

/** @deprecated Basic and Advanced modes now share one chain. */
export const GEMINI_ADVANCED_FALLBACK_CHAIN = GEMINI_FREE_FALLBACK_CHAIN

/**
 * Checks if an error is due to API overload/resource exhaustion
 * Enhanced to detect AI_RetryError and nested error structures
 * @param {Error|any} error - Error object to check
 * @returns {boolean} True if error is overload-related
 */
export function isOverloadError(error) {
  if (!error) return false

  // Get error message and cause from multiple levels
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorString = error?.toString()?.toLowerCase() || ''
  const errorCause = error?.cause?.message?.toLowerCase() || ''
  const errorCauseString = error?.cause?.toString?.()?.toLowerCase() || ''

  // AI_RetryError specific detection
  const isRetryError =
    error?.constructor?.name === 'AI_RetryError' ||
    error?.name === 'AI_RetryError' ||
    errorMessage.includes('failed after') ||
    errorMessage.includes('retry') ||
    errorString.includes('failed after') ||
    errorString.includes('retry')

  // Check for common overload indicators
  const overloadKeywords = [
    'overloaded',
    'rate limit',
    '503',
    'service unavailable',
    'model is overloaded',
    'the model is overloaded',
  ]

  // Check error message at all levels
  const hasOverloadKeyword = overloadKeywords.some(
    (keyword) =>
      errorMessage.includes(keyword) ||
      errorString.includes(keyword) ||
      errorCause.includes(keyword) ||
      errorCauseString.includes(keyword)
  )

  // Check HTTP status codes
  const status = error?.status || error?.statusCode || error?.code
  const causeStatus =
    error?.cause?.status || error?.cause?.statusCode || error?.cause?.code
  const isOverloadStatus =
    status === 503 ||
    causeStatus === 503

  // Return true if:
  // 1. It's a retry error AND contains overload keywords, OR
  // 2. It has overload status codes, OR
  // 3. It has overload keywords in any message level
  return (
    (isRetryError && hasOverloadKeyword) ||
    isOverloadStatus ||
    hasOverloadKeyword
  )
}

/**
 * Checks if an error is due to API quota exhaustion (429)
 * @param {Error|any} error - Error object to check
 * @returns {boolean} True if error is quota-related
 */
export function isQuotaError(error) {
  if (!error) return false

  // Get error message and cause from multiple levels
  const errorMessage = error?.message?.toLowerCase() || ''
  const errorString = error?.toString()?.toLowerCase() || ''
  const errorCause = error?.cause?.message?.toLowerCase() || ''
  const errorCauseString = error?.cause?.toString?.()?.toLowerCase() || ''

  const quotaKeywords = [
    'resource_exhausted',
    'resource exhausted',
    'quota',
    '429',
    'too many requests',
  ]

  // Check error message at all levels
  const hasQuotaKeyword = quotaKeywords.some(
    (keyword) =>
      errorMessage.includes(keyword) ||
      errorString.includes(keyword) ||
      errorCause.includes(keyword) ||
      errorCauseString.includes(keyword)
  )

  // Check HTTP status codes
  const status = error?.status || error?.statusCode || error?.code
  const causeStatus =
    error?.cause?.status || error?.cause?.statusCode || error?.cause?.code

  return (
    status === 429 ||
    causeStatus === 429 ||
    status === 'RESOURCE_EXHAUSTED' ||
    causeStatus === 'RESOURCE_EXHAUSTED' ||
    hasQuotaKeyword
  )
}

/**
 * Checks if an error means the model itself is gone — retired by Google, or
 * never callable with generateContent. The quota table here is a hand-kept
 * snapshot, so a chain entry can rot; treating 404 as a fallback signal lets
 * the chain step over a dead link instead of surfacing a confusing error about
 * a model the user never picked.
 * @param {Error|any} error - Error object to check
 * @returns {boolean} True if the model is unavailable
 */
export function isModelUnavailableError(error) {
  if (!error) return false

  const messages = [
    error?.message,
    error?.toString?.(),
    error?.cause?.message,
    error?.cause?.toString?.(),
  ]
    .filter((value) => typeof value === 'string')
    .map((value) => value.toLowerCase())

  const unavailableKeywords = [
    'not_found',
    'is not found',
    'not supported for generatecontent',
    'is not supported',
  ]
  const hasUnavailableKeyword = unavailableKeywords.some((keyword) =>
    messages.some((message) => message.includes(keyword))
  )

  const status = error?.status || error?.statusCode || error?.code
  const causeStatus =
    error?.cause?.status || error?.cause?.statusCode || error?.cause?.code

  return (
    status === 404 ||
    causeStatus === 404 ||
    status === 'NOT_FOUND' ||
    causeStatus === 'NOT_FOUND' ||
    hasUnavailableKeyword
  )
}

/**
 * Gets the next fallback model in the chain.
 * A model outside the chain (a paid one, an alias, or anything Google shipped
 * after this table was written) enters at the top instead of getting no
 * fallback at all — after that first hop the walk is in-chain, so it always
 * terminates.
 * @param {string} currentModel - Current model that failed
 * @returns {string|null} Next model to try, or null if no more fallbacks
 */
export function getNextFallbackModel(currentModel) {
  const currentIndex = GEMINI_FALLBACK_CHAIN.indexOf(currentModel)

  if (currentIndex === -1) {
    return GEMINI_FALLBACK_CHAIN[0] || null
  }

  // Last model in the chain — nothing lighter left to try.
  if (currentIndex === GEMINI_FALLBACK_CHAIN.length - 1) {
    return null
  }

  return GEMINI_FALLBACK_CHAIN[currentIndex + 1]
}

/**
 * Same chain, gated on the auto-fallback toggle.
 * @param {string} currentModel - Current model that failed
 * @param {object} settings - User settings (only used to check if fallback is enabled)
 * @returns {string|null} Next model to try, or null if no more fallbacks
 */
export function getNextAdvancedFallbackModel(currentModel, settings) {
  if (!settings?.geminiEnableAutoFallback) {
    return null
  }

  return getNextFallbackModel(currentModel)
}

/**
 * Checks if API key retry should be enabled
 * Enable for both Gemini Basic and Advanced modes
 * @param {string} providerId - Provider ID
 * @param {object} settings - User settings
 * @returns {boolean} True if API key retry should be enabled
 */
export function shouldEnableApiKeyRetry(providerId, settings) {
  // Only for Gemini provider
  if (providerId !== 'gemini') {
    return false
  }

  // Enable for both Basic and Advanced modes
  return true
}

/**
 * Checks if auto-fallback should be enabled for current settings
 * Enable for Gemini Basic mode (always) or Advanced mode (if backup models configured)
 * @param {string} providerId - Provider ID
 * @param {object} settings - User settings
 * @returns {boolean} True if auto-fallback should be enabled
 */
export function shouldEnableAutoFallback(providerId, settings) {
  // Only for Gemini provider
  if (providerId !== 'gemini') {
    return false
  }

  // Check if auto-fallback toggle is enabled
  return settings.geminiEnableAutoFallback === true
}

/**
 * Gets the model name from settings
 * @param {object} settings - User settings
 * @returns {string} Current model name
 */
export function getCurrentGeminiModel(settings) {
  return settings.selectedGeminiModel || 'gemini-3-flash-preview'
}
