/**
 * Perplexity content script - Fills and submits the form, inspired by Gemini/ChatGPT scripts.
 */
import { waitForElement } from '../lib/utils/domUtils.js'

export default defineContentScript({
  matches: ['*://www.perplexity.ai/*'],

  /**
   * Main function for the content script
   * @returns {Promise<void>}
   */
  async main() {
    // Prevent multiple listener registrations on SPA navigation
    if (window.perplexityListenerAdded) return
    window.perplexityListenerAdded = true

    console.log('[PerplexityContentScript] Content script loaded')

    /**
     * @param {object} message - The message object
     * @param {string} message.type - The type of message
     * @param {string} message.content - The content to fill in the form
     * @param {object} sender - The sender of the message
     * @param {function} sendResponse - The response callback function
     * @returns {boolean} - Returns true to keep the message channel open for async response
     */
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'PING') {
        sendResponse({ ready: true })
        return true
      }

      if (message.type === 'FILL_PERPLEXITY_FORM') {
        handleFillForm(message.content, sendResponse)
        return true // Keep the message channel open for async response
      }
    })
  },
})

/**
 * Handles filling the Perplexity form with content
 * @param {string} content - The content to fill in the form
 * @param {function} sendResponse - The response callback function
 * @returns {Promise<void>}
 */
async function handleFillForm(content, sendResponse) {
  try {
    console.log('[PerplexityContentScript] Starting form fill...')

    const textArea = await waitForElement(
      [
        '#ask-input',
        'div[contenteditable="true"][data-lexical-editor="true"]',
        'div[contenteditable="true"].outline-none',
      ],
      { timeout: 10000, checkDisabled: false }
    )

    if (!textArea) {
      throw new Error('Perplexity text area not found.')
    }

    console.log('[PerplexityContentScript] Text area found:', textArea)

    // Use a more direct way to set content and trigger updates for Lexical editor
    textArea.focus()

    // Clear existing content first
    if (textArea.querySelector('p')) {
      textArea.querySelector('p').textContent = ''
    } else {
      textArea.textContent = ''
    }

    // Insert content using Selection API for better compatibility with contenteditable
    const selection = window.getSelection()
    const range = document.createRange()

    if (textArea.querySelector('p')) {
      const p = textArea.querySelector('p')
      range.selectNodeContents(p)
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand('insertText', false, content)
    } else {
      range.selectNodeContents(textArea)
      selection.removeAllRanges()
      selection.addRange(range)
      document.execCommand('insertText', false, content)
    }

    // Dispatch multiple events to ensure Lexical editor registers the change
    textArea.dispatchEvent(
      new Event('input', { bubbles: true, cancelable: true })
    )
    textArea.dispatchEvent(
      new Event('change', { bubbles: true, cancelable: true })
    )
    textArea.dispatchEvent(
      new Event('keyup', { bubbles: true, cancelable: true })
    )
    textArea.dispatchEvent(
      new Event('paste', { bubbles: true, cancelable: true })
    )

    console.log('[PerplexityContentScript] Text area filled.')

    // Wait for the submit button to become enabled after the input has been processed.
    const submitButton = await waitForElement(
      [
        'button[data-testid="submit-button"]:not(:disabled)',
        'button[aria-label*="Send" i]:not(:disabled)',
        'button[type="submit"]:not(:disabled)',
      ],
      { timeout: 5000, checkDisabled: true }
    )

    if (!submitButton) {
      throw new Error(
        'Perplexity submit button not found or remained disabled.'
      )
    }

    submitButton.click()
    console.log('[PerplexityContentScript] Form submitted.')

    sendResponse({ success: true })
  } catch (error) {
    console.error('[PerplexityContentScript] Error during form fill:', error)
    sendResponse({ success: false, error: error.message })
  }
}
