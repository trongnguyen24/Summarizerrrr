import {
  openDatabase,
  getAllSummaries,
  getAllHistory,
} from '@/lib/db/indexedDBService'

let archiveList = $state([])
let historyList = $state([])
let selectedSummary = $state(null)
let selectedSummaryId = $state(null)

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
    archiveList = [...(await getAllSummaries())]
    historyList = [...(await getAllHistory())]

    const { tab, summaryId } = getUrlParams()
    const result = await initializeFromUrl(tab, summaryId)
    return result
  } catch (error) {
    console.error('Failed to initialize DB or load data:', error)
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
  if (!selectedSummaryId) return

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
}
