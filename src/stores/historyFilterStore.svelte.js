// @ts-nocheck

/**
 * History Filter Store
 * Manages filtering state for history tab
 * Separate from archive filter to avoid conflicts
 */

/**
 * The filter state object containing the selected content type.
 * null = No filter, show all.
 */
export const historyFilterStore = $state({
  selectedContentType: null, // null | 'youtube' | 'course' | 'website'
})

/**
 * Set the content type filter.
 * @param {string | null} contentType - The content type to filter by, or null to clear the filter.
 */
export function setContentTypeFilter(contentType) {
  historyFilterStore.selectedContentType = contentType
}

/**
 * Clear all content type filters.
 */
export function clearContentTypeFilter() {
  historyFilterStore.selectedContentType = null
}

/**
 * Gets the current selected content type.
 * @returns {string | null} The current selected content type or null if no filter.
 */
export function getSelectedContentType() {
  return historyFilterStore.selectedContentType
}

/**
 * Check if a content type is currently selected.
 * @param {string} contentType - The content type to check.
 * @returns {boolean} True if the content type is selected.
 */
export function isContentTypeSelected(contentType) {
  return historyFilterStore.selectedContentType === contentType
}

/**
 * Check if any filter is currently active.
 * @returns {boolean} True if any filter is active.
 */
export function hasActiveFilter() {
  return historyFilterStore.selectedContentType !== null
}

/**
 * Get filter status for debugging.
 * @returns {Object} Current filter status.
 */
export function getFilterStatus() {
  return {
    hasActiveFilter: hasActiveFilter(),
    selectedContentType: historyFilterStore.selectedContentType,
    availableTypes: ['youtube', 'course', 'website'],
  }
}
