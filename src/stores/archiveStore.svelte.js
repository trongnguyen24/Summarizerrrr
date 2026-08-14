import {
  openDatabase,
  getAllSummaries,
  getAllHistory,
} from '@/lib/db/indexedDBService'
import {
  conversationArchiveStore,
  loadConversationArchive,
  selectConversation,
  clearConversationSelection,
} from '@/stores/conversationArchiveStore.svelte.js'
import { setKindFilter } from '@/stores/kindFilterStore.svelte.js'

let archiveList = $state([])
let historyList = $state([])
let selectedSummary = $state(null)
let selectedSummaryId = $state(null)
let selectedKind = $state(null) // 'summary' | 'chat' | null
let isDataLoaded = $state(false)

const VALID_TABS = ['history', 'archive']

/**
 * Legacy `?tab=conversations` links land on History with the Chats filter on,
 * so old bookmarks keep working after the tab was folded into the two lists.
 */
function normalizeTab(urlTab) {
  if (urlTab === 'conversations') return 'history'
  return VALID_TABS.includes(urlTab) ? urlTab : 'history'
}

function getUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    summaryId: params.get('summaryId'),
    conversationId: params.get('conversationId'),
    tab: params.get('tab'),
  }
}

function buildQuery(tab, { summaryId, conversationId } = {}) {
  const params = new URLSearchParams({ tab })
  if (summaryId) params.set('summaryId', summaryId)
  if (conversationId) params.set('conversationId', conversationId)
  return `?${params.toString()}`
}

function updateUrl(tab, params) {
  window.history.replaceState({}, '', buildQuery(tab, params))
}

function pushUrl(tab, params) {
  window.history.pushState({}, '', buildQuery(tab, params))
}

// --- Unified list ---------------------------------------------------------
// Summaries and chats live in separate object stores with different shapes, so
// they are unioned here at the view layer rather than in the database.
// See the invariant comment in lib/db/indexedDBService.js.

/** Stable identity for a row across the two record families. */
export function itemKey(item) {
  return item ? `${item.kind}:${item.id}` : null
}

function summaryRow(raw) {
  return { kind: 'summary', id: raw.id, title: raw.title, timestamp: raw.date, raw }
}

function chatRow(raw) {
  return { kind: 'chat', id: raw.id, title: raw.title, timestamp: raw.updatedAt, raw }
}

/**
 * The merged, newest-first list for a tab.
 * History shows every chat; Archive shows only chats flagged `archived`.
 * Timestamps are ISO strings on both sides, so a descending string compare
 * gives the same ordering as the `date` index the summary lists come from.
 */
function unifiedListFor(tab) {
  const summaries = (tab === 'archive' ? archiveList : historyList).map(summaryRow)
  const chats = conversationArchiveStore.conversationList
    .filter((conversation) => (tab === 'archive' ? conversation.archived === true : true))
    .map(chatRow)

  return [...summaries, ...chats].sort((left, right) =>
    String(right.timestamp || '').localeCompare(String(left.timestamp || '')),
  )
}

function currentSelectedKey() {
  if (selectedKind === 'chat') {
    const id = conversationArchiveStore.selectedConversationId
    return id ? `chat:${id}` : null
  }
  return selectedSummaryId ? `summary:${selectedSummaryId}` : null
}

function clearSelection() {
  selectedKind = null
  selectedSummary = null
  selectedSummaryId = null
  clearConversationSelection()
}

/**
 * Selects a row of either kind, keeping the two selection states mutually
 * exclusive so the detail pane can switch on `selectedKind` alone.
 */
async function applyItemSelection(item, tab, { push }) {
  const writeUrl = push ? pushUrl : updateUrl

  if (item.kind === 'chat') {
    // Load the transcript BEFORE flipping selectedKind, otherwise the detail
    // pane swaps to an empty ConversationTranscript for a frame.
    await selectConversation(item.raw)
    selectedSummary = null
    selectedSummaryId = null
    selectedKind = 'chat'
    writeUrl(tab, { conversationId: item.id })
    return
  }

  clearConversationSelection()
  selectedKind = 'summary'
  selectedSummary = item.raw
  selectedSummaryId = item.id
  writeUrl(tab, { summaryId: item.id })
}

function selectItem(item, tab) {
  return applyItemSelection(item, tab, { push: true })
}

async function loadData() {
  let scrollPosition = window.scrollY
  try {
    await openDatabase()
    // Filter out soft-deleted items (deleted: true)
    archiveList = [...(await getAllSummaries())].filter(item => !item.deleted)
    historyList = [...(await getAllHistory())].filter(item => !item.deleted)
    // Awaited here so a ?conversationId= deep link can resolve during init
    await loadConversationArchive()

    const { tab, summaryId, conversationId } = getUrlParams()
    const result = await initializeFromUrl(tab, summaryId, conversationId)

    // Mark data as loaded AFTER initialization is complete
    isDataLoaded = true

    return result
  } catch (error) {
    console.error('Failed to initialize DB or load data:', error)
    isDataLoaded = true // Still mark as loaded to prevent blocking
    return { activeTab: 'history' }
  } finally {
    window.scrollTo({ top: scrollPosition, behavior: 'instant' })
  }
}

async function initializeFromUrl(urlTab, urlSummaryId, urlConversationId) {
  const targetTab = normalizeTab(urlTab)
  if (urlTab === 'conversations') setKindFilter('chat')

  const currentList = unifiedListFor(targetTab)

  const requestedKey = urlConversationId
    ? `chat:${urlConversationId}`
    : urlSummaryId
      ? `summary:${urlSummaryId}`
      : null

  if (requestedKey) {
    const found = currentList.find((item) => itemKey(item) === requestedKey)
    if (found) {
      await applyItemSelection(found, targetTab, { push: false })
      return { activeTab: targetTab }
    }
  }

  if (currentList.length > 0) {
    await applyItemSelection(currentList[0], targetTab, { push: false })
  } else {
    clearSelection()
    updateUrl(targetTab)
  }

  return { activeTab: targetTab }
}

function validateSelectedItem(activeTab) {
  // Don't validate until data is loaded
  if (!isDataLoaded) return

  // IMPORTANT: Check if activeTab matches URL to avoid stale value issue
  // When isDataLoaded becomes true, effect may run with stale activeTab value
  // before App.svelte updates activeTab from loadData result
  const urlTab = getUrlParams().tab
  if (activeTab !== normalizeTab(urlTab)) return

  const currentList = unifiedListFor(activeTab)
  const selectedKey = currentSelectedKey()
  if (!selectedKey) return
  if (currentList.some((item) => itemKey(item) === selectedKey)) return

  // The selected record is gone (deleted, or unarchived off this tab)
  clearSelection()
  if (currentList.length > 0) {
    applyItemSelection(currentList[0], activeTab, { push: false })
  } else {
    updateUrl(activeTab)
  }
}

function selectTab(tabName) {
  clearSelection()

  const newList = unifiedListFor(tabName)
  if (newList.length > 0) {
    applyItemSelection(newList[0], tabName, { push: false })
  } else {
    updateUrl(tabName)
  }
}

/** Neighbour of the current selection in the merged list, or null at the edge. */
function neighbourItem(activeTab, delta) {
  const currentList = unifiedListFor(activeTab)
  const selectedKey = currentSelectedKey()
  if (currentList.length === 0 || !selectedKey) return null

  const currentIndex = currentList.findIndex((item) => itemKey(item) === selectedKey)
  if (currentIndex < 0) return null

  const targetIndex = currentIndex + delta
  if (targetIndex < 0 || targetIndex >= currentList.length) return null
  return currentList[targetIndex]
}

async function navigatePrevious(activeTab) {
  const target = neighbourItem(activeTab, -1)
  if (!target) return false
  await selectItem(target, activeTab)
  return true
}

async function navigateNext(activeTab) {
  const target = neighbourItem(activeTab, 1)
  if (!target) return false
  await selectItem(target, activeTab)
  return true
}

function canNavigatePrevious(activeTab) {
  return neighbourItem(activeTab, -1) !== null
}

function canNavigateNext(activeTab) {
  return neighbourItem(activeTab, 1) !== null
}

export const archiveStore = {
  get archiveList() {
    return archiveList
  },
  get historyList() {
    return historyList
  },
  get selectedSummary() {
    return selectedSummary
  },
  get selectedSummaryId() {
    return selectedSummaryId
  },
  get selectedKind() {
    return selectedKind
  },
  get selectedKey() {
    return currentSelectedKey()
  },
  unifiedListFor,
  loadData,
  selectItem,
  selectTab,
  validateSelectedItem,
  navigatePrevious,
  navigateNext,
  canNavigatePrevious,
  canNavigateNext,
}
