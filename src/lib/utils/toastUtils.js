/**
 * Dispatches a custom event to show a toast notification
 * @param {object} props - Props to pass to the toast component
 */
function dispatchToastEvent(props) {
  // Check if we're in a background script context
  const isBackgroundScript = typeof window === 'undefined' || !window.document
  
  if (isBackgroundScript) {
    // In background script: send message to all tabs
    if (typeof browser !== 'undefined' && browser.tabs) {
      browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
          browser.tabs.sendMessage(tab.id, {
            type: 'SHOW_TOAST',
            toast: props
          }).catch(() => {
            // Ignore errors for tabs without content scripts
          })
        })
      })
    }
  } else {
    // In content script: dispatch event normally
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
