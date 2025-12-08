/**
 * Dispatches a custom event to show a toast notification
 * @param {object} props - Props to pass to the toast component
 */
function dispatchToastEvent(props) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gemini-toast', {
        detail: props,
      })
    )
  }
}

/**
 * Shows a toast notification for blocking mode fallback
 */
export function showBlockingModeToast() {
  dispatchToastEvent({
    title: 'Steaming failed',
    message: 'Trying blocking mode...',
    icon: 'heroicons-outline:arrow-path',
  })
}

/**
 * Shows a toast notification for model fallback
 * @param {string} fromModel - The model that failed
 * @param {string} toModel - The model being switched to
 */
export function showModelFallbackToast(fromModel, toModel) {
  dispatchToastEvent({
    title: 'Server overload',
    message: 'Switching to lighter model',
    icon: 'heroicons-outline:bolt',
  })
}

/**
 * Shows a generic overload toast
 */
export function showOverloadToast() {
  dispatchToastEvent({
    title: 'Server overload',
    message: 'Retrying request...',
    icon: 'heroicons-outline:exclamation-triangle',
  })
}

/**
 * Shows a toast notification for API key rotation
 * @param {number} current - Current key index (1-based)
 * @param {number} total - Total number of keys
 */
export function showApiKeyRotationToast(current, total) {
  dispatchToastEvent({
    title: 'Rate limit reached',
    message: `Switched to API key ${current}/${total}`,
    icon: 'heroicons-outline:key',
  })
}
