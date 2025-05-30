// @ts-nocheck
// Lắng nghe tin nhắn từ background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Kiểm tra nếu action là 'getSelectedText'
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection().toString()

    // Gửi văn bản đã chọn trở lại background script
    sendResponse({ action: 'selectedTextResult', text: selectedText })
  }
})
