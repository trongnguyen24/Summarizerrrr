// @vitest-environment jsdom

/**
 * Guards the merged archive list.
 *
 * The archive page used to keep summaries and chats in two parallel tabs with
 * two independent selection states. They are now unioned into one list per tab
 * at the view layer — the records still live in separate object stores, so the
 * ordering, the History/Archive split, and the kind-aware selection all exist
 * only in archiveStore and are easy to regress.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = vi.hoisted(() => ({ summaries: [], history: [] }))

vi.mock('@/lib/db/indexedDBService', () => ({
  openDatabase: vi.fn(async () => ({})),
  getAllSummaries: vi.fn(async () => db.summaries),
  getAllHistory: vi.fn(async () => db.history),
}))

const chats = vi.hoisted(() => ({
  list: [],
  selectedId: null,
}))

vi.mock('@/stores/conversationArchiveStore.svelte.js', () => ({
  conversationArchiveStore: {
    get conversationList() {
      return chats.list
    },
    get selectedConversationId() {
      return chats.selectedId
    },
  },
  loadConversationArchive: vi.fn(async () => chats.list),
  selectConversation: vi.fn(async (conversation) => {
    chats.selectedId = conversation.id
  }),
  clearConversationSelection: vi.fn(() => {
    chats.selectedId = null
  }),
}))

const { archiveStore, itemKey } = await import('@/stores/archiveStore.svelte.js')
const { kindFilterStore, setKindFilter, clearKindFilter } = await import(
  '@/stores/kindFilterStore.svelte.js'
)

/** Lets a fire-and-forget selection (selectTab / validateSelectedItem) settle. */
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// Interleaved on purpose: sorting by timestamp is the whole point of the merge.
function seed() {
  db.history = [
    { id: 'h1', title: 'Newest summary', date: '2026-08-03T10:00:00.000Z', contentType: 'youtube' },
    { id: 'h2', title: 'Older summary', date: '2026-08-01T10:00:00.000Z', contentType: 'website' },
  ]
  db.summaries = [
    { id: 's1', title: 'Archived summary', date: '2026-08-02T10:00:00.000Z', tags: ['t1'] },
  ]
  chats.list = [
    { id: 'c1', title: 'Active chat', updatedAt: '2026-08-02T12:00:00.000Z', archived: false },
    { id: 'c2', title: 'Archived chat', updatedAt: '2026-07-30T12:00:00.000Z', archived: true },
  ]
  chats.selectedId = null
}

beforeEach(async () => {
  seed()
  clearKindFilter()
  window.history.replaceState({}, '', '/')
  await archiveStore.loadData()
})

describe('unifiedListFor', () => {
  it('interleaves summaries and chats newest-first on the history tab', () => {
    expect(archiveStore.unifiedListFor('history').map(itemKey)).toEqual([
      'summary:h1', // 08-03 10:00
      'chat:c1', //    08-02 12:00
      'summary:h2', // 08-01 10:00
      'chat:c2', //    07-30 12:00
    ])
  })

  it('shows only archived chats on the archive tab', () => {
    const keys = archiveStore.unifiedListFor('archive').map(itemKey)
    expect(keys).toContain('chat:c2')
    expect(keys).not.toContain('chat:c1')
    // and summaries come from the summaries store, not history
    expect(keys).toContain('summary:s1')
    expect(keys).not.toContain('summary:h1')
  })

  it('reads chat timestamps from updatedAt, not date', () => {
    const chat = archiveStore
      .unifiedListFor('history')
      .find((item) => item.id === 'c1')
    expect(chat.timestamp).toBe('2026-08-02T12:00:00.000Z')
    expect(chat.kind).toBe('chat')
  })
})

describe('kind-aware selection', () => {
  it('auto-selects the newest row across both kinds', () => {
    expect(archiveStore.selectedKey).toBe('summary:h1')
    expect(archiveStore.selectedKind).toBe('summary')
  })

  it('switches the detail kind and clears the other selection', async () => {
    const chat = archiveStore
      .unifiedListFor('history')
      .find((item) => item.kind === 'chat')

    await archiveStore.selectItem(chat, 'history')

    expect(archiveStore.selectedKind).toBe('chat')
    expect(archiveStore.selectedKey).toBe('chat:c1')
    // the summary side must be released, otherwise both panes think they own it
    expect(archiveStore.selectedSummary).toBeNull()
    expect(archiveStore.selectedSummaryId).toBeNull()
    expect(new URLSearchParams(window.location.search).get('conversationId')).toBe('c1')
  })

  it('releases the chat selection when a summary is picked', async () => {
    const list = archiveStore.unifiedListFor('history')
    await archiveStore.selectItem(list.find((item) => item.kind === 'chat'), 'history')
    await archiveStore.selectItem(list.find((item) => item.kind === 'summary'), 'history')

    expect(archiveStore.selectedKind).toBe('summary')
    expect(chats.selectedId).toBeNull()
    expect(new URLSearchParams(window.location.search).get('conversationId')).toBeNull()
  })
})

describe('keyboard navigation across kinds', () => {
  it('walks from a summary into a chat and back', async () => {
    expect(archiveStore.selectedKey).toBe('summary:h1')

    expect(await archiveStore.navigateNext('history')).toBe(true)
    expect(archiveStore.selectedKey).toBe('chat:c1')
    expect(archiveStore.selectedKind).toBe('chat')

    expect(await archiveStore.navigateNext('history')).toBe(true)
    expect(archiveStore.selectedKey).toBe('summary:h2')

    expect(await archiveStore.navigatePrevious('history')).toBe(true)
    expect(archiveStore.selectedKey).toBe('chat:c1')
  })

  it('stops at both edges of the merged list', async () => {
    expect(archiveStore.canNavigatePrevious('history')).toBe(false)
    expect(await archiveStore.navigatePrevious('history')).toBe(false)

    await archiveStore.navigateNext('history')
    await archiveStore.navigateNext('history')
    await archiveStore.navigateNext('history')
    expect(archiveStore.selectedKey).toBe('chat:c2')
    expect(archiveStore.canNavigateNext('history')).toBe(false)
    expect(await archiveStore.navigateNext('history')).toBe(false)
  })
})

describe('url handling', () => {
  it('restores a chat selection from ?conversationId', async () => {
    window.history.replaceState({}, '', '/?tab=history&conversationId=c2')
    const result = await archiveStore.loadData()

    expect(result.activeTab).toBe('history')
    expect(archiveStore.selectedKey).toBe('chat:c2')
  })

  it('maps the retired ?tab=conversations onto history + the chat filter', async () => {
    window.history.replaceState({}, '', '/?tab=conversations')
    const result = await archiveStore.loadData()

    expect(result.activeTab).toBe('history')
    expect(kindFilterStore.selectedKind).toBe('chat')
  })

  it('falls back to history for an unknown tab', async () => {
    window.history.replaceState({}, '', '/?tab=nonsense')
    expect((await archiveStore.loadData()).activeTab).toBe('history')
  })
})

describe('selectTab', () => {
  it('re-selects the newest row of the tab it moves to', () => {
    archiveStore.selectTab('archive')
    // 08-02 10:00 summary beats the 07-30 archived chat
    expect(archiveStore.selectedKey).toBe('summary:s1')
  })

  it('lands on a chat when it is the newest row of that tab', async () => {
    db.summaries = []
    await archiveStore.loadData()

    archiveStore.selectTab('archive')
    // selectTab is sync, but selecting a chat awaits its transcript first
    await flush()

    expect(archiveStore.selectedKey).toBe('chat:c2')
    expect(archiveStore.selectedKind).toBe('chat')
  })
})

describe('kind filter', () => {
  it('is the only filter that removes rows outright', () => {
    const all = archiveStore.unifiedListFor('history')

    setKindFilter('chat')
    const chatsOnly = all.filter(
      (item) => !kindFilterStore.selectedKind || item.kind === kindFilterStore.selectedKind,
    )
    expect(chatsOnly.map(itemKey)).toEqual(['chat:c1', 'chat:c2'])

    setKindFilter('summary')
    const summariesOnly = all.filter(
      (item) => !kindFilterStore.selectedKind || item.kind === kindFilterStore.selectedKind,
    )
    expect(summariesOnly.map(itemKey)).toEqual(['summary:h1', 'summary:h2'])
  })
})
