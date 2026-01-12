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
      currentUrl: null,
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

/**
 * Gets list of tab IDs that have summary content
 * @returns {number[]} Array of tab IDs with summaries
 */
export function getTabsWithSummary() {
  const tabsWithSummary = []
  for (const [tabId, state] of tabStates) {
    const summaryState = state.summaryState
    if (summaryState.summary || summaryState.courseSummary || summaryState.selectedTextSummary || summaryState.customActionResult) {
      tabsWithSummary.push(tabId)
    }
  }
  return tabsWithSummary
}

/**
 * Navigates to the next tab with cached summary
 * @returns {Promise<number|null>} The tab ID navigated to, or null if none
 */
export async function navigateToNextCachedTab() {
  const tabsWithSummary = getTabsWithSummary()
  if (tabsWithSummary.length <= 1) return null
  
  // Save scroll position for current tab before navigating
  if (currentTabId && tabStates.has(currentTabId)) {
    tabStates.get(currentTabId).scrollY = window.scrollY || 0
    console.log(`[tabCacheService] Saved scroll ${tabStates.get(currentTabId).scrollY} before nav from tab ${currentTabId}`)
  }
  
  const currentIndex = tabsWithSummary.indexOf(currentTabId)
  const nextIndex = (currentIndex + 1) % tabsWithSummary.length
  const nextTabId = tabsWithSummary[nextIndex]
  
  try {
    await browser.tabs.update(nextTabId, { active: true })
    return nextTabId
  } catch (error) {
    console.error('[tabCacheService] Failed to navigate to next tab:', error)
    return null
  }
}

/**
 * Navigates to the previous tab with cached summary
 * @returns {Promise<number|null>} The tab ID navigated to, or null if none
 */
export async function navigateToPreviousCachedTab() {
  const tabsWithSummary = getTabsWithSummary()
  if (tabsWithSummary.length <= 1) return null
  
  // Save scroll position for current tab before navigating
  if (currentTabId && tabStates.has(currentTabId)) {
    tabStates.get(currentTabId).scrollY = window.scrollY || 0
    console.log(`[tabCacheService] Saved scroll ${tabStates.get(currentTabId).scrollY} before nav from tab ${currentTabId}`)
  }
  
  const currentIndex = tabsWithSummary.indexOf(currentTabId)
  const prevIndex = currentIndex <= 0 ? tabsWithSummary.length - 1 : currentIndex - 1
  const prevTabId = tabsWithSummary[prevIndex]
  
  try {
    await browser.tabs.update(prevTabId, { active: true })
    return prevTabId
  } catch (error) {
    console.error('[tabCacheService] Failed to navigate to previous tab:', error)
    return null
  }
}

/**
 * Checks if URL has changed for a tab and resets state if auto-reset is enabled
 * @param {number} tabId - Browser tab ID
 * @param {string} newUrl - New URL to check against
 * @returns {boolean} True if state was reset
 */
export function checkAndResetTabState(tabId, newUrl) {
  if (!tabId || !tabStates.has(tabId)) return false
  
  const tabState = tabStates.get(tabId)
  
  // If no previous URL, just save current one
  if (!tabState.currentUrl) {
    tabState.currentUrl = newUrl
    return false
  }
  
  // Normalize URLs (ignore hash if needed, but for now exact match except maybe trailing slash)
  const currentUrl = tabState.currentUrl
  
  // If URL hasn't changed, do nothing
  if (currentUrl === newUrl) return false
  
  // URL changed
  console.log(`[tabCacheService] URL changed checking reset for tab ${tabId}: ${currentUrl} -> ${newUrl}`)
  
  // Check setting
  const autoReset = settings.tools?.perTabCache?.autoResetOnNavigation ?? true
  
  if (autoReset) {
    console.log(`[tabCacheService] Auto-resetting state for tab ${tabId}`)
    
    // Reset states
    tabState.summaryState = createDefaultSummaryState()
    tabState.deepDiveState = createDefaultDeepDiveState()
    tabState.scrollY = 0
    
    // Update URL
    tabState.currentUrl = newUrl
    
    return true
  }
  
  // If auto-reset disabled, just update URL tracking (or maybe keep old one? updating seems safer to avoid permanent mismatch)
  // Updating URL allows next navigation to be detected correctly
  tabState.currentUrl = newUrl
  return false
}
