/**
 * Minimal stand-in for `stores/summaryStore` in tests. Lives in its own
 * `.svelte.js` module because `$state` may only initialize a declaration — it
 * cannot be written inline in a `vi.mock` factory.
 */
export const summaryState = $state({ isLoading: false, summaryError: null })

export const globalStoreUpdate = $state({ version: 0 })
