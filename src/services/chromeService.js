/**
 * Module cung cấp các hàm tiện ích để tương tác với Chrome API một cách nhất quán.
 */

// --- Constants ---
const IS_CHROME_EXTENSION =
  typeof chrome !== 'undefined' && !!chrome.runtime?.id

// --- Tab Management ---

/**
 * Lấy thông tin về tab đang hoạt động trong cửa sổ hiện tại.
 * @returns {Promise<chrome.tabs.Tab | null>} Thông tin tab hoặc null nếu lỗi.
 */
export async function getActiveTabInfo() {
  if (!IS_CHROME_EXTENSION || !chrome.tabs) {
    console.warn('Chrome Tabs API không khả dụng.')
    return null
  }
  try {
    const [tab] = await chrome.tabs.query({
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
  if (!IS_CHROME_EXTENSION || !chrome.scripting) {
    console.warn('Chrome Scripting API không khả dụng.')
    return false
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: files,
    })
    console.log(`Đã tiêm script ${files.join(', ')} vào tab ${tabId}`)
    return true
  } catch (error) {
    // Lỗi thường gặp là script đã được tiêm, coi như thành công trong trường hợp đó.
    if (
      error.message.includes('already injected') ||
      error.message.includes('Cannot access') // Có thể xảy ra trên trang đặc biệt
    ) {
      console.warn(
        `Cảnh báo khi tiêm script vào tab ${tabId} (có thể đã tồn tại hoặc không được phép):`,
        error.message
      )
      return true // Vẫn coi là thành công để luồng tiếp tục
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
  if (!IS_CHROME_EXTENSION || !chrome.scripting) {
    console.warn('Chrome Scripting API không khả dụng.')
    return null
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: func,
      args: args,
    })
    // executeScript trả về một mảng kết quả, thường chỉ cần phần tử đầu tiên
    return results?.[0]?.result ?? null
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
  if (!IS_CHROME_EXTENSION || !chrome.tabs) {
    console.warn('Chrome Tabs/Runtime API không khả dụng để gửi message.')
    return Promise.reject(new Error('Chrome API không khả dụng.'))
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
      const response = await chrome.tabs.sendMessage(tabId, message)
      clearTimeout(timeout)
      // Kiểm tra lỗi phổ biến khi content script không tồn tại
      if (chrome.runtime.lastError) {
        if (
          chrome.runtime.lastError.message?.includes(
            'Could not establish connection'
          ) ||
          chrome.runtime.lastError.message?.includes(
            'Receiving end does not exist'
          )
        ) {
          reject(
            new Error(
              `Không thể kết nối đến content script trong tab ${tabId}. Script có thể chưa được tiêm hoặc trang không hợp lệ.`
            )
          )
        } else {
          reject(
            new Error(
              `Lỗi runtime khi gửi message đến tab ${tabId}: ${chrome.runtime.lastError.message}`
            )
          )
        }
      } else {
        resolve(response)
      }
    } catch (error) {
      clearTimeout(timeout)
      // Bắt các lỗi khác (vd: tab đã đóng)
      reject(
        new Error(
          `Lỗi khi gửi message đến tab ${tabId}: ${error.message || error}`
        )
      )
    }
  })
}

/**
 * Lắng nghe message từ các phần khác của extension (vd: content scripts).
 * @param {(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => boolean | undefined | Promise<any>} callback Hàm xử lý message.
 */
export function onMessage(callback) {
  if (!IS_CHROME_EXTENSION || !chrome.runtime?.onMessage) {
    console.warn('Chrome Runtime onMessage API không khả dụng.')
    return
  }
  chrome.runtime.onMessage.addListener(callback)
}

// --- Storage ---

/**
 * Lấy giá trị từ chrome.storage.sync.
 * @param {string | string[] | null} keys Khóa hoặc mảng khóa cần lấy. Null để lấy tất cả.
 * @returns {Promise<{[key: string]: any}>} Promise giải quyết với object chứa các cặp key-value.
 */
export async function getStorage(keys) {
  if (!IS_CHROME_EXTENSION || !chrome.storage?.sync) {
    console.warn('Chrome Storage Sync API không khả dụng.')
    return {} // Trả về object rỗng để tránh lỗi
  }
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(
          new Error(`Lỗi khi lấy storage: ${chrome.runtime.lastError.message}`)
        )
      } else {
        resolve(result || {})
      }
    })
  })
}

/**
 * Lưu giá trị vào chrome.storage.sync.
 * @param {{[key: string]: any}} items Object chứa các cặp key-value cần lưu.
 * @returns {Promise<void>} Promise giải quyết khi lưu xong hoặc reject nếu lỗi.
 */
export async function setStorage(items) {
  if (!IS_CHROME_EXTENSION || !chrome.storage?.sync) {
    console.warn('Chrome Storage Sync API không khả dụng.')
    return Promise.resolve() // Giả lập thành công
  }
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(
          new Error(`Lỗi khi lưu storage: ${chrome.runtime.lastError.message}`)
        )
      } else {
        resolve()
      }
    })
  })
}

/**
 * Lắng nghe sự thay đổi trong chrome.storage.sync.
 * @param {(changes: {[key: string]: chrome.storage.StorageChange}, areaName: "sync" | "local" | "managed" | "session") => void} callback Hàm xử lý khi có thay đổi.
 */
export function onStorageChange(callback) {
  if (!IS_CHROME_EXTENSION || !chrome.storage?.onChanged) {
    console.warn('Chrome Storage onChanged API không khả dụng.')
    return
  }
  chrome.storage.onChanged.addListener(callback)
}

console.log('chromeService.js loaded') // Để xác nhận module đã được load
