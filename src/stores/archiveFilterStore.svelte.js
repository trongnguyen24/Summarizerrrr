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
  console.log('🏷️ DEBUG: setTagFilter called with tagId:', tagId)
  archiveFilterStore.selectedTagId = tagId
  console.log(
    '🏷️ DEBUG: selectedTagId updated to:',
    archiveFilterStore.selectedTagId
  )
}

/**
 * Gets the current selected tag ID.
 * @returns {string | null} The current selected tag ID.
 */
export function getSelectedTagId() {
  return archiveFilterStore.selectedTagId
}
