// @ts-nocheck
/**
 * Gemini content script - Optimized for speed
 */
export default defineContentScript({
  matches: ['*://gemini.google.com/*'],
  main() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ref') !== 'summarizerrrr') return;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FILL_GEMINI_FORM') {
        handleFillForm(message.content, sendResponse);
        return true;
      }
    });

    async function handleFillForm(content, sendResponse) {
      try {
        const editor = await waitForElement([
          '.ql-editor.textarea',
          '.ql-editor[contenteditable="true"]',
        ]);
        if (!editor) throw new Error('Text area not found');

        // Directly set content and dispatch event
        editor.focus();
        if (editor.querySelector('p')) {
            editor.querySelector('p').textContent = content;
        } else {
            editor.textContent = content;
        }
        editor.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

        // Wait for the submit button to become enabled
        const submitButton = await waitForElement(
            ['button:has(span.send-icon)', 'button[aria-label*="Send" i]'],
            { timeout: 5000, checkDisabled: true }
        );
        if (!submitButton) throw new Error('Submit button not found or remained disabled');

        submitButton.click();

        sendResponse({ success: true });
      } catch (error) {
        console.error('[GeminiContentScript] Form fill failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    async function waitForElement(selectors, options = { timeout: 10000, checkDisabled: false }) {
        const { timeout, checkDisabled } = options;
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        return new Promise((resolve) => {
            const startTime = Date.now();
            const check = () => {
                for (const selector of selectorList) {
                    const element = document.querySelector(selector);
                    if (element && element.offsetParent !== null) {
                        if (checkDisabled && element.disabled) continue;
                        resolve(element);
                        return;
                    }
                }
                if (Date.now() - startTime > timeout) {
                    resolve(null);
                    return;
                }
                setTimeout(check, 100); // Poll faster
            };
            check();
        });
    }
  },
});