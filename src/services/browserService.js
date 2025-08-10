// @ts-nocheck
/**
 * Module cung cấp các hàm tiện ích để tương tác với WebExtension API một cách nhất quán.
 * Sử dụng webextension-polyfill để tương thích với cả Chrome và Firefox.
 */

// --- Constants ---
const IS_BROWSER_EXTENSION =
  typeof browser !== 'undefined' && !!browser.runtime?.id

// --- Tab Management ---

/**
 * Lấy thông tin về tab đang hoạt động trong cửa sổ hiện tại.
 * @returns {Promise<browser.tabs.Tab | null>} Thông tin tab hoặc null nếu lỗi.
 */
export async function getActiveTabInfo() {
  if (!IS_BROWSER_EXTENSION || !browser.tabs) {
    console.warn('Browser Tabs API không khả dụng.')
    return null
  }
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    if (!tab || !tab.id || !tab.url) {
      console.warn('Không tìm thấy tab hoạt động hoặc thiếu thông tin.')
      return null
    }
    return tab
  } catch (error) {
    console.error('Lỗi khi lấy thông tin tab hoạt động:', error)
    return null
  }
}

// --- Scripting ---

/**
 * Tiêm một hoặc nhiều file script vào một tab cụ thể.
 * @param {number} tabId ID của tab cần tiêm script.
 * @param {string[]} files Mảng các đường dẫn file script (tương đối từ root extension).
 * @returns {Promise<boolean>} True nếu thành công (hoặc script đã tồn tại), false nếu lỗi.
 */
export async function injectScript(tabId, files) {
  if (!IS_BROWSER_EXTENSION) {
    console.warn('Browser API không khả dụng để tiêm script.')
    return false
  }

  try {
    if (browser.scripting) {
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: files,
      })
    } else if (browser.tabs && browser.tabs.executeScript) {
      for (const file of files) {
        await browser.tabs.executeScript(tabId, { file: file })
      }
    } else {
      console.warn('Không có API scripting hoặc tabs.executeScript khả dụng.')
      return false
    }
    return true
  } catch (error) {
    if (
      error.message.includes('already injected') ||
      error.message.includes('Cannot access') ||
      error.message.includes('script already executed') ||
      error.message.includes('No such tab')
    ) {
      return true
    }
    console.error(`Lỗi khi tiêm script vào tab ${tabId}:`, error)
    return false
  }
}

/**
 * Thực thi một hàm trong ngữ cảnh của một tab cụ thể.
 * @param {number} tabId ID của tab.
 * @param {Function} func Hàm cần thực thi.
 * @param {any[]} [args] Các đối số truyền vào hàm.
 * @returns {Promise<any | null>} Kết quả trả về từ hàm hoặc null nếu lỗi.
 */
export async function executeFunction(tabId, func, args = []) {
  if (!IS_BROWSER_EXTENSION) {
    console.warn('Browser API không khả dụng để thực thi hàm.')
    return null
  }

  try {
    let results
    if (browser.scripting) {
      results = await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: func,
        args: args,
      })
      return results?.[0]?.result ?? null
    } else if (browser.tabs && browser.tabs.executeScript) {
      const funcString = `(function() {
        const funcToExecute = ${func.toString()};
        const argsToPass = ${JSON.stringify(args)};
        return funcToExecute(...argsToPass);
      })();`
      results = await browser.tabs.executeScript(tabId, { code: funcString })
      return results?.[0] ?? null
    } else {
      console.warn('Không có API scripting hoặc tabs.executeScript khả dụng.')
      return null
    }
  } catch (error) {
    console.error(`Lỗi khi thực thi hàm trong tab ${tabId}:`, error)
    return null
  }
}

// --- Messaging ---

/**
 * Gửi một message đến content script trong một tab cụ thể.
 * @param {number} tabId ID của tab.
 * @param {any} message Nội dung message.
 * @param {number} [timeoutMs=5000] Thời gian chờ phản hồi (ms).
 * @returns {Promise<any>} Promise giải quyết với phản hồi từ content script hoặc bị reject nếu lỗi/timeout.
 */
export async function sendMessageToTab(tabId, message, timeoutMs = 5000) {
  if (!IS_BROWSER_EXTENSION || !browser.tabs) {
    return Promise.reject(new Error('Browser API không khả dụng.'))
  }
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Timeout (${
            timeoutMs / 1000
          }s) khi chờ phản hồi từ content script tab ${tabId} cho action: ${
            message?.action || JSON.stringify(message)
          }`
        )
      )
    }, timeoutMs)

    try {
      const response = await browser.tabs.sendMessage(tabId, message)
      clearTimeout(timeout)
      resolve(response)
    } catch (error) {
      clearTimeout(timeout)
      if (
        error.message?.includes('Could not establish connection') ||
        error.message?.includes('Receiving end does not exist') ||
        error.message?.includes(
          'The message port closed before a response was received'
        )
      ) {
        reject(
          new Error(`Không thể kết nối đến content script trong tab ${tabId}.`)
        )
      } else {
        reject(
          new Error(
            `Lỗi khi gửi message đến tab ${tabId}: ${error.message || error}`
          )
        )
      }
    }
  })
}

/**
 * Lắng nghe message từ các phần khác của extension (vd: content scripts).
 * @param {(message: any, sender: browser.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean | undefined | Promise<any>} callback Hàm xử lý message.
 */
export function onMessage(callback) {
  if (!IS_BROWSER_EXTENSION || !browser.runtime?.onMessage) {
    console.warn('Browser Runtime onMessage API không khả dụng.')
    return
  }
  browser.runtime.onMessage.addListener(callback)
}
