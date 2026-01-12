// @ts-nocheck
/**
 * Per-Tab State Management Service
 * 
 * Instead of caching/restoring, each tab has its own state objects.
 * When tab switches, we just switch to that tab's state.
 * Streaming continues writing to original tab's state (no data loss).
 */

import { settings } from '@/stores/settingsStore.svelte.js'
import {
  createDefaultSummaryState,
  createDefaultDeepDiveState
} from '@/lib/constants/initialStates.js'

// Map<tabId, {summaryState, deepDiveState, scrollY}>
const tabStates = new Map()

// Current active tab ID
let currentTabId = null



/**
 * Gets or creates state for a tab
 * @param {number} tabId - Browser tab ID
 * @returns {Object} Tab state containing summaryState and deepDiveState
 */
export function getOrCreateTabState(tabId) {
  if (!tabId) return null
  
  if (!tabStates.has(tabId)) {
    console.log(`[tabCacheService] Creating new state for tab ${tabId}`)
    tabStates.set(tabId, {
      summaryState: createDefaultSummaryState(),
      deepDiveState: createDefaultDeepDiveState(),
      scrollY: 0,
    })
  }
  
  return tabStates.get(tabId)
}

/**
 * Gets current tab ID
 * @returns {number|null}
 */
export function getCurrentTabId() {
  return currentTabId
}

/**
 * Sets current tab ID and returns the state for that tab
 * @param {number} tabId - New current tab ID
 * @returns {Object|null} Tab state or null if per-tab cache is disabled
 */
export function setCurrentTabId(tabId) {
  // Check if per-tab cache is enabled
  const perTabCacheEnabled = settings.tools?.perTabCache?.enabled ?? true
  
  if (!perTabCacheEnabled) {
    console.log('[tabCacheService] Per-tab cache disabled')
    return null
  }
  
  const previousTabId = currentTabId
  currentTabId = tabId
  
  // Save scroll position for previous tab
  if (previousTabId && previousTabId !== tabId && tabStates.has(previousTabId)) {
    tabStates.get(previousTabId).scrollY = window.scrollY || 0
    console.log(`[tabCacheService] Saved scroll ${tabStates.get(previousTabId).scrollY} for tab ${previousTabId}`)
  }
  
  console.log(`[tabCacheService] Switched from tab ${previousTabId} to tab ${tabId}`)
  
  return getOrCreateTabState(tabId)
}

/**
 * Gets scroll position for current tab
 * @returns {number}
 */
export function getCurrentTabScrollY() {
  if (!currentTabId || !tabStates.has(currentTabId)) return 0
  return tabStates.get(currentTabId).scrollY
}

/**
 * Clears state for a specific tab (e.g., when tab is closed)
 * @param {number} tabId - Browser tab ID
 */
export function clearTabState(tabId) {
  if (tabStates.has(tabId)) {
    console.log(`[tabCacheService] Cleared state for tab ${tabId}`)
    tabStates.delete(tabId)
  }
}

/**
 * Clears all tab states
 */
export function clearAllTabStates() {
  tabStates.clear()
  currentTabId = null
  console.log('[tabCacheService] Cleared all tab states')
}

/**
 * Gets tab state statistics (for debugging)
 * @returns {Object}
 */
export function getTabStateStats() {
  return {
    size: tabStates.size,
    tabIds: Array.from(tabStates.keys()),
    currentTabId,
  }
}

/**
 * Checks if a tab has any summary content
 * @param {number} tabId - Browser tab ID
 * @returns {boolean}
 */
export function tabHasSummary(tabId) {
  if (!tabStates.has(tabId)) return false
  const state = tabStates.get(tabId).summaryState
  return !!(state.summary || state.courseSummary || state.selectedTextSummary || state.customActionResult)
}
