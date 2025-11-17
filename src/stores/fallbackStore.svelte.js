// @ts-nocheck
/**
 * Fallback Store - Tracks AI model fallback status
 * Used to show user when system is switching to lighter models due to overload
 */

export const fallbackState = $state({
  isActive: false, // Is fallback currently happening?
  fromModel: null, // Model that failed
  toModel: null, // Model we're falling back to
  reason: 'overload', // Reason for fallback: 'overload' | 'error'
  timestamp: null, // When fallback started
})

/**
 * Start a fallback operation
 * @param {string} fromModel - Model that failed
 * @param {string} toModel - Model we're trying next
 * @param {string} reason - Reason for fallback
 */
export function startFallback(fromModel, toModel, reason = 'overload') {
  fallbackState.isActive = true
  fallbackState.fromModel = fromModel
  fallbackState.toModel = toModel
  fallbackState.reason = reason
  fallbackState.timestamp = Date.now()

  console.log('[FallbackStore] Fallback started:', {
    fromModel,
    toModel,
    reason,
  })
}

/**
 * Clear fallback state (called after successful API call or final failure)
 */
export function clearFallback() {
  fallbackState.isActive = false
  fallbackState.fromModel = null
  fallbackState.toModel = null
  fallbackState.reason = 'overload'
  fallbackState.timestamp = null
}

/**
 * Get a user-friendly message about the fallback
 * @returns {string} Fallback message
 */
export function getFallbackMessage() {
  if (!fallbackState.isActive) return ''

  const { fromModel, toModel, reason } = fallbackState

  if (reason === 'overload') {
    return `Model ${fromModel} is overloaded. Trying ${toModel}...`
  }

  return `Switching from ${fromModel} to ${toModel}...`
}
