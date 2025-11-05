/**
 * ChatGPT content script - Optimized for speed
 */
import { waitForElement } from '../lib/utils/domUtils.js'

export default defineContentScript({
  matches: ['*://chatgpt.com/*', '*://chat.openai.com/*'],
  main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.chatgptListenerAdded) return
    window.chatgptListenerAdded = true

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

      if (message.type === 'FILL_CHATGPT_FORM') {
        handleFillForm(message.content, sendResponse)
        return true
      }
    })

    /**
     * Handles filling the ChatGPT form with content
     * @param {string} content - The content to fill in the form
     * @param {function} sendResponse - The response callback function
     * @returns {Promise<void>}
     */
    async function handleFillForm(content, sendResponse) {
      try {
        const textArea = await waitForElement([
          '#prompt-textarea',
          'div[contenteditable="true"].ProseMirror',
        ])
        if (!textArea) throw new Error('Text area not found')

        // Use a more direct way to set content and trigger updates
        textArea.focus()
        if (textArea.matches('div[contenteditable="true"]')) {
          textArea.textContent = content
        } else {
          textArea.value = content
        }
        textArea.dispatchEvent(
          new Event('input', { bubbles: true, cancelable: true })
        )

        // The submit button is often disabled briefly after input
        const submitButton = await waitForElement(
          ['button[data-testid="send-button"]', 'button[aria-label*="Send" i]'],
          { timeout: 5000, checkDisabled: true }
        )
        if (!submitButton)
          throw new Error('Submit button not found or remained disabled')

        submitButton.click()

        sendResponse({ success: true })
      } catch (error) {
        console.error('[ChatGPTContentScript] Form fill failed:', error)
        sendResponse({ success: false, error: error.message })
      }
    }
  },
})
