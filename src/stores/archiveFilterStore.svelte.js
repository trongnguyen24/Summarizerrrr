// @ts-nocheck

// This store holds the UI state for filtering the archive view.

/**
 * The filter state object containing the selected tag ID.
 * null = No filter, show all.
 */
export const archiveFilterStore = $state({
  selectedTagId: null,
})

/**
 * Updates the filter to a new tag ID.
 * @param {string | null} tagId - The ID of the tag to filter by, or null to clear the filter.
 */
export function setTagFilter(tagId) {
  archiveFilterStore.selectedTagId = tagId
}

/**
 * Gets the current selected tag ID.
 * @returns {string | null} The current selected tag ID.
 */
export function getSelectedTagId() {
  return archiveFilterStore.selectedTagId
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
