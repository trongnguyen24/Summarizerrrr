// @ts-nocheck

/**
 * Composable quản lý UI state cho FloatingPanel
 */
export function useFloatingPanelState() {
  // Active tab states cho FP displays (local, tránh summaryStore)
  let activeYouTubeTab = $state('videoSummary')
  let activeCourseTab = $state('courseSummary')

  /**
   * Reset tất cả tab states
   */
  function resetTabStates() {
    activeYouTubeTab = 'videoSummary'
    activeCourseTab = 'courseSummary'
  }

  /**
   * Set active YouTube tab
   * @param {string} tabId
   */
  function setActiveYouTubeTab(tabId) {
    activeYouTubeTab = tabId
  }

  /**
   * Set active course tab
   * @param {string} tabId
   */
  function setActiveCourseTab(tabId) {
    activeCourseTab = tabId
  }

  return {
    activeYouTubeTab: () => activeYouTubeTab,
    activeCourseTab: () => activeCourseTab,
    resetTabStates,
    setActiveYouTubeTab,
    setActiveCourseTab,
  }
}
