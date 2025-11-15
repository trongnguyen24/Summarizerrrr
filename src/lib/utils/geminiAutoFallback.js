// @ts-nocheck
/**
 * Gemini Auto-Fallback Utility
 * Automatically switches to lighter Gemini models when overload is detected
 * Only applies to Gemini Basic mode
 */

/**
 * Fallback chain for Gemini models
 * Order: Best performance → Lighter → Lightest
 */
export const GEMINI_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-2.0-flash',
]

/**
 * Checks if an error is due to API overload/resource exhaustion
 * @param {Error|any} error - Error object to check
 * @returns {boolean} True if error is overload-related
 */
export function isOverloadError(error) {
  if (!error) return false

  const errorMessage = error?.message?.toLowerCase() || ''
  const errorString = error?.toString()?.toLowerCase() || ''

  // Check for common overload indicators
  const overloadKeywords = [
    'resource_exhausted',
    'resource exhausted',
    'overloaded',
    'too many requests',
    'rate limit',
    'quota',
    '429',
    '503',
    'service unavailable',
  ]

  // Check error message
  const hasOverloadKeyword = overloadKeywords.some(
    (keyword) => errorMessage.includes(keyword) || errorString.includes(keyword)
  )

  // Check HTTP status codes
  const status = error?.status || error?.statusCode || error?.code
  const isOverloadStatus = status === 429 || status === 503 || status === 'RESOURCE_EXHAUSTED'

  return hasOverloadKeyword || isOverloadStatus
}

/**
 * Gets the next fallback model in the chain
 * @param {string} currentModel - Current model that failed
 * @returns {string|null} Next model to try, or null if no more fallbacks
 */
export function getNextFallbackModel(currentModel) {
  const currentIndex = GEMINI_FALLBACK_CHAIN.indexOf(currentModel)

  // If model not in chain or is last model, no fallback available
  if (currentIndex === -1 || currentIndex === GEMINI_FALLBACK_CHAIN.length - 1) {
    return null
  }

  return GEMINI_FALLBACK_CHAIN[currentIndex + 1]
}

/**
 * Checks if auto-fallback should be enabled for current settings
 * Only enable for Gemini Basic mode (not Advanced)
 * @param {string} providerId - Provider ID
 * @param {object} settings - User settings
 * @returns {boolean} True if auto-fallback should be enabled
 */
export function shouldEnableAutoFallback(providerId, settings) {
  // Only for Gemini provider
  if (providerId !== 'gemini') {
    return false
  }

  // Only for Basic mode (not Advanced)
  if (settings.isAdvancedMode) {
    return false
  }

  return true
}

/**
 * Gets the model name from settings
 * @param {object} settings - User settings
 * @returns {string} Current model name
 */
export function getCurrentGeminiModel(settings) {
  return settings.isAdvancedMode
    ? settings.selectedGeminiAdvancedModel || 'gemini-2.0-flash'
    : settings.selectedGeminiModel || 'gemini-2.0-flash'
}
