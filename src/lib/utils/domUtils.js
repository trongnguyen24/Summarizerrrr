/**
 * Utility functions for DOM manipulation
 */

/**
 * Wait for an element to appear in the DOM
 * @param {string|string[]} selectors - CSS selector or array of selectors to check
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Maximum time to wait in milliseconds (default: 10000)
 * @param {boolean} options.checkDisabled - Whether to check if element is disabled (default: false)
 * @returns {Promise<Element|null>} Promise that resolves with the element or null if timeout
 */
export async function waitForElement(
  selectors,
  options = { timeout: 10000, checkDisabled: false }
) {
  const { timeout, checkDisabled } = options
  const selectorList = Array.isArray(selectors) ? selectors : [selectors]
  return new Promise((resolve) => {
    const startTime = Date.now()
    const check = () => {
      for (const selector of selectorList) {
        const element = document.querySelector(selector)
        if (element && element.offsetParent !== null) {
          if (checkDisabled && element.disabled) continue
          resolve(element)
          return
        }
      }
      if (Date.now() - startTime > timeout) {
        resolve(null)
        return
      }
      setTimeout(check, 100) // Poll every 100ms
    }
    check()
  })
}
