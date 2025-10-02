// @ts-nocheck
/**
 * Firefox Optional Permissions Service
 * Core service để xử lý optional permissions trên Firefox
 */

/**
 * Lấy permission pattern cần thiết cho URL
 * @param {string} url - URL hiện tại
 * @returns {string} - Permission pattern
 */
export function getRequiredPermission(url) {
  if (url.includes('youtube.com')) {
    return '*://*.youtube.com/*'
  }
  if (url.includes('udemy.com')) {
    return '*://*.udemy.com/*'
  }
  if (url.includes('reddit.com')) {
    return '*://*.reddit.com/*'
  }
  if (url.includes('coursera.org')) {
    return '*://*.coursera.org/*'
  }
  // Default cho tất cả các site khác
  return 'https://*/*'
}

/**
 * Kiểm tra xem đã có permission cho URL chưa
 * @param {string} url - URL cần kiểm tra
 * @returns {Promise<boolean>} - True nếu đã có permission
 */
export async function checkPermission(url) {
  try {
    const permission = getRequiredPermission(url)
    return await browser.permissions.contains({
      origins: [permission],
    })
  } catch (error) {
    console.error(
      '[FirefoxPermissionService] Error checking permission:',
      error
    )
    return false
  }
}

/**
 * Yêu cầu permission từ user cho URL
 * @param {string} url - URL cần permission
 * @returns {Promise<boolean>} - True nếu user cấp permission
 */
export async function requestPermission(url) {
  try {
    const permission = getRequiredPermission(url)
    return await browser.permissions.request({
      origins: [permission],
    })
  } catch (error) {
    console.error(
      '[FirefoxPermissionService] Error requesting permission:',
      error
    )
    return false
  }
}

/**
 * Kiểm tra permission cho các patterns cụ thể
 * @param {string} pattern - Permission pattern (vd: '*://*.youtube.com/*')
 * @returns {Promise<boolean>} - True nếu đã có permission
 */
export async function checkSpecificPermission(pattern) {
  try {
    return await browser.permissions.contains({
      origins: [pattern],
    })
  } catch (error) {
    console.error(
      '[FirefoxPermissionService] Error checking specific permission:',
      error
    )
    return false
  }
}

/**
 * Yêu cầu permission cho pattern cụ thể
 * @param {string} pattern - Permission pattern
 * @returns {Promise<boolean>} - True nếu user cấp permission
 */
export async function requestSpecificPermission(pattern) {
  try {
    return await browser.permissions.request({
      origins: [pattern],
    })
  } catch (error) {
    console.error(
      '[FirefoxPermissionService] Error requesting specific permission:',
      error
    )
    return false
  }
}

/**
 * Xóa permission cho pattern cụ thể
 * @param {string} pattern - Permission pattern
 * @returns {Promise<boolean>} - True nếu xóa thành công
 */
export async function removeSpecificPermission(pattern) {
  try {
    return await browser.permissions.remove({
      origins: [pattern],
    })
  } catch (error) {
    console.error(
      '[FirefoxPermissionService] Error removing specific permission:',
      error
    )
    return false
  }
}

/**
 * Kiểm tra xem error có phải là connection error không
 * @param {Error} error - Error object để kiểm tra
 * @returns {boolean} - True nếu là connection error
 */
export function isConnectionError(error) {
  const connectionMessages = [
    'Could not establish connection',
    'Receiving end does not exist',
    'Extension context invalidated',
    'No tab with id',
    'The message port closed before a response was received',
  ]

  const errorMessage = error?.message || error?.toString() || ''
  return connectionMessages.some((msg) => errorMessage.includes(msg))
}

/**
 * Tạo custom error cho Firefox permission scenarios
 * @param {Error} originalError - Lỗi gốc
 * @param {string} url - URL hiện tại
 * @returns {Error} - Enhanced error với thông tin reload
 */
export function createPermissionError(originalError, url) {
  const requiredPermission = getRequiredPermission(url)
  const error = new Error(
    `Content script not available. This usually happens after granting new permissions. Please reload the page to continue.`
  )

  // Thêm metadata cho error handling
  error.isPermissionError = true
  error.needsReload = true
  error.requiredPermission = requiredPermission
  error.originalError = originalError

  return error
}

/**
 * Reload current active tab
 * @returns {Promise<boolean>} - True nếu reload thành công
 */
export async function reloadCurrentTab() {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (tab?.id) {
      await browser.tabs.reload(tab.id)
      return true
    }

    return false
  } catch (error) {
    console.error('[FirefoxPermissionService] Error reloading tab:', error)
    return false
  }
}
