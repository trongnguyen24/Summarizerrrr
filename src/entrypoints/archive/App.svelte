<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/PlusIcon.svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { animate, waapi, eases, createSpring } from 'animejs'
  import Logdev from '@/components/settings/Logdev.svelte'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import {
    openDatabase,
    getAllSummaries,
    getAllHistory,
  } from '@/lib/indexedDBService'
  import SidePanel from './SidePanel.svelte'
  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
    themeSettings, // Import đối tượng themeSettings
    applyThemeToDocument, // Import applyThemeToDocument
  } from '../../stores/themeStore.svelte.js'
  import SummaryDisplay from '@/components/displays/SummaryDisplay.svelte'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  let isSidePanelVisible = $state(true)
  let sidePanel

  const options = {
    scrollbars: {
      visibility: 'auto',
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize2] = useOverlayScrollbars({
    options,
    defer: true,
  })

  let activeTab = $state('history') // Set history as default tab
  let archiveList = $state([])
  let historyList = $state([])
  let selectedSummary = $state(null)
  let selectedSummaryId = $state(null)

  async function loadData() {
    try {
      await openDatabase()
      archiveList = [...(await getAllSummaries())]
      historyList = [...(await getAllHistory())]

      const urlParams = new URLSearchParams(window.location.search)
      const idFromUrl = urlParams.get('summaryId')
      const tabFromUrl = urlParams.get('tab')

      if (tabFromUrl === 'archive') {
        activeTab = 'archive'
        if (idFromUrl) {
          selectedSummary = archiveList.find((s) => s.id === idFromUrl)
          selectedSummaryId = idFromUrl
        } else if (archiveList.length > 0) {
          selectedSummary = archiveList[0]
          selectedSummaryId = archiveList[0].id
          window.history.replaceState(
            {},
            '',
            `?tab=archive&summaryId=${archiveList[0].id}`
          )
        } else {
          selectedSummary = null
          selectedSummaryId = null
          window.history.replaceState({}, '', `?tab=archive`)
        }
      } else {
        // Default to history tab
        activeTab = 'history'
        if (idFromUrl) {
          selectedSummary = historyList.find((s) => s.id === idFromUrl)
          selectedSummaryId = idFromUrl
        } else if (historyList.length > 0) {
          selectedSummary = historyList[0]
          selectedSummaryId = historyList[0].id
          window.history.replaceState(
            {},
            '',
            `?tab=history&summaryId=${historyList[0].id}`
          )
        } else {
          selectedSummary = null
          selectedSummaryId = null
          window.history.replaceState({}, '', `?tab=history`)
        }
      }

      // Sau khi tải lại dữ liệu, kiểm tra xem selectedSummaryId có còn tồn tại không
      if (selectedSummaryId) {
        const currentList = activeTab === 'archive' ? archiveList : historyList
        const found = currentList.find((s) => s.id === selectedSummaryId)
        if (!found) {
          selectedSummary = null
          selectedSummaryId = null
          // Cập nhật URL nếu mục đã chọn không còn tồn tại
          window.history.replaceState({}, '', `?tab=${activeTab}`)
          // Chọn mục đầu tiên nếu có
          if (currentList.length > 0) {
            selectedSummary = currentList[0]
            selectedSummaryId = currentList[0].id
            window.history.replaceState(
              {},
              '',
              `?tab=${activeTab}&summaryId=${currentList[0].id}`
            )
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize DB or load data:', error)
    }
  }

  $effect(() => {
    // initialize2(document.body)
    loadData()
  })

  $effect(() => {
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    // $effect để tự động áp dụng theme khi themeSettings.theme thay đổi
    $effect(() => {
      applyThemeToDocument(themeSettings.theme)
    })

    return () => {
      unsubscribeTheme()
    }
  })

  loadSettings().then(() => {
    subscribeToSettingsChanges()
  })

  function showSidePanel() {
    if (sidePanel) {
      animate(sidePanel, {
        width: ['20rem'],
        duration: 200,
        ease: createSpring({ stiffness: 125, damping: 14 }),
        alternate: false,
      })
    }
  }

  function hideSidePanel() {
    if (sidePanel) {
      animate(sidePanel, {
        width: [0],
        duration: 300,
        ease: 'outExpo',
        alternate: false,
        delay: 0,
      })
    }
  }

  function selectSummary(summary) {
    selectedSummary = summary
    selectedSummaryId = summary.id
    window.history.pushState(
      {},
      '',
      `?tab=${activeTab}&summaryId=${summary.id}`
    )
  }

  function selectTab(tabName) {
    activeTab = tabName
    selectedSummary = null // Clear selected summary when changing tabs
    selectedSummaryId = null
    window.history.replaceState({}, '', `?tab=${tabName}`)
    // Select the first item of the new tab if available
    if (tabName === 'history' && historyList.length > 0) {
      selectedSummary = historyList[0]
      selectedSummaryId = historyList[0].id
      window.history.replaceState(
        {},
        '',
        `?tab=history&summaryId=${historyList[0].id}`
      )
    } else if (tabName === 'archive' && archiveList.length > 0) {
      selectedSummary = archiveList[0]
      selectedSummaryId = archiveList[0].id
      window.history.replaceState(
        {},
        '',
        `?tab=archive&summaryId=${archiveList[0].id}`
      )
    }
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

  function toggleSidePanel() {
    isSidePanelVisible = !isSidePanelVisible
    if (isSidePanelVisible) {
      showSidePanel()
    } else {
      hideSidePanel()
    }
  }
</script>

<Logdev />

<main class="flex text-sm relative min-h-dvh bg-background text-text-primary">
  <button
    class="fixed top-4 left-10 translate-x-0.5 z-50 hover:bg-blackwhite/5 rounded-4xl p-1"
    onclick={() => toggleSidePanel()}
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
    {isSidePanelVisible ? 'sm:pl-80' : ''}
    "
  >
    <SummaryDisplay {selectedSummary} {formatDate} />
  </div>
  <div
    class="top-stripes sticky top-0 w-8 h-screen border-l border-border/70"
  ></div>
</main>
