// @ts-nocheck
/**
 * URL Utilities for Settings Tab Routing
 * Handles URL parameters for tab navigation without page reload
 */

// Valid tab names
const VALID_TABS = ['ai-summary', 'fab', 'general', 'about']
const DEFAULT_TAB = 'ai-summary'

/**
 * Get tab parameter from current URL
 * @returns {string} Tab name or default if invalid/missing
 */
export function getTabFromURL() {
  try {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')

    if (tab && VALID_TABS.includes(tab)) {
      return tab
    }

    return DEFAULT_TAB
  } catch (error) {
    console.warn('Error reading tab from URL:', error)
    return DEFAULT_TAB
  }
}

/**
 * Update URL with new tab parameter without page reload
 * @param {string} tab - Tab name to set in URL
 */
export function updateURLTab(tab) {
  try {
    if (!VALID_TABS.includes(tab)) {
      console.warn(`Invalid tab: ${tab}. Using default.`)
      tab = DEFAULT_TAB
    }

    const url = new URL(window.location)
    url.searchParams.set('tab', tab)

    // Update URL without page reload
    window.history.pushState({ tab }, '', url.toString())
  } catch (error) {
    console.error('Error updating URL:', error)
  }
}

/**
 * Check if tab name is valid
 * @param {string} tab - Tab name to validate
 * @returns {boolean} True if valid tab
 */
export function isValidTab(tab) {
  return VALID_TABS.includes(tab)
}

/**
 * Get all valid tab names
 * @returns {string[]} Array of valid tab names
 */
export function getValidTabs() {
  return [...VALID_TABS]
}

/**
 * Get default tab name
 * @returns {string} Default tab name
 */
export function getDefaultTab() {
  return DEFAULT_TAB
}

/**
 * Setup popstate listener for browser back/forward navigation
 * @param {function} callback - Function to call when URL changes
 * @returns {function} Cleanup function to remove listener
 */
export function setupURLListener(callback) {
  const handlePopState = (event) => {
    const newTab = getTabFromURL()
    callback(newTab)
  }

  window.addEventListener('popstate', handlePopState)

  // Return cleanup function
  return () => {
    window.removeEventListener('popstate', handlePopState)
  }
}

/**
 * Navigate to specific tab (used for programmatic navigation)
 * @param {string} tab - Tab to navigate to
 * @param {function} setActiveTab - Function to update active tab state
 */
export function navigateToTab(tab, setActiveTab) {
  if (isValidTab(tab)) {
    setActiveTab(tab)
    updateURLTab(tab)
  } else {
    console.warn(`Cannot navigate to invalid tab: ${tab}`)
  }
}
