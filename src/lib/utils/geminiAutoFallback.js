// @ts-nocheck
/**
 * Gemini Auto-Fallback Utility
 * Automatically switches to lighter Gemini models when overload is detected
 * Only applies to Gemini Basic mode
 */

/**
 * Fallback chain for Gemini Basic mode
 * Order: Best performance → Lighter → Lightest
 */
export const GEMINI_FALLBACK_CHAIN = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]

/**
 * Fixed fallback chain for Gemini Advanced mode
 * Used when auto-fallback is enabled, covers all free models
 */
export const GEMINI_ADVANCED_FALLBACK_CHAIN = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemma-3-27b-it',
]

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
 * Gets the next fallback model in the chain (for Basic mode)
 * @param {string} currentModel - Current model that failed
 * @returns {string|null} Next model to try, or null if no more fallbacks
 */
export function getNextFallbackModel(currentModel) {
  const currentIndex = GEMINI_FALLBACK_CHAIN.indexOf(currentModel)

  // If model not in chain or is last model, no fallback available
  if (
    currentIndex === -1 ||
    currentIndex === GEMINI_FALLBACK_CHAIN.length - 1
  ) {
    return null
  }

  return GEMINI_FALLBACK_CHAIN[currentIndex + 1]
}

/**
 * Gets the next fallback model for Advanced mode using fixed chain
 * Chain: gemini-3-flash-preview → gemini-2.5-flash → gemini-2.5-flash-lite → gemma-3-27b-it
 * @param {string} currentModel - Current model that failed
 * @param {object} settings - User settings (only used to check if fallback is enabled)
 * @returns {string|null} Next model to try, or null if no more fallbacks
 */
export function getNextAdvancedFallbackModel(currentModel, settings) {
  // Check if auto-fallback is enabled
  if (!settings?.geminiAdvancedEnableAutoFallback) {
    return null
  }

  const currentIndex = GEMINI_ADVANCED_FALLBACK_CHAIN.indexOf(currentModel)

  // If model not in chain or is last model, no fallback available
  if (
    currentIndex === -1 ||
    currentIndex === GEMINI_ADVANCED_FALLBACK_CHAIN.length - 1
  ) {
    return null
  }

  return GEMINI_ADVANCED_FALLBACK_CHAIN[currentIndex + 1]
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

  // For Advanced mode: check if auto-fallback toggle is enabled
  if (settings.isAdvancedMode) {
    return settings.geminiAdvancedEnableAutoFallback === true
  }

  // Basic mode always has auto-fallback enabled
  return true
}

/**
 * Gets the model name from settings
 * @param {object} settings - User settings
 * @returns {string} Current model name
 */
export function getCurrentGeminiModel(settings) {
  return settings.isAdvancedMode
    ? settings.selectedGeminiAdvancedModel || 'gemini-3-flash-preview'
    : settings.selectedGeminiModel || 'gemini-3-flash-preview'
}
