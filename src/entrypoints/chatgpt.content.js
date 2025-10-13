// @ts-nocheck
/**
 * ChatGPT content script - detect ?ref parameter and handle form filling
 */

export default defineContentScript({
  matches: ['*://chatgpt.com/*', '*://chat.openai.com/*'],
  main() {
    console.log('[ChatGPTContentScript] Content script loaded')

    // Check if this page has our ref parameter
    const urlParams = new URLSearchParams(window.location.search)
    const hasRefParam = urlParams.get('ref') === 'summarizerrrr'

    if (!hasRefParam) {
      console.log('[ChatGPTContentScript] No ref parameter, exiting')
      return
    }

    console.log(
      '[ChatGPTContentScript] Detected ref=summarizerrrr, waiting for content...'
    )

    // Listen for content from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[ChatGPTContentScript] Received message:', message.type)

      if (message.type === 'FILL_CHATGPT_FORM') {
        handleFillForm(message.content, sendResponse)
        return true
      }
    })

    /**
     * Handle form filling with the provided content
     */
    async function handleFillForm(content, sendResponse) {
      try {
        console.log('[ChatGPTContentScript] Starting form fill process...')
        console.log('[ChatGPTContentScript] Content length:', content.length)
        console.log(
          '[ChatGPTContentScript] Content preview:',
          content.substring(0, 200) + '...'
        )

        // Wait for page to be ready
        await waitForPageReady()

        // Find text area with ChatGPT-specific selectors
        const textAreaSelectors = [
          '#prompt-textarea',
          'div[contenteditable="true"].ProseMirror',
          'div[contenteditable="true"][data-testid="composer-text-input"]',
          'textarea[placeholder*="Message"]',
        ]

        const textArea = await waitForElement(textAreaSelectors)
        if (!textArea) {
          throw new Error('Text area not found')
        }

        console.log(
          '[ChatGPTContentScript] Text area found, filling content...'
        )

        // Fill content using methods that preserve XML tags
        textArea.focus()

        // Clear existing content first
        if (textArea.classList.contains('ProseMirror')) {
          // For ProseMirror, select all and delete first
          const selection = window.getSelection()
          const range = document.createRange()
          range.selectNodeContents(textArea)
          selection.removeAllRanges()
          selection.addRange(range)

          // Try using InputEvent with insertText to preserve XML
          try {
            const inputEvent = new InputEvent('beforeinput', {
              bubbles: true,
              cancelable: true,
              inputType: 'insertText',
              data: content,
            })
            textArea.dispatchEvent(inputEvent)

            // If that doesn't work, try direct insertion
            if (!textArea.textContent || textArea.textContent.length === 0) {
              // Create text node to preserve XML tags
              textArea.innerHTML = ''
              const textNode = document.createTextNode(content)
              const paragraph = document.createElement('p')
              paragraph.appendChild(textNode)
              textArea.appendChild(paragraph)
            }
          } catch (e) {
            console.log(
              '[ChatGPTContentScript] InputEvent failed, using textNode method'
            )
            textArea.innerHTML = ''
            const textNode = document.createTextNode(content)
            const paragraph = document.createElement('p')
            paragraph.appendChild(textNode)
            textArea.appendChild(paragraph)
          }
        } else {
          // For regular textarea
          textArea.value = content
          textArea.textContent = content
        }

        // Trigger comprehensive events for ProseMirror
        const events = ['input', 'change', 'keyup', 'compositionend']
        for (const eventType of events) {
          const event = new Event(eventType, {
            bubbles: true,
            cancelable: true,
          })
          textArea.dispatchEvent(event)
        }

        // Special InputEvent for modern browsers
        const inputEvent = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: content,
        })
        textArea.dispatchEvent(inputEvent)

        textArea.focus()

        // Log what was actually set
        console.log(
          '[ChatGPTContentScript] Text area content after fill:',
          (textArea.textContent || textArea.innerHTML).substring(0, 200) + '...'
        )

        // Wait and find submit button
        await new Promise((resolve) => setTimeout(resolve, 2000))

        const submitSelectors = [
          '#composer-submit-button',
          'button[data-testid="send-button"]',
          'button[aria-label*="Send" i]',
          'button[aria-label*="Submit" i]',
          'button.composer-submit-btn',
        ]

        const submitButton = await waitForElement(submitSelectors)
        if (!submitButton) {
          throw new Error('Submit button not found')
        }

        console.log('[ChatGPTContentScript] Submit button found, clicking...')

        // Click submit
        submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
        await new Promise((resolve) => setTimeout(resolve, 500))
        submitButton.click()

        console.log(
          '[ChatGPTContentScript] Form filled and submitted successfully'
        )
        sendResponse({ success: true })
      } catch (error) {
        console.error('[ChatGPTContentScript] Form fill failed:', error)
        sendResponse({ success: false, error: error.message })
      }
    }

    /**
     * Wait for page to be ready
     */
    async function waitForPageReady() {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          setTimeout(() => resolve(), 3000) // Extra wait for ChatGPT's dynamic content
          return
        }

        const onReady = () => {
          document.removeEventListener('readystatechange', onReady)
          setTimeout(() => resolve(), 3000)
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
              console.log(`[ChatGPTContentScript] Element found: ${selector}`)
              resolve(element)
              return
            }
          }

          if (Date.now() - startTime > timeout) {
            console.warn(
              '[ChatGPTContentScript] Element not found after timeout'
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
