// @ts-nocheck
console.log('[selectionContentScript.js] Content script loaded.')

// Lắng nghe tin nhắn từ background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[selectionContentScript.js] Received message:', request)

  // Kiểm tra nếu action là 'getSelectedText'
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection().toString()
    console.log('[selectionContentScript.js] Selected text:', selectedText)

    // Gửi văn bản đã chọn trở lại background script
    sendResponse({ action: 'selectedTextResult', text: selectedText })
  }
})

console.log('[selectionContentScript.js] Message listener added.')
