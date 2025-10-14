/**
 * Grok content script - Optimized for speed
 */
import { waitForElement } from '../lib/utils/domUtils.js'

export default defineContentScript({
  matches: ['*://grok.com/*'],
  main() {
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
        const textArea = await waitForElement([
          'textarea[dir="auto"]',
          'textarea.w-full.px-2.leading-7.bg-transparent',
          'textarea[aria-label*="Grok" i]',
        ])
        if (!textArea) throw new Error('Text area not found')

        // Focus and set content
        textArea.focus()
        textArea.value = content
        textArea.dispatchEvent(
          new Event('input', { bubbles: true, cancelable: true })
        )

        // Wait for the submit button to become enabled
        const submitButton = await waitForElement(
          [
            'button[type="submit"]',
            'button.group.flex.flex-col.justify-center.rounded-full[type="submit"]',
            'button[aria-label*="Send" i]',
            'button[aria-label*="Gửi" i]',
          ],
          { timeout: 5000, checkDisabled: true }
        )
        if (!submitButton)
          throw new Error('Submit button not found or remained disabled')

        submitButton.click()

        sendResponse({ success: true })
      } catch (error) {
        console.error('[GrokContentScript] Form fill failed:', error)
        sendResponse({ success: false, error: error.message })
      }
    }
  },
})
