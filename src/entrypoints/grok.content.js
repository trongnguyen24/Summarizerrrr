/**
 * Grok content script - Firefox-compatible approach using Selection API
 * Auto-adapts to Grok UI changes without affecting user clipboard
 */
import { waitForElement } from '../lib/utils/domUtils.js'

export default defineContentScript({
  matches: ['*://grok.com/*'],
  main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.grokListenerAdded) return
    window.grokListenerAdded = true

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('ref') !== 'summarizerrrr') return

    // Configuration
    const CONFIG = {
      selectors: {
        textarea: [
          // Semantic - Most stable
          'textarea[aria-label*="Grok" i]',
          'textarea[aria-label*="ask" i]',
          'textarea[placeholder*="ask" i]',
          // Functional
          'textarea[dir="auto"]',
          'textarea:not([disabled]):not([readonly])',
          // Structural
          'textarea.w-full',
          'div[contenteditable="true"]',
        ],
        submitButton: [
          // Prioritized
          'button[aria-label*="Submit" i]',
          'button[type="submit"]:not([disabled])',
          'button.group.flex.flex-col.justify-center.rounded-full[type="submit"]',
          'button[aria-label*="Send" i]',
          'button[aria-label*="Gửi" i]',
        ],
      },
      timing: {
        initialRetryInterval: 100, // Start fast
        maxRetryInterval: 1000, // Cap at 1s
        uiUpdateDelay: 200, // Back to fast UI updates
        totalTimeout: 120000, // Keep 2 minutes for Cloudflare
      },
    }

    /**
     * @param {object} message - The message object
     * @param {string} message.type - The type of message
     * @param {string} message.content - The content to fill in the form
     * @param {object} sender - The sender of the message
     * @param {function} sendResponse - The response callback function
     * @returns {boolean} - Returns true to keep the message channel open
     */
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'PING') {
        sendResponse({ ready: true })
        return true
      }

      if (message.type === 'FILL_GROK_FORM') {
        handleFillForm(message.content, sendResponse)
        return true
      }
    })

    /**
     * Handles filling the Grok form with content
     * @param {string} content - The content to fill in the form
     * @param {function} sendResponse - The response callback function
     * @returns {Promise<void>}
     */
    async function handleFillForm(content, sendResponse) {
      try {
        console.log('[GrokContentScript] Starting form fill...')

        // Step 1: Find textarea using multi-layer approach
        const textArea = await findTextAreaRobust()
        if (!textArea) {
          return handleFallback(content, sendResponse, 'Textarea not found')
        }

        console.log('[GrokContentScript] Textarea found')

        // Step 2: Fill content with robust event triggering
        const filled = await fillContentRobust(textArea, content)
        if (!filled) {
          return handleFallback(
            content,
            sendResponse,
            'Content validation failed'
          )
        }

        console.log('[GrokContentScript] Content filled and validated')

        // Step 3: Wait for UI update
        await wait(CONFIG.timing.uiUpdateDelay)

        // Step 4: Find and click submit button
        const submitted = await submitFormRobust()
        if (!submitted) {
          throw new Error('Submit button not found or remained disabled')
        }

        console.log('[GrokContentScript] Form submitted successfully')
        sendResponse({ success: true })
      } catch (error) {
        console.error('[GrokContentScript] Error:', error)
        sendResponse({ success: false, error: error.message })
      }
    }

    /**
     * Multi-layer textarea finder
     * @returns {Promise<HTMLTextAreaElement|null>}
     */
    async function findTextAreaRobust() {
      console.log('[GrokContentScript] Searching for textarea...')

      // Try all selectors with robust retry
      const element = await trySelectorsWithRetry(CONFIG.selectors.textarea, {
        timeout: CONFIG.timing.totalTimeout,
      })

      if (element) {
        console.log('[GrokContentScript] Found textarea')
        return element
      }

      // Universal fallback
      const fallback = findVisibleTextarea()
      if (fallback) {
        console.log(
          '[GrokContentScript] Found textarea via universal fallback'
        )
        return fallback
      }

      return null
    }

    /**
     * Fill content using Selection API for Firefox compatibility
     * @param {HTMLElement} element - Target element
     * @param {string} content - Content to fill
     * @returns {Promise<boolean>} Success status
     */
    async function fillContentRobust(element, content) {
      console.log(
        '[GrokContentScript] Filling content, length:',
        content.length
      )

      try {
        // Focus element first
        element.focus()
        await wait(50)

        // Clear existing content
        element.value = ''

        // Use Selection API with execCommand for Firefox compatibility
        const selection = window.getSelection()
        const range = document.createRange()

        range.selectNodeContents(element)
        selection.removeAllRanges()
        selection.addRange(range)

        // insertText works better on Firefox
        const inserted = document.execCommand('insertText', false, content)
        console.log(
          '[GrokContentScript] execCommand insertText result:',
          inserted
        )

        await wait(100)

        // Fallback: direct value set if execCommand failed
        if (!element.value || element.value.length === 0) {
          console.log('[GrokContentScript] Fallback to direct value set')
          element.value = content
        }

        // Dispatch comprehensive events
        element.dispatchEvent(
          new Event('input', { bubbles: true, composed: true })
        )
        element.dispatchEvent(new Event('change', { bubbles: true }))
        element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }))
        element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))

        // Wait for UI update
        await wait(CONFIG.timing.uiUpdateDelay)

        // Validation - check actual value
        const currentValue = element.value
        const success = currentValue === content || currentValue.length > 0

        console.log('[GrokContentScript] Validation:', {
          expected: content.length,
          actual: currentValue.length,
          success,
        })

        if (!success) {
          console.warn('[GrokContentScript] Content validation failed', {
            expectedFirst50: content.substring(0, 50),
            actualFirst50: currentValue.substring(0, 50),
          })
        }

        return success
      } catch (error) {
        console.error('[GrokContentScript] Fill error:', error)
        return false
      }
    }

    /**
     * Find and click submit button with retry
     * @returns {Promise<boolean>} Success status
     */
    async function submitFormRobust() {
      console.log('[GrokContentScript] Searching for submit button...')

      const button = await trySelectorsWithRetry(
        CONFIG.selectors.submitButton,
        {
          timeout: CONFIG.timing.totalTimeout,
          checkDisabled: true,
        }
      )

      if (!button) {
        console.error('[GrokContentScript] Submit button not found')
        return false
      }

      console.log('[GrokContentScript] Submit button found, clicking...')

      // Focus before click (some frameworks require this)
      button.focus()
      await wait(30) // Reduced from 50ms

      button.click()

      return true
    }

    /**
     * Try multiple selectors with retry logic
     * @param {string[]} selectors - Array of CSS selectors
     * @param {Object} options - Timeout and options
     * @returns {Promise<Element|null>}
     */
    async function trySelectorsWithRetry(selectors, options = {}) {
      const { timeout = 3000, checkDisabled = false } = options
      const startTime = Date.now()
      let currentInterval = CONFIG.timing.initialRetryInterval

      while (Date.now() - startTime < timeout) {
        // Check ALL selectors in this pass
        for (const selector of selectors) {
          const element = document.querySelector(selector)

          if (element && isElementVisible(element)) {
            if (checkDisabled && element.disabled) {
              continue
            }
            return element
          }
        }

        // Wait before next pass
        await wait(currentInterval)
        
        // Exponential backoff for interval, capped at max
        currentInterval = Math.min(
          currentInterval * 1.5,
          CONFIG.timing.maxRetryInterval
        )
      }

      return null
    }

    /**
     * Last resort: find any visible textarea
     * @returns {HTMLTextAreaElement|null}
     */
    function findVisibleTextarea() {
      const textareas = document.querySelectorAll('textarea')

      for (const textarea of textareas) {
        if (
          isElementVisible(textarea) &&
          !textarea.disabled &&
          !textarea.readOnly
        ) {
          console.log(
            '[GrokContentScript] Found visible textarea via universal fallback'
          )
          return textarea
        }
      }

      return null
    }

    /**
     * Check if element is visible
     * @param {HTMLElement} element
     * @returns {boolean}
     */
    function isElementVisible(element) {
      return !!(
        element.offsetParent !== null &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0 &&
        getComputedStyle(element).visibility !== 'hidden' &&
        getComputedStyle(element).display !== 'none'
      )
    }

    /**
     * Graceful degradation WITHOUT overriding clipboard
     * @param {string} content - Content that failed to fill
     * @param {Function} sendResponse - Response callback
     * @param {string} reason - Failure reason
     */
    function handleFallback(content, sendResponse, reason) {
      console.warn(
        '[GrokContentScript] Auto-fill failed:',
        reason,
        'Manual intervention required'
      )

      sendResponse({
        success: false,
        fallback: true,
        userMessage: 'Could not auto-fill Grok form. Please paste manually.',
        technicalError: reason,
        suggestedAction: 'Copy content from source and paste into Grok',
      })

      // Log detailed info for debugging (NO clipboard override)
      console.error('[GrokContentScript] Fallback Details:', {
        reason,
        contentLength: content.length,
        availableTextareas: document.querySelectorAll('textarea').length,
        timestamp: new Date().toISOString(),
      })
    }

    /**
     * Simple promise-based wait
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
  },
})
