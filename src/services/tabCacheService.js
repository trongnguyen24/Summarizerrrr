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
  
  // Note: Scroll is saved by handleTabSwitch() in messageHandler.js
  // BEFORE this function is called, so no need to save here
  
  currentTabId = tabId
  
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
 * Saves scroll position for a specific tab
 * This is the ONLY place scroll is saved - called once before tab switch
 * @param {number} tabId - Tab ID to save scroll position for
 */
export function saveScrollForTab(tabId) {
  if (tabId && tabStates.has(tabId)) {
    const scrollY = window.scrollY || 0
    tabStates.get(tabId).scrollY = scrollY
    console.log(`[tabCacheService] Saved scrollY=${scrollY} for tab ${tabId}`)
  }
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
 * Gets list of tabs with summary including their titles
 * @returns {Promise<Array<{id: number, title: string, isActive: boolean}>>}
 */
export async function getTabsWithSummaryInfo() {
  const tabsWithSummary = getTabsWithSummary()
  const tabInfos = []
  
  for (const tabId of tabsWithSummary) {
    try {
      const tab = await browser.tabs.get(tabId)
      tabInfos.push({
        id: tabId,
        title: tab.title || 'Untitled',
        isActive: tabId === currentTabId
      })
    } catch (error) {
      // Tab might have been closed, skip it
      console.log(`[tabCacheService] Tab ${tabId} not found, skipping`)
    }
  }
  
  return tabInfos
}

/**
 * Navigates to a specific tab by ID
 * @param {number} targetTabId - Tab ID to navigate to
 * @returns {Promise<boolean>} True if navigation was successful
 */
export async function navigateToTab(targetTabId) {
  if (!targetTabId || targetTabId === currentTabId) return false
  
  try {
    await browser.tabs.update(targetTabId, { active: true })
    return true
  } catch (error) {
    console.error('[tabCacheService] Failed to navigate to tab:', error)
    return false
  }
}

/**
 * Navigates to the next tab with cached summary
 * @returns {Promise<number|null>} The tab ID navigated to, or null if none
 */
export async function navigateToNextCachedTab() {
  const tabsWithSummary = getTabsWithSummary()
  if (tabsWithSummary.length <= 1) return null
  
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
