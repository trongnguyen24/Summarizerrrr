// @ts-nocheck
/**
 * Simple Gemini content script - detect ?ref parameter and handle form filling
 */

export default defineContentScript({
  matches: ['*://gemini.google.com/*'],
  main() {
    console.log('[GeminiContentScript] Content script loaded')

    // Check if this page has our ref parameter
    const urlParams = new URLSearchParams(window.location.search)
    const hasRefParam = urlParams.get('ref') === 'summarizerrrr'

    if (!hasRefParam) {
      console.log('[GeminiContentScript] No ref parameter, exiting')
      return
    }

    console.log(
      '[GeminiContentScript] Detected ref=summarizerrrr, waiting for content...'
    )

    // Listen for content from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[GeminiContentScript] Received message:', message.type)

      if (message.type === 'FILL_GEMINI_FORM') {
        handleFillForm(message.content, sendResponse)
        return true
      }
    })

    /**
     * Handle form filling with the provided content
     */
    async function handleFillForm(content, sendResponse) {
      try {
        console.log('[GeminiContentScript] Starting form fill process...')
        console.log('[GeminiContentScript] Content length:', content.length)
        console.log(
          '[GeminiContentScript] Content preview:',
          content.substring(0, 200) + '...'
        )

        // Wait for page to be ready
        await waitForPageReady()

        // Find text area with multiple selectors
        const textAreaSelectors = [
          '.ql-editor.textarea.new-input-ui[contenteditable="true"]',
          '.ql-editor[contenteditable="true"]',
          'div[contenteditable="true"][role="textbox"]',
          'textarea',
        ]

        const textArea = await waitForElement(textAreaSelectors)
        if (!textArea) {
          throw new Error('Text area not found')
        }

        console.log('[GeminiContentScript] Text area found, filling content...')

        // Fill content using textContent instead of innerHTML
        textArea.focus()
        textArea.innerHTML = '' // Clear first
        textArea.textContent = content // Use textContent for full content

        // Trigger events
        const events = ['input', 'change', 'keyup', 'paste']
        for (const eventType of events) {
          textArea.dispatchEvent(
            new Event(eventType, { bubbles: true, cancelable: true })
          )
        }

        // Also try to set the value if it's a textarea
        if (textArea.value !== undefined) {
          textArea.value = content
          textArea.dispatchEvent(new Event('input', { bubbles: true }))
        }

        textArea.focus()

        // Log what was actually set
        console.log(
          '[GeminiContentScript] Text area content after fill:',
          textArea.textContent.substring(0, 200) + '...'
        )

        // Wait and find submit button
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const submitSelectors = [
          'button[aria-label*="Send" i]',
          'button[aria-label*="Submit" i]',
          'button[data-testid="send-button"]',
          'button:has(svg[data-testid="send-icon"])',
        ]

        const submitButton = await waitForElement(submitSelectors)
        if (!submitButton) {
          throw new Error('Submit button not found')
        }

        console.log('[GeminiContentScript] Submit button found, clicking...')

        // Click submit
        submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await new Promise((resolve) => setTimeout(resolve, 500))
        submitButton.click()

        console.log(
          '[GeminiContentScript] Form filled and submitted successfully'
        )
        sendResponse({ success: true })
      } catch (error) {
        console.error('[GeminiContentScript] Form fill failed:', error)
        sendResponse({ success: false, error: error.message })
      }
    }

    /**
     * Wait for page to be ready
     */
    async function waitForPageReady() {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          setTimeout(() => resolve(), 1000) // Extra wait for dynamic content
          return
        }

        const onReady = () => {
          document.removeEventListener('readystatechange', onReady)
          setTimeout(() => resolve(), 1000)
        }

        document.addEventListener('readystatechange', onReady)
      })
    }

    /**
     * Wait for element with multiple selectors
     */
    async function waitForElement(selectors, timeout = 20000) {
      const selectorList = Array.isArray(selectors) ? selectors : [selectors]

      return new Promise((resolve) => {
        const startTime = Date.now()

        const checkElements = () => {
          for (const selector of selectorList) {
            const element = document.querySelector(selector)
            if (element && element.offsetParent !== null) {
              console.log(`[GeminiContentScript] Element found: ${selector}`)
              resolve(element)
              return
            }
          }

          if (Date.now() - startTime > timeout) {
            console.warn(
              '[GeminiContentScript] Element not found after timeout'
            )
            resolve(null)
            return
          }

          setTimeout(checkElements, 500)
        }

        checkElements()
      })
    }
  },
})
