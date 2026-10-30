// @ts-nocheck

/**
 * Kind Filter Store
 * Manages filtering state for record kind (summary vs chat).
 * Applies to BOTH the history and archive tabs, which is why it is separate
 * from historyFilterStore (content type) and archiveFilterStore (tags) —
 * those are each bound to a single tab.
 *
 * Unlike the other two filters, this one HIDES non-matching items instead of
 * dimming them.
 */

/**
 * The filter state object containing the selected record kind.
 * null = No filter, show all.
 */
export const kindFilterStore = $state({
  selectedKind: null, // null | 'summary' | 'chat'
})

/**
 * Set the kind filter.
 * @param {string | null} kind - The kind to filter by, or null to clear the filter.
 */
export function setKindFilter(kind) {
  kindFilterStore.selectedKind = kind
}

/**
 * Clear the kind filter.
 */
export function clearKindFilter() {
  kindFilterStore.selectedKind = null
}

/**
 * Gets the current selected kind.
 * @returns {string | null} The current selected kind or null if no filter.
 */
export function getSelectedKind() {
  return kindFilterStore.selectedKind
}

/**
 * Check if a kind is currently selected.
 * @param {string} kind - The kind to check.
 * @returns {boolean} True if the kind is selected.
 */
export function isKindSelected(kind) {
  return kindFilterStore.selectedKind === kind
}

/**
 * Check if the kind filter is currently active.
 * @returns {boolean} True if a kind filter is active.
 */
export function hasActiveKindFilter() {
  return kindFilterStore.selectedKind !== null
}
