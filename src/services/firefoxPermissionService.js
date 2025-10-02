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

/**
 * Get current active tab info
 * @returns {Promise<Object|null>} - Tab info object hoặc null
 */
export async function getCurrentTabInfo() {
  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    return tab || null
  } catch (error) {
    console.error('[FirefoxPermissionService] Error getting tab info:', error)
    return null
  }
}

/**
 * Enhanced permission request với feedback
 * @param {string} url - URL cần permission
 * @returns {Promise<Object>} - Object chứa result và metadata
 */
export async function requestPermissionWithFeedback(url) {
  try {
    const permission = getRequiredPermission(url)
    const granted = await browser.permissions.request({
      origins: [permission],
    })

    return {
      granted,
      permission,
      needsReload: granted, // Nếu granted, có thể cần reload để inject scripts
      url,
    }
  } catch (error) {
    console.error(
      '[FirefoxPermissionService] Error requesting permission with feedback:',
      error
    )
    return {
      granted: false,
      error: error.message,
      permission: getRequiredPermission(url),
      url,
    }
  }
}

/**
 * Check multiple permissions at once
 * @param {string[]} urls - Array of URLs to check
 * @returns {Promise<Object>} - Object với permission status cho từng URL
 */
export async function checkMultiplePermissions(urls) {
  const results = {}

  for (const url of urls) {
    try {
      results[url] = await checkPermission(url)
    } catch (error) {
      console.error(
        `[FirefoxPermissionService] Error checking permission for ${url}:`,
        error
      )
      results[url] = false
    }
  }

  return results
}

/**
 * Phân tích lỗi permission và trả về thông tin để handle
 * @param {Error} error - Error object
 * @param {string} url - URL context
 * @returns {Object} - Error analysis object
 */
export function analyzePermissionError(error, url) {
  const errorMessage = error?.message || error?.toString() || ''

  if (
    errorMessage.includes('Permission denied') ||
    errorMessage.includes('permission denied')
  ) {
    return {
      type: 'PERMISSION_DENIED',
      isRecoverable: true,
      requiredPermission: getRequiredPermission(url),
      userAction: 'grant_permission',
      suggestion:
        'Click "Grant Permission" to enable summarization for this site.',
    }
  }

  if (isConnectionError(error)) {
    return {
      type: 'CONNECTION_ERROR',
      isRecoverable: true,
      needsReload: true,
      userAction: 'reload_page',
      suggestion: 'Page reload required to complete permission setup.',
    }
  }

  if (errorMessage.includes('Extension context invalidated')) {
    return {
      type: 'CONTEXT_INVALIDATED',
      isRecoverable: true,
      userAction: 'reload_extension',
      suggestion: 'Extension needs to be reloaded.',
    }
  }

  return {
    type: 'UNKNOWN_ERROR',
    isRecoverable: false,
    originalError: error,
    suggestion: 'An unexpected error occurred. Please try again.',
  }
}

/**
 * Constants cho error types
 */
export const PERMISSION_ERROR_TYPES = {
  PERMISSION_DENIED: {
    type: 'PERMISSION_DENIED',
    isRecoverable: true,
    userAction: 'grant_permission',
    defaultMessage: 'Permission required to access this website content.',
    suggestion:
      'Click "Grant Permission" to enable summarization for this site.',
  },

  CONNECTION_ERROR: {
    type: 'CONNECTION_ERROR',
    isRecoverable: true,
    userAction: 'reload_page',
    defaultMessage: 'Content script not available after permission change.',
    suggestion: 'Page reload required to complete permission setup.',
  },

  PERMISSION_GRANTED_NEEDS_RELOAD: {
    type: 'PERMISSION_GRANTED_NEEDS_RELOAD',
    isRecoverable: true,
    userAction: 'reload_page',
    defaultMessage: 'Permission granted successfully!',
    suggestion: 'Please reload the page to activate the extension.',
  },

  CONTEXT_INVALIDATED: {
    type: 'CONTEXT_INVALIDATED',
    isRecoverable: true,
    userAction: 'reload_extension',
    defaultMessage: 'Extension context was invalidated.',
    suggestion: 'Extension needs to be reloaded.',
  },
}
