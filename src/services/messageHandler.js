import {
  summaryState,
  summarizeSelectedText,
  resetDisplayState,
  updateVideoActiveStates,
  fetchAndSummarize,
  updateActiveCourseTab,
  updateActiveYouTubeTab,
} from '../stores/summaryStore.svelte.js'
import { setTabTitle } from '../stores/tabTitleStore.svelte.js'

function handleBackgroundMessage(request) {
  switch (request.action) {
    case 'tabUpdated':
    case 'currentTabInfo':
      console.log(
        `[messageHandler.js] Received ${request.action} message:`,
        request
      )
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
