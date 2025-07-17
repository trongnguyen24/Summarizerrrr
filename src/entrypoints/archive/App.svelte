<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { animate, createSpring } from 'animejs'
  import Logdev from '@/components/settings/Logdev.svelte'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import {
    openDatabase,
    getAllSummaries,
    getAllHistory,
  } from '@/lib/indexedDBService'
  import SidePanel from './SidePanel.svelte'
  import {
    loadSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
    themeSettings,
    applyThemeToDocument,
  } from '../../stores/themeStore.svelte.js'
  import SummaryDisplay from '@/components/displays/SummaryDisplay.svelte'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'

  // State management
  let isSidePanelVisible = $state(true)
  let sidePanel
  let activeTab = $state('history')
  let archiveList = $state([])
  let historyList = $state([])
  let selectedSummary = $state(null)
  let selectedSummaryId = $state(null)

  // Overlay scrollbars configuration
  const scrollOptions = {
    scrollbars: {
      visibility: 'auto',
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initializeScrollbars] = useOverlayScrollbars({
    options: scrollOptions,
    defer: true,
  })

  // Utility functions
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

  function formatDate(isoString) {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  // Data management
  async function loadData() {
    try {
      await openDatabase()
      archiveList = [...(await getAllSummaries())]
      historyList = [...(await getAllHistory())]

      const { tab, summaryId } = getUrlParams()
      await initializeFromUrl(tab, summaryId)
    } catch (error) {
      console.error('Failed to initialize DB or load data:', error)
    }
  }

  async function initializeFromUrl(urlTab, urlSummaryId) {
    const targetTab = urlTab === 'archive' ? 'archive' : 'history'
    activeTab = targetTab

    const currentList = targetTab === 'archive' ? archiveList : historyList

    if (urlSummaryId) {
      const found = currentList.find((s) => s.id === urlSummaryId)
      if (found) {
        selectedSummary = found
        selectedSummaryId = urlSummaryId
        return
      }
    }

    // Auto-select first item if available
    if (currentList.length > 0) {
      selectedSummary = currentList[0]
      selectedSummaryId = currentList[0].id
      updateUrl(targetTab, currentList[0].id)
    } else {
      selectedSummary = null
      selectedSummaryId = null
      updateUrl(targetTab)
    }
  }

  function validateSelectedItem() {
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

  // Animation service
  const animationService = {
    show(element) {
      if (!element) return
      animate(element, {
        width: ['20rem'],
        duration: 200,
        ease: createSpring({ stiffness: 125, damping: 14 }),
        alternate: false,
      })
    },

    hide(element) {
      if (!element) return
      animate(element, {
        width: [0],
        duration: 300,
        ease: 'outExpo',
        alternate: false,
      })
    },
  }

  // Event handlers
  function selectSummary(summary) {
    selectedSummary = summary
    selectedSummaryId = summary.id
    pushUrl(activeTab, summary.id)
  }

  function selectTab(tabName) {
    activeTab = tabName
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

  function toggleSidePanel() {
    isSidePanelVisible = !isSidePanelVisible
    if (isSidePanelVisible) {
      animationService.show(sidePanel)
    } else {
      animationService.hide(sidePanel)
    }
  }

  // Effects
  $effect(() => {
    initializeScrollbars(document.body)
    loadData()
  })

  $effect(() => {
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    $effect(() => {
      applyThemeToDocument(themeSettings.theme)
    })

    return unsubscribeTheme
  })

  $effect(() => {
    validateSelectedItem()
  })

  loadSettings().then(() => {
    subscribeToSettingsChanges()
  })
</script>

<Logdev />

<main class="flex text-sm relative min-h-dvh bg-background text-text-primary">
  <button
    class="fixed top-4 left-10 translate-x-0.5 z-50 hover:bg-blackwhite/5 rounded-4xl p-1"
    onclick={toggleSidePanel}
  >
    {#if isSidePanelVisible}
      <Icon icon="tabler:layout-sidebar-left-collapse" width="24" height="24" />
    {:else}
      <Icon
        icon="tabler:layout-sidebar-right-collapse"
        width="24"
        height="24"
      />
    {/if}
  </button>

  <!-- Left Column: Prompt Menu -->
  <div
    class="top-stripes sticky top-0 w-8 h-screen border-r border-border/70"
  ></div>

  <div
    bind:this={sidePanel}
    class="top-0 p-0 w-80 fixed left-8 h-screen max-h-screen z-40 bg-background overflow-hidden"
  >
    <div class="w-px absolute z-30 top-0 right-0 h-screen bg-border/70"></div>

    {#if isSidePanelVisible}
      <SidePanel
        list={activeTab === 'archive' ? archiveList : historyList}
        {selectedSummary}
        {selectSummary}
        {selectedSummaryId}
        {activeTab}
        {selectTab}
        onRefresh={loadData}
      />
    {/if}
  </div>

  <!-- Right Column -->
  <div
    class="flex-1 pl-0 relative bg-surface-1 z-20 p-4 flex flex-col gap-2
    {isSidePanelVisible ? 'sm:pl-80' : ''}"
  >
    <SummaryDisplay {selectedSummary} {formatDate} />
  </div>

  <div
    class="top-stripes sticky top-0 w-8 h-screen border-l border-border/70"
  ></div>
</main>
