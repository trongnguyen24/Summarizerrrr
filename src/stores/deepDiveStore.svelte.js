// @ts-nocheck
import { settings } from './settingsStore.svelte.js'
import { createDefaultDeepDiveState } from '@/lib/constants/initialStates.js'
import {
  getOrCreateTabState,
  getCurrentTabId,
} from '@/services/tabCacheService.js'

/**
 * Deep Dive UI state management
 * Uses Svelte 5 $state for fine-grained reactivity
 */
export const deepDiveState = $state(createDefaultDeepDiveState())

/**
 * Helper to update Deep Dive state for a specific tab (and global if active)
 * @param {Object} updates - Key-value pairs to update
 * @param {number|null} targetTabId - Optional tab ID to target. Defaults to current.
 */
function updateDeepDive(updates, targetTabId = null) {
  const tabId = targetTabId || getCurrentTabId()
  const perTabCacheEnabled = settings.tools?.perTabCache?.enabled ?? true

  // 1. Update tab cache
  if (perTabCacheEnabled && tabId) {
    const tabState = getOrCreateTabState(tabId)
    if (tabState) {
      Object.assign(tabState.deepDiveState, updates)
    }
  }

  // 2. Update global state if active
  if (!perTabCacheEnabled || tabId === getCurrentTabId()) {
    Object.assign(deepDiveState, updates)
  }
}

/**
 * Toggle expand/collapse Deep Dive panel
 */
export function toggleDeepDive() {
  // Read current value from global state (which reflects current tab)
  const newValue = !deepDiveState.isExpanded
  updateDeepDive({ isExpanded: newValue })
  console.log('[deepDiveStore] Toggled:', newValue)
}

/**
 * Set generated questions
 * @param {Array<string>} questions - Array of generated questions
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function setQuestions(questions, targetTabId = null) {
  updateDeepDive({
    questions,
    hasGenerated: true
  }, targetTabId)
  console.log('[deepDiveStore] Questions set:', questions.length)
}

/**
 * Update summary context for lazy generation
 * @param {string} content - Summary content
 * @param {string} title - Page title
 * @param {string} url - Page URL
 * @param {string} lang - Summary language
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function updateSummaryContext(content, title, url, lang, targetTabId = null) {
  updateDeepDive({
    lastSummaryContent: content,
    lastPageTitle: title,
    lastPageUrl: url,
    lastSummaryLang: lang
  }, targetTabId)
  console.log('[deepDiveStore] Context updated:', { title, url, lang })
}

/**
 * Reset Deep Dive state (khi start summarization mới)
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function resetDeepDive(targetTabId = null) {
  updateDeepDive({
    isExpanded: false,
    isGenerating: false,
    questions: [],
    hasGenerated: false,
    error: null,
    lastSummaryContent: '',
    lastPageTitle: '',
    lastPageUrl: '',
    lastSummaryLang: 'English',
    customQuestion: '',
    selectedQuestion: null,
    questionHistory: [],
    currentPageIndex: 0
  }, targetTabId)
  console.log('[deepDiveStore] Reset')
}

/**
 * Set generating state
 * @param {boolean} isGenerating - Generating state
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function setGenerating(isGenerating, targetTabId = null) {
  updateDeepDive({ isGenerating }, targetTabId)
}

/**
 * Set error
 * @param {string|null} error - Error message
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function setError(error, targetTabId = null) {
  updateDeepDive({ error }, targetTabId)
}

/**
 * Start pre-loading questions (before opening dialog)
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function startPreloading(targetTabId = null) {
  updateDeepDive({
    isPreloading: true,
    isGenerating: true,
    error: null
  }, targetTabId)
  console.log('[deepDiveStore] Start preloading')
}

/**
 * Finish pre-loading and open dialog
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function finishPreloadingAndOpen(targetTabId = null) {
  updateDeepDive({
    isPreloading: false,
    isGenerating: false,
    isExpanded: true
  }, targetTabId)
  console.log('[deepDiveStore] Finish preloading, open dialog')
}

/**
 * Cancel pre-loading
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function cancelPreloading(targetTabId = null) {
  updateDeepDive({
    isPreloading: false,
    isGenerating: false
  }, targetTabId)
  console.log('[deepDiveStore] Cancel preloading')
}

/**
 * Set custom question
 * @param {string} value - Custom question text
 */
export function setCustomQuestion(value) {
  updateDeepDive({ customQuestion: value })
}

/**
 * Set selected question
 * @param {string|null} question - Selected question or null
 */
export function setSelectedQuestion(question) {
  updateDeepDive({ selectedQuestion: question })
}

/**
 * Check if Deep Dive should be shown
 * @returns {boolean} True if should show
 */
export function shouldShowDeepDive() {
  const toolEnabled = settings.tools?.deepDive?.enabled ?? false
  const hasContent = deepDiveState.lastSummaryContent.trim() !== ''
  return toolEnabled && hasContent
}

/**
 * Add generated questions to history
 * @param {Array<string>} questions - Questions to add
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function addToQuestionHistory(questions, targetTabId = null) {
  // Logic complex: need to read specific tab's history?
  // Since we rely on updateDeepDive to sync to tab cache, 
  // we must be careful. reading deepDiveState (global) might be wrong if targeting background tab.
  
  // Ideally we should get the current state from cache if targetTabId is provided.
  // But for simplicity, we assume this flow runs on active tab OR handled by caller correctly.
  
  // If we are backgrounded, deepDiveState reflects CURRENT tab (Tab B), not Target (Tab A).
  // Thus deepDiveState.questionHistory is Tab B's history.
  // THIS IS WRONG.
  
  // We need to fetch the history from the correct state source.
  
  const tabId = targetTabId || getCurrentTabId();
  const perTabCacheEnabled = settings.tools?.perTabCache?.enabled ?? true;
  
  let currentHistory = [];
  
  if (perTabCacheEnabled && tabId) {
      const tabState = getOrCreateTabState(tabId);
      // If we are targeting a background tab, read from cache
      if (tabState) {
          currentHistory = [...tabState.deepDiveState.questionHistory];
      } else {
         // Fallback to global if matched or empty
         currentHistory = [...deepDiveState.questionHistory];
      }
  } else {
       currentHistory = [...deepDiveState.questionHistory];
  }

  currentHistory.push([...questions])
  const newPageIndex = currentHistory.length - 1
  
  updateDeepDive({
      questionHistory: currentHistory,
      currentPageIndex: newPageIndex
  }, tabId)

  // Update visible questions too
  updateDeepDive({
      questions: currentHistory[newPageIndex],
      selectedQuestion: null,
      customQuestion: ''
  }, tabId)
  
  console.log(
    `[deepDiveStore] Added to history for tab ${tabId}, total pages:`,
    currentHistory.length
  )
}

/**
 * Clear question history (when new summary or reset)
 * @param {number|null} targetTabId - Optional target tab ID
 */
export function clearQuestionHistory(targetTabId = null) {
  updateDeepDive({
      questionHistory: [],
      currentPageIndex: 0
  }, targetTabId)
  console.log('[deepDiveStore] Cleared history')
}

/**
 * Set current page and update visible questions
 * @param {number} pageIndex - 0-based page index
 */
export function setCurrentPage(pageIndex) {
  const maxIndex = deepDiveState.questionHistory.length - 1

  // Validation
  if (deepDiveState.questionHistory.length === 0) {
    console.warn('[deepDiveStore] No pages in history')
    return
  }

  if (pageIndex < 0) {
    console.warn('[deepDiveStore] Page index below 0, clamping to 0')
    pageIndex = 0
  }

  if (pageIndex > maxIndex) {
    console.warn('[deepDiveStore] Page index too high, clamping to max')
    pageIndex = maxIndex
  }

  // Update state
  updateDeepDive({
      currentPageIndex: pageIndex,
      questions: deepDiveState.questionHistory[pageIndex],
      selectedQuestion: null,
      customQuestion: ''
  })

  console.log(
    `[deepDiveStore] Switched to page ${pageIndex + 1}/${maxIndex + 1}`
  )
}

/**
 * Navigate to next page
 */
export function nextPage() {
  const maxIndex = deepDiveState.questionHistory.length - 1
  if (deepDiveState.currentPageIndex < maxIndex) {
    setCurrentPage(deepDiveState.currentPageIndex + 1)
  }
}

/**
 * Navigate to previous page
 */
export function previousPage() {
  if (deepDiveState.currentPageIndex > 0) {
    setCurrentPage(deepDiveState.currentPageIndex - 1)
  }
}

/**
 * Get total number of pages
 * @returns {number} Total pages
 */
export function getTotalPages() {
  return deepDiveState.questionHistory.length
}
