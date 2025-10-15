// @ts-nocheck

// This store holds the UI state for filtering the archive view.

/**
 * The ID of the tag currently used for filtering. 
 * null = No filter, show all.
 */
export let selectedTagId = $state(null);

/**
 * Updates the filter to a new tag ID.
 * @param {string | null} tagId - The ID of the tag to filter by, or null to clear the filter.
 */
export function setTagFilter(tagId) {
  selectedTagId = tagId;
}