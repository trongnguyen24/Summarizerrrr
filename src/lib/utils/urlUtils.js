// @ts-nocheck
/**
 * URL Utilities for Settings Tab Routing
 * Handles URL parameters for tab navigation without page reload
 */

// Valid tab names
const VALID_TABS = ['ai-summary', 'fab', 'general', 'tools', 'about']
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


