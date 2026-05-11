// @ts-nocheck
/**
 * URL Utilities for Settings Tab Routing
 * Handles URL parameters for tab navigation without page reload
 */

// Valid tab names
const VALID_TABS = [
  'ai-provider',
  'summary',
  'appearance',
  'fab',
  'data-sync',
  'whats-new',
  'about',
]
const DEFAULT_TAB = 'ai-provider'

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
 * Update the tab parameter in current URL without page reload
 * @param {string} tab Tab name to set
 */
export function updateTabInURL(tab) {
  try {
    if (!VALID_TABS.includes(tab)) return

    const url = new URL(window.location)
    url.searchParams.set('tab', tab)
    window.history.replaceState({}, '', url)
  } catch (error) {
    console.warn('Error updating tab in URL:', error)
  }
}
