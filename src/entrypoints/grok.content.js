// @ts-nocheck
/**
 * Grok content script - Optimized for speed
 */
export default defineContentScript({
  matches: ['*://grok.com/*'],
  main() {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('ref') !== 'summarizerrrr') return

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FILL_GROK_FORM') {
        handleFillForm(message.content, sendResponse)
        return true
      }
    })

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

    async function waitForElement(
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
          setTimeout(check, 100) // Poll faster
        }
        check()
      })
    }
  },
})
