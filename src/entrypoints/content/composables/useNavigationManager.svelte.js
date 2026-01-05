// @ts-nocheck
import { browser } from '#imports'

/**
 * NavigationManager - Service để phát hiện và quản lý SPA navigation changes
 *
 * Giải quyết vấn đề: Trong React SPAs, khi navigation xảy ra thông qua JavaScript routing,
 * DOM không được reload nhưng URL thay đổi, khiến các content script components không phản ứng.
 *
 * Features:
 * - Phát hiện popstate events (back/forward navigation)
 * - Monitor pushState/replaceState calls (programmatic navigation)
 * - Track URL changes với fallback mechanisms
 * - Debouncing để tránh multiple reinitializations
 * - Cleanup và reinitialize components khi cần
 */

class NavigationManager {
  constructor() {
    this.currentUrl = window.location.href
    this.callbacks = new Set()
    this.isMonitoring = false
    this.debounceTimer = null
    this.debounceDelay = 100 // milliseconds

    // Store original history methods
    this.originalPushState = window.history.pushState
    this.originalReplaceState = window.history.replaceState
  }

  /**
   * Bắt đầu monitoring navigation changes
   * 
   * CẬP NHẬT: Không còn override History API để tránh conflict với
   * scroll restoration của trình duyệt và SPA như Reddit.
   */
  startMonitoring() {
    if (this.isMonitoring) return

    // Bind handlers một lần để có thể remove đúng cách
    this.boundHandlePopState = this.handlePopState.bind(this)
    
    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', this.boundHandlePopState)

    // KHÔNG override history methods nữa - gây conflict với scroll restoration
    // Thay vào đó, chỉ dựa vào popstate + periodic URL check
    // this.overrideHistoryMethods() // DISABLED

    // Fallback: Periodic URL checking (đủ nhanh để catch SPA navigation)
    this.startPeriodicUrlCheck()

    this.isMonitoring = true
  }

  /**
   * Dừng monitoring navigation changes
   */
  stopMonitoring() {
    if (!this.isMonitoring) return

    if (this.boundHandlePopState) {
      window.removeEventListener('popstate', this.boundHandlePopState)
    }

    // Cleanup URL check interval
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval)
      this.urlCheckInterval = null
    }

    this.isMonitoring = false
  }

  /**
   * [DEPRECATED] Override history methods để bắt navigation changes
   * 
   * CẢNH BÁO: Phương thức này đã bị vô hiệu hóa vì gây conflict với
   * scroll restoration của trình duyệt, đặc biệt trên các SPA như Reddit.
   * 
   * Thay vào đó, sử dụng periodic URL checking đủ nhanh (500ms) để phát hiện
   * navigation changes mà không can thiệp vào behavior gốc của trang.
   */
  overrideHistoryMethods() {
    // DEPRECATED - không sử dụng
    // Giữ lại method để backward compatibility nhưng không làm gì cả
    console.warn('[NavigationManager] overrideHistoryMethods is deprecated and disabled')
  }

  /**
   * Handle popstate events (back/forward navigation)
   */
  handlePopState(event) {
    this.handleUrlChange()
  }

  /**
   * Handle URL changes từ bất kỳ nguồn nào
   */
  handleUrlChange() {
    // Debounce multiple rapid URL changes
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      const newUrl = window.location.href

      // Chỉ trigger callback nếu URL thực sự thay đổi
      if (newUrl !== this.currentUrl) {
        this.currentUrl = newUrl
        this.notifyUrlChange(newUrl)
      }

      this.debounceTimer = null
    }, this.debounceDelay)
  }

  /**
   * Fallback: Periodic URL checking để sync internal state
   * 
   * CHÚ Ý: KHÔNG notify callbacks từ periodic check vì gây scroll issue
   * trên Reddit mobile. Callbacks chỉ được gọi từ popstate (back/forward).
   */
  startPeriodicUrlCheck() {
    this.urlCheckInterval = setInterval(() => {
      const newUrl = window.location.href
      if (newUrl !== this.currentUrl) {
        // CHỈ update internal state, KHÔNG notify
        this.currentUrl = newUrl
      }
    }, 1000)
  }

  /**
   * Notify tất cả subscribers về URL change
   */
  notifyUrlChange(newUrl) {
    // Gửi message đến background script để thông báo URL change
    browser.runtime
      .sendMessage({
        type: 'CONTENT_SCRIPT_URL_CHANGED',
        url: newUrl,
        timestamp: Date.now(),
      })
      .catch(() => {
        // Ignore errors - background script có thể không sẵn sàng
      })

    // Gọi tất cả callback functions
    this.callbacks.forEach((callback) => {
      try {
        callback(newUrl)
      } catch (error) {
        console.error('Error in navigation callback:', error)
      }
    })
  }

  /**
   * Subscribe to URL changes
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.callbacks.add(callback)
      return () => this.callbacks.delete(callback)
    }
    return () => {}
  }

  /**
   * Get current URL
   */
  getCurrentUrl() {
    return this.currentUrl
  }

  /**
   * Set debounce delay
   */
  setDebounceDelay(delay) {
    this.debounceDelay = delay
  }
}

// Export singleton instance
export const navigationManager = new NavigationManager()

// Export composable function cho Svelte
export function useNavigationManager() {
  return navigationManager
}
