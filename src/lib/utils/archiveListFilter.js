/**
 * Filtering for the merged archive/history list, shared by the side list
 * (what is rendered) and the arrow-key navigation (what can be stepped to), so
 * the two can never disagree about which rows are visible or in what order.
 *
 * Free-text search:
 *
 * Replaces the old YouTube / Website / Course content-type filter, which only
 * ever matched summaries. Searching the URL covers that use case ("youtube"
 * finds every video) and works for any site, not just three hard-coded kinds.
 *
 * Matching is case- and diacritic-insensitive, and every whitespace-separated
 * term must appear somewhere in the row (title or URL).
 */

/** Lowercase and strip combining marks, so "tiếng việt" matches "tieng viet". */
export function normalizeSearchText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

/** Splits a query into normalized terms; an empty array means "no search". */
export function parseSearchQuery(query) {
  return normalizeSearchText(query).split(/\s+/).filter(Boolean)
}

/**
 * Text a row can be found by. Chat records carry no URL of their own (their
 * page URLs live on the separate source snapshots), so chats match by title.
 * @param {{ title?: string, raw?: { url?: string } }} item
 */
function searchableText(item) {
  return normalizeSearchText(`${item?.title || ''} ${item?.raw?.url || ''}`)
}

/**
 * @param {Array} list - merged rows: { kind, id, title, timestamp, raw }
 * @param {string} query
 * @returns {Array} rows matching every term, in their original order
 */
export function filterBySearch(list, query) {
  const terms = parseSearchQuery(query)
  if (terms.length === 0) return list
  return list.filter((item) => {
    const haystack = searchableText(item)
    return terms.every((term) => haystack.includes(term))
  })
}

/**
 * Splits the list into the rows shown normally and the rows shown dimmed.
 * The kind filter and the search HIDE non-matching rows; the archive tag
 * filter only partitions them (matched first, the rest dimmed below).
 *
 * @param {Array} list - merged rows: { kind, id, title, timestamp, raw }
 * @param {{ activeTab: string, selectedKind?: string | null,
 *   selectedTagIds?: string[], searchQuery?: string }} filters
 * @returns {{ matchedItems: Array, unmatchedItems: Array }}
 */
export function categorizeArchiveList(
  list,
  { activeTab, selectedKind = null, selectedTagIds = [], searchQuery = '' },
) {
  const scoped = filterBySearch(
    (list || []).filter((item) => !selectedKind || item.kind === selectedKind),
    searchQuery,
  )

  // History has no tag filter; archive with no tags selected likewise
  if (activeTab === 'history' || selectedTagIds.length === 0) {
    return { matchedItems: scoped, unmatchedItems: [] }
  }

  const matchedItems = []
  const unmatchedItems = []
  for (const item of scoped) {
    const tags = item.raw?.tags
    const isMatched =
      Array.isArray(tags) && selectedTagIds.every((tagId) => tags.includes(tagId))
    ;(isMatched ? matchedItems : unmatchedItems).push(item)
  }
  return { matchedItems, unmatchedItems }
}

/** The rows in on-screen order, which is the order arrow keys step through. */
export function visibleArchiveList(list, filters) {
  const { matchedItems, unmatchedItems } = categorizeArchiveList(list, filters)
  return [...matchedItems, ...unmatchedItems]
}
