// @ts-nocheck
import { browser } from 'wxt/browser'
import {
  summaryState,
  globalStoreUpdate,
} from '@/stores/summaryStore.svelte.js'
import {
  getCurrentTabId,
  getTabSummaryStates,
} from '@/services/tabCacheService.js'

const LOADING_KEYS = [
  'isLoading',
  'isCourseSummaryLoading',
  'isCourseConceptsLoading',
  'isSelectedTextLoading',
  'isCustomActionLoading',
]

const ERROR_KEYS = [
  'summaryError',
  'courseSummaryError',
  'courseConceptsError',
  'selectedTextError',
  'customActionError',
]

/**
 * Mirrors each tab's summary progress onto that tab's own title (issue #78):
 * ⏳ while running, then ✅ or 🟥. The content script owns the actual title
 * rewrite (`lib/utils/titleStatus.js`); this only tells it which state to show.
 *
 * Must be called during component initialisation.
 */
export function syncTabTitleStatus() {
  // tabId -> its error values when the run started; absent = not running
  const running = new Map()

  function track(tabId, state) {
    if (LOADING_KEYS.some((key) => state[key])) {
      if (!running.has(tabId)) {
        running.set(
          tabId,
          ERROR_KEYS.map((key) => state[key]),
        )
        sendStatus(tabId, 'loading')
      }
      return
    }

    const errorsAtStart = running.get(tabId)
    if (!errorsAtStart) return
    running.delete(tabId)

    // handleError() builds a fresh object per failure, so compare by identity:
    // an error left over from an earlier run must not paint this one red.
    const failed = ERROR_KEYS.some(
      (key, i) => state[key] && state[key] !== errorsAtStart[i],
    )
    sendStatus(tabId, failed ? 'error' : 'done')
  }

  $effect(() => {
    // Background tabs' states are plain objects; their writes bump this.
    globalStoreUpdate.version

    const currentTabId = getCurrentTabId()
    for (const [tabId, state] of getTabSummaryStates()) {
      // The active tab's live values are in the reactive global state.
      track(tabId, tabId === currentTabId ? summaryState : state)
    }
  })
}

function sendStatus(tabId, status) {
  browser.tabs
    .sendMessage(tabId, { type: 'SET_TITLE_STATUS', status })
    .catch(() => {
      // No content script there (e.g. a Firefox site without access).
    })
}
