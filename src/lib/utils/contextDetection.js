// @ts-nocheck

/**
 * Detects the current execution context
 * @returns {object} Context information
 */
export function getExecutionContext() {
  // Check if we're in a content script context
  const isContentScript = (() => {
    try {
      // Content scripts have access to the DOM but limited extension APIs
      return (
        typeof document !== 'undefined' &&
        typeof window !== 'undefined' &&
        typeof chrome !== 'undefined' &&
        // Content scripts can't access chrome.storage directly (need to use runtime.sendMessage)
        !chrome.storage?.local &&
        // Content scripts have a different context from background/popup
        window.location.protocol.startsWith('http')
      )
    } catch (error) {
      return false
    }
  })()

  // Check if we're in background script context
  const isBackground = (() => {
    try {
      return (
        typeof chrome !== 'undefined' &&
        typeof chrome.runtime !== 'undefined' &&
        typeof chrome.storage !== 'undefined' &&
        typeof document === 'undefined'
      )
    } catch (error) {
      return false
    }
  })()

  // Check if we're in popup/sidepanel context
  const isExtensionPage = (() => {
    try {
      return (
        typeof chrome !== 'undefined' &&
        typeof chrome.runtime !== 'undefined' &&
        typeof chrome.storage !== 'undefined' &&
        typeof document !== 'undefined' &&
        window.location.protocol === 'chrome-extension:'
      )
    } catch (error) {
      return false
    }
  })()

  return {
    isContentScript,
    isBackground,
    isExtensionPage,
    context: isContentScript
      ? 'content'
      : isBackground
      ? 'background'
      : isExtensionPage
      ? 'extension'
      : 'unknown',
  }
}

/**
 * Check if current context is content script
 * @returns {boolean}
 */
export function isContentScriptContext() {
  return getExecutionContext().isContentScript
}

/**
 * Check if current context supports direct API calls (background/extension pages)
 * @returns {boolean}
 */
export function supportsDirectApiCalls() {
  const context = getExecutionContext()
  return context.isBackground || context.isExtensionPage
}

/**
 * Check if current context requires proxy for Ollama API calls
 * @param {string} providerId - The AI provider ID
 * @returns {boolean}
 */
export function requiresApiProxy(providerId) {
  // Only Ollama in content script context requires proxy
  return providerId === 'ollama' && isContentScriptContext()
}
