// @ts-nocheck

/**
 * Detects if the current code is running inside a content script.
 * This is determined by checking the protocol of the window.location.
 * Content scripts run in the context of a web page (http/https),
 * while extension pages (popup, sidepanel, background) run under a specific extension protocol.
 *
 * @returns {boolean} True if in a content script, false otherwise.
 */
export function isContentScriptContext() {
  try {
    // Check if window and window.location are available
    if (typeof window === 'undefined' || !window.location) {
      return false
    }

    const protocol = window.location.protocol
    // Content scripts will have 'http:' or 'https:' protocols.
    // Extension pages will have 'chrome-extension:' or 'moz-extension:'.
    return protocol.startsWith('http')
  } catch (error) {
    // In some contexts (like a sandboxed iframe), accessing window.location might fail.
    // In such cases, it's safer to assume it's not a standard content script context
    // where our proxy logic is needed.
    return false
  }
}

/**
 * Determines if the current context requires API calls for a specific provider
 * to be routed through the background script proxy.
 *
 * @param {string} providerId - The ID of the AI provider (e.g., 'ollama').
 * @returns {boolean} True if the proxy is required, false otherwise.
 */
export function requiresApiProxy(providerId) {
  // Currently, only 'ollama' provider requires a proxy, and only when called from a content script.
  return providerId === 'ollama' && isContentScriptContext()
}
