// @ts-nocheck

export function formatDate(isoString) {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * A simple sleep utility.
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * A higher-order function that adds retry logic with exponential backoff to an async function.
 * @param {Function} fn The async function to retry.
 * @param {number} maxRetries Maximum number of retries.
 * @param {number} initialDelay Initial delay in ms.
 * @returns {Function} A new function with retry logic.
 */
export function withRetry(fn, maxRetries = 3, initialDelay = 1000) {
  return async function (...args) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn(...args)
      } catch (error) {
        if (i === maxRetries - 1 || !error.canRetry) {
          throw error
        }
        const delay = initialDelay * Math.pow(2, i)
        console.warn(
          `[withRetry] Attempt ${i + 1} failed. Retrying in ${delay}ms...`,
          error.message
        )
        await sleep(delay)
      }
    }
  }
}

/**
 * Debounce function - delays execution until after wait milliseconds have elapsed
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, wait = 300) {
  let timeout
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}
