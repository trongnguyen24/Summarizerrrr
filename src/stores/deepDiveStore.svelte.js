// @ts-nocheck
import { settings } from './settingsStore.svelte.js'

/**
 * Deep Dive UI state management
 * Uses Svelte 5 $state for fine-grained reactivity
 */
export const deepDiveState = $state({
  isExpanded: false,
  isGenerating: false,
  isPreloading: false, // NEW: Loading before dialog opens
  questions: [],
  hasGenerated: false,
  error: null,

  // Context từ summary cuối cùng
  lastSummaryContent: '',
  lastPageTitle: '',
  lastPageUrl: '',
  lastSummaryLang: 'English',

  // UI state persistence
  customQuestion: '', // Persist custom input
  selectedQuestion: null, // Persist selected question

  // History tracking for avoiding duplicate questions
  questionHistory: [], // Array of arrays: [[q1, q2, q3], [q4, q5, q6], ...]
})

/**
 * Toggle expand/collapse Deep Dive panel
 */
export function toggleDeepDive() {
  deepDiveState.isExpanded = !deepDiveState.isExpanded
  console.log('[deepDiveStore] Toggled:', deepDiveState.isExpanded)
}

/**
 * Set generated questions
 * @param {Array<string>} questions - Array of generated questions
 */
export function setQuestions(questions) {
  deepDiveState.questions = questions
  deepDiveState.hasGenerated = true
  console.log('[deepDiveStore] Questions set:', questions.length)
}

/**
 * Update summary context for lazy generation
 * @param {string} content - Summary content
 * @param {string} title - Page title
 * @param {string} url - Page URL
 * @param {string} lang - Summary language
 */
export function updateSummaryContext(content, title, url, lang) {
  deepDiveState.lastSummaryContent = content
  deepDiveState.lastPageTitle = title
  deepDiveState.lastPageUrl = url
  deepDiveState.lastSummaryLang = lang
  console.log('[deepDiveStore] Context updated:', { title, url, lang })
}

/**
 * Reset Deep Dive state (khi start summarization mới)
 */
export function resetDeepDive() {
  deepDiveState.isExpanded = false
  deepDiveState.isGenerating = false
  deepDiveState.questions = []
  deepDiveState.hasGenerated = false
  deepDiveState.error = null
  deepDiveState.lastSummaryContent = ''
  deepDiveState.lastPageTitle = ''
  deepDiveState.lastPageUrl = ''
  deepDiveState.lastSummaryLang = 'English'
  deepDiveState.customQuestion = ''
  deepDiveState.selectedQuestion = null
  deepDiveState.questionHistory = []
  console.log('[deepDiveStore] Reset')
}

/**
 * Set generating state
 * @param {boolean} isGenerating - Generating state
 */
export function setGenerating(isGenerating) {
  deepDiveState.isGenerating = isGenerating
}

/**
 * Set error
 * @param {string|null} error - Error message
 */
export function setError(error) {
  deepDiveState.error = error
}

/**
 * Start pre-loading questions (before opening dialog)
 */
export function startPreloading() {
  deepDiveState.isPreloading = true
  deepDiveState.isGenerating = true
  deepDiveState.error = null
  console.log('[deepDiveStore] Start preloading')
}

/**
 * Finish pre-loading and open dialog
 */
export function finishPreloadingAndOpen() {
  deepDiveState.isPreloading = false
  deepDiveState.isGenerating = false
  deepDiveState.isExpanded = true
  console.log('[deepDiveStore] Finish preloading, open dialog')
}

/**
 * Cancel pre-loading
 */
export function cancelPreloading() {
  deepDiveState.isPreloading = false
  deepDiveState.isGenerating = false
  console.log('[deepDiveStore] Cancel preloading')
}

/**
 * Set custom question
 * @param {string} value - Custom question text
 */
export function setCustomQuestion(value) {
  deepDiveState.customQuestion = value
}

/**
 * Set selected question
 * @param {string|null} question - Selected question or null
 */
export function setSelectedQuestion(question) {
  deepDiveState.selectedQuestion = question
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
 */
export function addToQuestionHistory(questions) {
  deepDiveState.questionHistory.push([...questions])
  console.log(
    '[deepDiveStore] Added to history, total generations:',
    deepDiveState.questionHistory.length
  )
}

/**
 * Clear question history (when new summary or reset)
 */
export function clearQuestionHistory() {
  deepDiveState.questionHistory = []
  console.log('[deepDiveStore] Cleared history')
}
