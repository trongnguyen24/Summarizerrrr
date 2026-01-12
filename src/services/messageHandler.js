import {
  summaryState,
  summarizeSelectedText,
  resetDisplayState,
  updateVideoActiveStates,
  fetchAndSummarize,
  updateActiveCourseTab,
  updateActiveYouTubeTab,
} from '../stores/summaryStore.svelte.js'
import { deepDiveState, resetDeepDive } from '../stores/deepDiveStore.svelte.js'
import { settings } from '../stores/settingsStore.svelte.js'
import { setTabTitle } from '../stores/tabTitleStore.svelte.js'
import {
  getOrCreateTabState,
  setCurrentTabId,
  getCurrentTabId,
  getCurrentTabScrollY,
  checkAndResetTabState,
} from './tabCacheService.js'

/**
 * Syncs the global summaryState/deepDiveState with a tab's state
 * @param {Object} tabState - The tab's state object from tabCacheService
 */
function syncFromTabState(tabState) {
  if (!tabState) return
  
  // Copy all properties from tab's summaryState to global summaryState
  const srcSummary = tabState.summaryState
  Object.keys(srcSummary).forEach(key => {
    if (key !== 'abortController') {
      summaryState[key] = srcSummary[key]
    }
  })
  // AbortController should be null for switched-to tabs
  summaryState.abortController = null
  
  // Copy all properties from tab's deepDiveState to global deepDiveState
  const srcDeepDive = tabState.deepDiveState
  Object.keys(srcDeepDive).forEach(key => {
    deepDiveState[key] = srcDeepDive[key]
  })
  
  console.log('[messageHandler.js] Synced global state from tab state')
}

/**
 * Syncs the global summaryState/deepDiveState back to a tab's state
 * @param {Object} tabState - The tab's state object from tabCacheService
 */
function syncToTabState(tabState) {
  if (!tabState) return
  
  // Copy global summaryState to tab's state (except abortController)
  Object.keys(summaryState).forEach(key => {
    if (key !== 'abortController') {
      tabState.summaryState[key] = summaryState[key]
    }
  })
  
  // Copy global deepDiveState to tab's state
  Object.keys(deepDiveState).forEach(key => {
    tabState.deepDiveState[key] = deepDiveState[key]
  })
  
  console.log('[messageHandler.js] Synced tab state from global state')
}

/**
 * Handles tab switch with per-tab state management
 * @param {number} newTabId - The new tab ID being switched to
 */
function handleTabSwitch(newTabId) {
  const perTabCacheEnabled = settings.tools?.perTabCache?.enabled ?? true
  
  if (!perTabCacheEnabled) {
    console.log('[messageHandler.js] Per-tab cache disabled')
    return
  }
  
  const previousTabId = getCurrentTabId()
  
  // Same tab, no need to switch
  if (previousTabId === newTabId) {
    console.log('[messageHandler.js] Same tab, no switch needed')
    return
  }
  
  console.log(`[messageHandler.js] Switching from tab ${previousTabId} to tab ${newTabId}`)
  
  // Save current global state to previous tab's state (if exists)
  if (previousTabId) {
    const prevTabState = getOrCreateTabState(previousTabId)
    if (prevTabState) {
      syncToTabState(prevTabState)
      prevTabState.scrollY = window.scrollY || 0
    }
  }
  
  // Switch to new tab and get/create its state
  const newTabState = setCurrentTabId(newTabId)
  
  if (newTabState) {
    // Sync global state from new tab's state
    syncFromTabState(newTabState)
    
    // Restore scroll position after DOM update
    const scrollY = newTabState.scrollY || 0
    if (scrollY > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: 'instant' })
      })
    }
    
    console.log(`[messageHandler.js] Loaded state for tab ${newTabId}`, {
      hasSummary: !!summaryState.summary || !!summaryState.courseSummary,
      scrollY: scrollY,
    })
  }
}

function handleBackgroundMessage(request) {
  switch (request.action) {
    case 'tabUpdated':
    case 'currentTabInfo':
      console.log(
        `[messageHandler.js] Received ${request.action} message:`,
        request
      )
      
      // Handle per-tab state switching
      handleTabSwitch(request.tabId)
      
      // Handle auto-reset on navigation (URL change)
      if (request.tabUrl) {
        // request.tabUrl comes from background script's tabUpdated message
        const wasReset = checkAndResetTabState(request.tabId, request.tabUrl)
        
        // If state was reset and we are looking at this tab currently, update UI
        if (wasReset && request.tabId === getCurrentTabId()) {
          console.log('[messageHandler.js] State reset for current tab, syncing UI...')
          const tabState = getOrCreateTabState(request.tabId)
          syncFromTabState(tabState)
        }
      }
      
      // Always update tab title and video states
      setTabTitle(request.tabTitle)
      const isCourseActive = request.isUdemy || request.isCoursera
      updateVideoActiveStates(request.isYouTube, isCourseActive)
      break
    case 'displaySummary':
      console.log(
        '[messageHandler.js] Received displaySummary message:',
        request
      )
      summaryState.summary = request.summary
      summaryState.error = request.error ? request.summary : null
      break
    case 'udemyTranscriptAvailable':
      console.log(
        '[messageHandler.js] Received udemyTranscriptAvailable message:',
        request
      )
      summaryState.isCourseVideoActive = true
      summaryState.lastSummaryTypeDisplayed = 'course'
      updateActiveCourseTab('courseSummary')
      break
    case 'courseraContentAvailable':
      console.log(
        '[messageHandler.js] Received courseraContentAvailable message:',
        request
      )
      summaryState.isCourseVideoActive = true
      summaryState.lastSummaryTypeDisplayed = 'course'
      updateActiveCourseTab('courseSummary')
      break
    case 'summarizeSelectedText':
      console.log(
        '[messageHandler.js] Received summarizeSelectedText message:',
        request
      )
      // Scroll to top to show loading state when re-summarizing
      window.scrollTo({ top: 0, behavior: 'smooth' })
      resetDisplayState()
      summaryState.lastSummaryTypeDisplayed = 'selectedText'
      summarizeSelectedText(request.selectedText)
      break
    case 'summarizeCurrentPage':
      console.log(
        '[messageHandler.js] Received summarizeCurrentPage message:',
        request
      )
      // Scroll to top to show loading state when re-summarizing
      window.scrollTo({ top: 0, behavior: 'smooth' })
      resetDisplayState()
      if (request.isYouTube) {
        summaryState.lastSummaryTypeDisplayed = 'youtube'
        updateActiveYouTubeTab('youtubeSummary')
      } else if (request.isUdemy || request.isCoursera) {
        summaryState.lastSummaryTypeDisplayed = 'course'
        updateActiveCourseTab('courseSummary')
      } else {
        summaryState.lastSummaryTypeDisplayed = 'web'
      }
      fetchAndSummarize()
      break
    case 'PERMISSION_CHANGED':
      console.log(
        '[messageHandler.js] Received permission change message:',
        request
      )
      // This message is primarily handled by individual components
      // We just log it here for debugging purposes
      // Components like PermissionWarningPrompt will handle this directly
      break
    default:
      console.warn(
        '[messageHandler.js] Unknown message action:',
        request.action || request.type
      )
  }
}

export function setupMessageListener() {
  const port = browser.runtime.connect({ name: 'side-panel' })
  console.log('[messageHandler.js] Port connected to background script.')

  port.onMessage.addListener(handleBackgroundMessage)
  browser.runtime.onMessage.addListener(handleBackgroundMessage)
  // Request current tab info on sidepanel initialization
  // Use timeout to ensure port is fully registered in background script
  setTimeout(() => {
    console.log('[messageHandler.js] Requesting current tab info...')
    browser.runtime
      .sendMessage({ action: 'requestCurrentTabInfo' })
      .then(() => {
        console.log('[messageHandler.js] Tab info request sent successfully')
      })
      .catch((error) => {
        console.warn(
          '[messageHandler.js] Failed to request tab info on first try, retrying...',
          error
        )
        // Retry once after 500ms if first attempt fails
        setTimeout(() => {
          browser.runtime
            .sendMessage({ action: 'requestCurrentTabInfo' })
            .then(() => {
              console.log(
                '[messageHandler.js] Tab info request sent successfully on retry'
              )
            })
            .catch((retryError) => {
              console.error(
                '[messageHandler.js] Failed to request tab info after retry:',
                retryError
              )
            })
        }, 500)
      })
  }, 100)

  console.log('[messageHandler.js] Added fallback runtime.onMessage listener.')

  return () => {
    port.onMessage.removeListener(handleBackgroundMessage)
    port.disconnect()
    console.log('[messageHandler.js] Port disconnected from background script.')
    browser.runtime.onMessage.removeListener(handleBackgroundMessage)
    console.log(
      '[messageHandler.js] Removed fallback runtime.onMessage listener.'
    )
  }
}
