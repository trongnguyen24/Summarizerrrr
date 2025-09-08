// @ts-nocheck
/**
 * Hệ thống báo lỗi đơn giản - thay thế cho hệ thống phức tạp trước đây
 * Chỉ lấy message từ AI SDK và hiển thị tất cả gợi ý sửa lỗi chung
 */

/**
 * Danh sách tất cả gợi ý sửa lỗi - không phân loại theo error type
 */
export const ERROR_SUGGESTIONS = [
  'Check your API key is correctly configured in settings',
  'Verify your internet connection is stable',
  'Try refreshing the page and retry the operation',
  'Check if you have reached your API usage limits',
  'Ensure the webpage content is accessible',
  'Try switching to a different AI provider if available',
  'Wait a few moments and try again',
  'Check browser permissions if needed',
  'Verify the content type is supported',
  'Contact support if the problem persists',
]

/**
 * Xử lý lỗi đơn giản - chỉ trả về message và danh sách gợi ý
 * @param {Error | any} error - Lỗi từ AI SDK hoặc bất kỳ nguồn nào
 * @param {object} [context={}] - Context bổ sung (optional)
 * @returns {{message: string, suggestions: string[], canRetry: boolean, context: object}}
 */
export function handleError(error, context = {}) {
  // Lấy message trực tiếp từ error
  const message =
    error?.message || error?.toString() || 'An unexpected error occurred'

  // Luôn cho phép retry để đơn giản
  const canRetry = true

  // Enhanced console log để debug

  // Log để track error object creation

  const errorObject = {
    message,
    suggestions: ERROR_SUGGESTIONS,
    canRetry,
    context,
  }

  // Log final error object

  return errorObject
}

/**
 * Helper function để log lỗi đơn giản
 * @param {object} errorInfo - Thông tin lỗi từ handleError
 * @param {Error} originalError - Lỗi gốc
 */
export function logError(errorInfo, originalError) {}
