// @ts-nocheck
/**
 * ChatGPT content script - Optimized for speed
 */
export default defineContentScript({
  matches: ['*://chatgpt.com/*', '*://chat.openai.com/*'],
  main() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ref') !== 'summarizerrrr') return;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'FILL_CHATGPT_FORM') {
        handleFillForm(message.content, sendResponse);
        return true;
      }
    });

    async function handleFillForm(content, sendResponse) {
      try {
        const textArea = await waitForElement([
          '#prompt-textarea',
          'div[contenteditable="true"].ProseMirror',
        ]);
        if (!textArea) throw new Error('Text area not found');

        // Use a more direct way to set content and trigger updates
        textArea.focus();
        if (textArea.matches('div[contenteditable="true"]')) {
          textArea.textContent = content;
        } else {
          textArea.value = content;
        }
        textArea.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        
        // The submit button is often disabled briefly after input
        const submitButton = await waitForElement(
          ['button[data-testid="send-button"]', 'button[aria-label*="Send" i]'],
          { timeout: 5000, checkDisabled: true }
        );
        if (!submitButton) throw new Error('Submit button not found or remained disabled');

        submitButton.click();

        sendResponse({ success: true });
      } catch (error) {
        console.error('[ChatGPTContentScript] Form fill failed:', error);
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
            if (element && (element.offsetParent !== null)) {
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