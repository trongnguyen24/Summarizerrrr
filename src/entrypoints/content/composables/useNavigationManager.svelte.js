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
   */
  startMonitoring() {
    if (this.isMonitoring) return

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', this.handlePopState.bind(this))

    // Override history methods to catch programmatic navigation
    this.overrideHistoryMethods()

    // Fallback: Periodic URL checking
    this.startPeriodicUrlCheck()

    this.isMonitoring = true
  }

  /**
   * Dừng monitoring navigation changes
   */
  stopMonitoring() {
    if (!this.isMonitoring) return

    window.removeEventListener('popstate', this.handlePopState.bind(this))

    // Restore original history methods
    window.history.pushState = this.originalPushState
    window.history.replaceState = this.originalReplaceState

    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval)
    }

    this.isMonitoring = false
  }

  /**
   * Override history methods để bắt navigation changes
   */
  overrideHistoryMethods() {
    const self = this

    window.history.pushState = function (...args) {
      const result = self.originalPushState.apply(this, args)
      self.handleUrlChange()
      return result
    }

    window.history.replaceState = function (...args) {
      const result = self.originalReplaceState.apply(this, args)
      self.handleUrlChange()
      return result
    }
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
   * Fallback: Periodic URL checking để bắt các trường hợp missed
   */
  startPeriodicUrlCheck() {
    this.urlCheckInterval = setInterval(() => {
      const newUrl = window.location.href
      if (newUrl !== this.currentUrl) {
        this.currentUrl = newUrl
        this.notifyUrlChange(newUrl)
      }
    }, 1000) // Check mỗi giây
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
