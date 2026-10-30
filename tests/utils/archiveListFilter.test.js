import { describe, it, expect } from 'vitest'
import {
  filterBySearch,
  parseSearchQuery,
  categorizeArchiveList,
  visibleArchiveList,
} from '@/lib/utils/archiveListFilter.js'

const rows = [
  { kind: 'summary', id: 1, title: 'AI, Machine Learning', raw: { url: 'https://www.youtube.com/watch?v=abc' } },
  { kind: 'summary', id: 2, title: 'Học tiếng Việt', raw: { url: 'https://example.com/blog' } },
  { kind: 'chat', id: 3, title: 'Chat about YouTube SEO', raw: {} },
  { kind: 'summary', id: 4, title: 'Course intro', raw: { url: 'https://www.udemy.com/course/x/learn/' } },
]

const ids = (list) => list.map((row) => row.id)

describe('archiveListFilter', () => {
  it('returns the list unchanged for an empty or blank query', () => {
    expect(filterBySearch(rows, '')).toBe(rows)
    expect(filterBySearch(rows, '   ')).toBe(rows)
  })

  it('matches the URL as well as the title, case-insensitively', () => {
    expect(ids(filterBySearch(rows, 'YOUTUBE'))).toEqual([1, 3])
    expect(ids(filterBySearch(rows, 'udemy'))).toEqual([4])
  })

  it('ignores Vietnamese diacritics', () => {
    expect(ids(filterBySearch(rows, 'tieng viet'))).toEqual([2])
    expect(ids(filterBySearch(rows, 'hoc'))).toEqual([2])
  })

  it('requires every term to match', () => {
    expect(ids(filterBySearch(rows, 'youtube machine'))).toEqual([1])
    expect(ids(filterBySearch(rows, 'youtube nothing'))).toEqual([])
  })

  it('tolerates rows without a url or title', () => {
    expect(filterBySearch([{ kind: 'chat', id: 9, raw: {} }], 'x')).toEqual([])
    expect(parseSearchQuery('  A  b ')).toEqual(['a', 'b'])
  })
})

describe('categorizeArchiveList', () => {
  const tagged = [
    { kind: 'summary', id: 1, title: 'YouTube A', raw: { url: 'youtube.com/1', tags: ['t1'] } },
    { kind: 'summary', id: 2, title: 'Blog B', raw: { url: 'blog.com', tags: [] } },
    { kind: 'chat', id: 3, title: 'YouTube chat', raw: {} },
    { kind: 'summary', id: 4, title: 'YouTube C', raw: { url: 'youtube.com/2' } },
  ]

  it('applies search and kind filter by hiding rows', () => {
    const filters = { activeTab: 'history', searchQuery: 'youtube' }
    expect(ids(visibleArchiveList(tagged, filters))).toEqual([1, 3, 4])
    expect(
      ids(visibleArchiveList(tagged, { ...filters, selectedKind: 'summary' })),
    ).toEqual([1, 4])
  })

  it('puts tag matches first on the archive tab, after search', () => {
    const result = categorizeArchiveList(tagged, {
      activeTab: 'archive',
      selectedTagIds: ['t1'],
      searchQuery: 'youtube',
    })
    expect(ids(result.matchedItems)).toEqual([1])
    expect(ids(result.unmatchedItems)).toEqual([3, 4])
  })

  it('ignores tag selection on the history tab', () => {
    const result = categorizeArchiveList(tagged, {
      activeTab: 'history',
      selectedTagIds: ['t1'],
    })
    expect(ids(result.matchedItems)).toEqual([1, 2, 3, 4])
  })
})
