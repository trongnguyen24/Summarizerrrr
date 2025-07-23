// @ts-nocheck
/**
 * Module cung cấp các hàm tiện ích để tương tác với WebExtension API một cách nhất quán.
 * Sử dụng webextension-polyfill để tương thích với cả Chrome và Firefox.
 */

// --- Constants ---
// IS_BROWSER_EXTENSION không còn cần thiết nếu sử dụng webextension-polyfill
// hoặc nếu bạn muốn code chạy trên cả hai bằng cách kiểm tra browser.runtime
// Tuy nhiên, nếu bạn đã có polyfill, browser.runtime sẽ luôn khả dụng.
const IS_BROWSER_EXTENSION =
  typeof browser !== 'undefined' && !!browser.runtime?.id

// --- Tab Management ---

/**
 * Lấy thông tin về tab đang hoạt động trong cửa sổ hiện tại.
 * @returns {Promise<browser.tabs.Tab | null>} Thông tin tab hoặc null nếu lỗi.
 */
export async function getActiveTabInfo() {
  // Thay thế chrome.tabs bằng browser.tabs
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
// Đã chỉnh sửa để tương thích với Manifest V2 (sử dụng browser.tabs.executeScript)
// và Manifest V3 (sử dụng browser.scripting.executeScript) thông qua kiểm tra API.

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
      // Dùng browser.scripting (Manifest V3) nếu có
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: files,
      })
      console.log(
        `Đã tiêm script (scripting API) ${files.join(', ')} vào tab ${tabId}`
      )
    } else if (browser.tabs && browser.tabs.executeScript) {
      // Dùng browser.tabs.executeScript (Manifest V2) nếu browser.scripting không có
      for (const file of files) {
        await browser.tabs.executeScript(tabId, { file: file })
      }
      console.log(
        `Đã tiêm script (tabs.executeScript API) ${files.join(
          ', '
        )} vào tab ${tabId}`
      )
    } else {
      console.warn('Không có API scripting hoặc tabs.executeScript khả dụng.')
      return false
    }
    return true
  } catch (error) {
    // Xử lý các lỗi phổ biến khi tiêm script
    if (
      error.message.includes('already injected') ||
      error.message.includes('Cannot access') ||
      error.message.includes('script already executed') || // Firefox specific
      error.message.includes('No such tab') // Tab might have closed
    ) {
      console.warn(
        `Cảnh báo khi tiêm script vào tab ${tabId} (có thể đã tồn tại, không được phép hoặc tab đã đóng):`,
        error.message
      )
      return true // Vẫn coi là thành công để luồng tiếp tục nếu lỗi là do đã tiêm
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
      // Dùng browser.scripting (Manifest V3) nếu có
      results = await browser.scripting.executeScript({
        target: { tabId: tabId },
        func: func,
        args: args,
      })
      console.log(`Đã thực thi hàm (scripting API) trong tab ${tabId}`)
      return results?.[0]?.result ?? null
    } else if (browser.tabs && browser.tabs.executeScript) {
      // Dùng browser.tabs.executeScript (Manifest V2) nếu browser.scripting không có
      // Chuyển đổi hàm thành chuỗi và tiêm vào.
      // CÁCH NÀY CÓ HẠN CHẾ VỚI CÁC ĐỐI SỐ PHỨC TẠP HOẶP BIẾN ĐÓNG.
      // Đối với các trường hợp phức tạp hơn, nên sử dụng message passing.
      const funcString = `(function() {
        // Đảm bảo func và args được định nghĩa trong ngữ cảnh này nếu cần
        const funcToExecute = ${func.toString()};
        const argsToPass = ${JSON.stringify(args)};
        return funcToExecute(...argsToPass);
      })();`
      results = await browser.tabs.executeScript(tabId, { code: funcString })
      console.log(`Đã thực thi hàm (tabs.executeScript API) trong tab ${tabId}`)
      // executeScript trả về một mảng kết quả, thường chỉ cần phần tử đầu tiên
      return results?.[0] ?? null // results[0] sẽ là kết quả của code được thực thi
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
  // Thay thế chrome.tabs/chrome.runtime bằng browser.tabs/browser.runtime
  if (!IS_BROWSER_EXTENSION || !browser.tabs) {
    console.warn('Browser Tabs/Runtime API không khả dụng để gửi message.')
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
      // chrome.tabs.sendMessage() trả về Promise khi có webextension-polyfill
      const response = await browser.tabs.sendMessage(tabId, message)
      clearTimeout(timeout)
      // webextension-polyfill sẽ xử lý lỗi và throw exception thay vì cần kiểm tra riêng
      resolve(response)
    } catch (error) {
      clearTimeout(timeout)
      // Các lỗi phổ biến khi content script không tồn tại hoặc tab đã đóng
      if (
        error.message?.includes('Could not establish connection') ||
        error.message?.includes('Receiving end does not exist') ||
        error.message?.includes(
          'The message port closed before a response was received'
        ) // Phổ biến ở Firefox
      ) {
        reject(
          new Error(
            `Không thể kết nối đến content script trong tab ${tabId}. Script có thể chưa được tiêm hoặc trang không hợp lệ.`
          )
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
  // Thay thế chrome.runtime bằng browser.runtime
  if (!IS_BROWSER_EXTENSION || !browser.runtime?.onMessage) {
    console.warn('Browser Runtime onMessage API không khả dụng.')
    return
  }
  // Polyfill sẽ chuyển đổi để callback nhận sender/sendResponse tương thích
  browser.runtime.onMessage.addListener(callback)
}

// --- Storage ---

/**
 * Lấy giá trị từ browser.storage.sync.
 * @param {string | string[] | null} keys Khóa hoặc mảng khóa cần lấy. Null để lấy tất cả.
 * @returns {Promise<{[key: string]: any}>} Promise giải quyết với object chứa các cặp key-value.
 */
export async function getStorage(keys) {
  // Thay thế chrome.storage bằng browser.storage
  if (!IS_BROWSER_EXTENSION || !browser.storage?.sync) {
    console.warn('Browser Storage Sync API không khả dụng.')
    return {}
  }
  // browser.storage.sync.get() đã trả về Promise sẵn
  try {
    const result = await browser.storage.sync.get(keys)
    console.log('[chromeService] getStorage result:', result)
    return result || {}
  } catch (error) {
    console.error(`Lỗi khi lấy storage: ${error.message}`)
    return {}
  }
}

/**
 * Lưu giá trị vào browser.storage.sync.
 * @param {{[key: string]: any}} items Object chứa các cặp key-value cần lưu.
 * @returns {Promise<void>} Promise giải quyết khi lưu xong hoặc reject nếu lỗi.
 */
export async function setStorage(items) {
  // Thay thế chrome.storage bằng browser.storage
  if (!IS_BROWSER_EXTENSION || !browser.storage?.sync) {
    console.warn('Browser Storage Sync API không khả dụng.')
    return Promise.resolve()
  }
  // browser.storage.sync.set() đã trả về Promise sẵn
  try {
    await browser.storage.sync.set(items)
  } catch (error) {
    console.error(`Lỗi khi lưu storage: ${error.message}`)
    throw error // Re-throw để người gọi biết lỗi
  }
}

/**
 * Lắng nghe sự thay đổi trong browser.storage.sync.
 * @param {(changes: {[key: string]: browser.storage.StorageChange}, areaName: "sync" | "local" | "managed" | "session") => void} callback Hàm xử lý khi có thay đổi.
 */
export function onStorageChange(callback) {
  // Thay thế chrome.storage bằng browser.storage
  if (!IS_BROWSER_EXTENSION || !browser.storage?.onChanged) {
    console.warn('Browser Storage onChanged API không khả dụng.')
    return
  }
  browser.storage.onChanged.addListener(callback)
}

console.log('chromeService.js loaded (now compatible with Firefox)') // Để xác nhận module đã được load
