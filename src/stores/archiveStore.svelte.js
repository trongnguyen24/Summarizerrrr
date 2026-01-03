import {
  openDatabase,
  getAllSummaries,
  getAllHistory,
} from '@/lib/db/indexedDBService'

let archiveList = $state([])
let historyList = $state([])
let selectedSummary = $state(null)
let selectedSummaryId = $state(null)
let isDataLoaded = $state(false)

function getUrlParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    summaryId: params.get('summaryId'),
    tab: params.get('tab'),
  }
}

function updateUrl(tab, summaryId = null) {
  const url = summaryId ? `?tab=${tab}&summaryId=${summaryId}` : `?tab=${tab}`
  window.history.replaceState({}, '', url)
}

function pushUrl(tab, summaryId) {
  window.history.pushState({}, '', `?tab=${tab}&summaryId=${summaryId}`)
}

async function loadData() {
  let scrollPosition = window.scrollY
  try {
    await openDatabase()
    // Filter out soft-deleted items (deleted: true)
    archiveList = [...(await getAllSummaries())].filter(item => !item.deleted)
    historyList = [...(await getAllHistory())].filter(item => !item.deleted)

    const { tab, summaryId } = getUrlParams()
    const result = await initializeFromUrl(tab, summaryId)
    
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

async function initializeFromUrl(urlTab, urlSummaryId) {
  const targetTab = urlTab === 'archive' ? 'archive' : 'history'
  const currentList = targetTab === 'archive' ? archiveList : historyList

  if (urlSummaryId) {
    const found = currentList.find((s) => s.id === urlSummaryId)
    if (found) {
      selectedSummary = found
      selectedSummaryId = urlSummaryId
      return { activeTab: targetTab }
    }
  }

  if (currentList.length > 0) {
    selectedSummary = currentList[0]
    selectedSummaryId = currentList[0].id
    updateUrl(targetTab, currentList[0].id)
  } else {
    selectedSummary = null
    selectedSummaryId = null
    updateUrl(targetTab)
  }

  return { activeTab: targetTab }
}

function validateSelectedItem(activeTab) {
  // Don't validate until data is loaded
  if (!isDataLoaded) return
  if (!selectedSummaryId) return

  // IMPORTANT: Check if activeTab matches URL to avoid stale value issue
  // When isDataLoaded becomes true, effect may run with stale activeTab value
  // before App.svelte updates activeTab from loadData result
  const urlTab = getUrlParams().tab
  const expectedTab = urlTab === 'archive' ? 'archive' : 'history'
  
  // Skip if activeTab doesn't match URL - this means activeTab hasn't been updated yet
  if (activeTab !== expectedTab) {
    return
  }

  const currentList = activeTab === 'archive' ? archiveList : historyList
  const found = currentList.find((s) => s.id === selectedSummaryId)

  if (!found) {
    selectedSummary = null
    selectedSummaryId = null
    updateUrl(activeTab)

    if (currentList.length > 0) {
      selectedSummary = currentList[0]
      selectedSummaryId = currentList[0].id
      updateUrl(activeTab, currentList[0].id)
    }
  }
}

function selectSummary(summary, activeTab) {
  selectedSummary = summary
  selectedSummaryId = summary.id
  pushUrl(activeTab, summary.id)
}

function selectTab(tabName) {
  selectedSummary = null
  selectedSummaryId = null

  const newList = tabName === 'archive' ? archiveList : historyList
  if (newList.length > 0) {
    selectedSummary = newList[0]
    selectedSummaryId = newList[0].id
    updateUrl(tabName, newList[0].id)
  } else {
    updateUrl(tabName)
  }
}

function navigatePrevious(activeTab) {
  const currentList = activeTab === 'archive' ? archiveList : historyList
  if (currentList.length === 0 || !selectedSummaryId) return false

  const currentIndex = currentList.findIndex((s) => s.id === selectedSummaryId)
  if (currentIndex > 0) {
    const prevItem = currentList[currentIndex - 1]
    selectedSummary = prevItem
    selectedSummaryId = prevItem.id
    pushUrl(activeTab, prevItem.id)
    return true
  }
  return false
}

function navigateNext(activeTab) {
  const currentList = activeTab === 'archive' ? archiveList : historyList
  if (currentList.length === 0 || !selectedSummaryId) return false

  const currentIndex = currentList.findIndex((s) => s.id === selectedSummaryId)
  if (currentIndex < currentList.length - 1) {
    const nextItem = currentList[currentIndex + 1]
    selectedSummary = nextItem
    selectedSummaryId = nextItem.id
    pushUrl(activeTab, nextItem.id)
    return true
  }
  return false
}

function canNavigatePrevious(activeTab) {
  const currentList = activeTab === 'archive' ? archiveList : historyList
  if (currentList.length === 0 || !selectedSummaryId) return false
  const currentIndex = currentList.findIndex((s) => s.id === selectedSummaryId)
  return currentIndex > 0
}

function canNavigateNext(activeTab) {
  const currentList = activeTab === 'archive' ? archiveList : historyList
  if (currentList.length === 0 || !selectedSummaryId) return false
  const currentIndex = currentList.findIndex((s) => s.id === selectedSummaryId)
  return currentIndex < currentList.length - 1
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
  loadData,
  selectSummary,
  selectTab,
  validateSelectedItem,
  navigatePrevious,
  navigateNext,
  canNavigatePrevious,
  canNavigateNext,
}
