// @ts-nocheck
import { settings } from './settingsStore.svelte.js'

/**
 * Deep Dive UI state management
 * Uses Svelte 5 $state for fine-grained reactivity
 */
export const deepDiveState = $state({
  isExpanded: false,
  isGenerating: false,
  questions: [],
  hasGenerated: false,
  error: null,

  // Context từ summary cuối cùng
  lastSummaryContent: '',
  lastPageTitle: '',
  lastPageUrl: '',
  lastSummaryLang: 'English',
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
 * Check if Deep Dive should be shown
 * @returns {boolean} True if should show
 */
export function shouldShowDeepDive() {
  const toolEnabled = settings.tools?.deepDive?.enabled ?? false
  const hasContent = deepDiveState.lastSummaryContent.trim() !== ''
  return toolEnabled && hasContent
}
