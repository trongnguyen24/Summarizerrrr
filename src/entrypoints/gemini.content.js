/**
 * Gemini content script - Optimized for speed
 */
import { waitForElement } from '../lib/utils/domUtils.js'

export default defineContentScript({
  matches: ['*://gemini.google.com/*'],
  main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.geminiListenerAdded) return
    window.geminiListenerAdded = true

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('ref') !== 'summarizerrrr') return

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

      if (message.type === 'FILL_GEMINI_FORM') {
        handleFillForm(message.content, sendResponse)
        return true
      }
    })

    /**
     * Handles filling the Gemini form with content
     * @param {string} content - The content to fill in the form
     * @param {function} sendResponse - The response callback function
     * @returns {Promise<void>}
     */
    async function handleFillForm(content, sendResponse) {
      try {
        const editor = await waitForElement([
          '.ql-editor.textarea',
          '.ql-editor[contenteditable="true"]',
        ])
        if (!editor) throw new Error('Text area not found')

        // Directly set content and dispatch event
        editor.focus()
        if (editor.querySelector('p')) {
          editor.querySelector('p').textContent = content
        } else {
          editor.textContent = content
        }
        editor.dispatchEvent(
          new Event('input', { bubbles: true, cancelable: true })
        )

        // Wait for the submit button to become enabled
        const submitButton = await waitForElement(
          ['button:has(span.send-icon)', 'button[aria-label*="Send" i]'],
          { timeout: 5000, checkDisabled: true }
        )
        if (!submitButton)
          throw new Error('Submit button not found or remained disabled')

        submitButton.click()

        sendResponse({ success: true })
      } catch (error) {
        console.error('[GeminiContentScript] Form fill failed:', error)
        sendResponse({ success: false, error: error.message })
      }
    }
  },
})
