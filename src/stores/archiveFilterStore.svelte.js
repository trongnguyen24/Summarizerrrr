// @ts-nocheck

// This store holds the UI state for filtering the archive view.

/**
 * The filter state object containing the selected tag IDs.
 * empty array = No filter, show all.
 */
export const archiveFilterStore = $state({
  selectedTagIds: [],
})

/**
 * Updates the filter to a new tag ID (for backward compatibility).
 * @param {string | null} tagId - The ID of the tag to filter by, or null to clear the filter.
 */
export function setTagFilter(tagId) {
  archiveFilterStore.selectedTagIds = tagId ? [tagId] : []
}

/**
 * Toggle a tag in the filter selection.
 * @param {string} tagId - The ID of the tag to toggle.
 */
export function toggleTagFilter(tagId) {
  const index = archiveFilterStore.selectedTagIds.indexOf(tagId)
  if (index === -1) {
    // Add tag to selection
    archiveFilterStore.selectedTagIds = [
      ...archiveFilterStore.selectedTagIds,
      tagId,
    ]
  } else {
    // Remove tag from selection
    archiveFilterStore.selectedTagIds =
      archiveFilterStore.selectedTagIds.filter((id) => id !== tagId)
  }
}

/**
 * Clear all tag filters.
 */
export function clearAllTagFilters() {
  archiveFilterStore.selectedTagIds = []
}

/**
 * Gets the current selected tag IDs.
 * @returns {string[]} The current selected tag IDs array.
 */
export function getSelectedTagIds() {
  return archiveFilterStore.selectedTagIds
}

/**
 * Gets the current selected tag ID (for backward compatibility).
 * @returns {string | null} The current selected tag ID or null if multiple/none selected.
 */
export function getSelectedTagId() {
  return archiveFilterStore.selectedTagIds.length === 1
    ? archiveFilterStore.selectedTagIds[0]
    : null
}

/**
 * Check if a tag is currently selected.
 * @param {string} tagId - The ID of the tag to check.
 * @returns {boolean} True if the tag is selected.
 */
export function isTagSelected(tagId) {
  return archiveFilterStore.selectedTagIds.includes(tagId)
}

/**
 * Get the count of selected tags.
 * @returns {number} The number of selected tags.
 */
export function getSelectedTagCount() {
  return archiveFilterStore.selectedTagIds.length
}

/**
 * Store for tag refresh counter
 */
export const tagRefreshStore = $state({
  counter: 0,
})

/**
 * Triggers a refresh of tag counts in TagManagement component
 */
export function refreshTagCounts() {
  tagRefreshStore.counter++
}
