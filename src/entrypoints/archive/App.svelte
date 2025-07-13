<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/PlusIcon.svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { animate, waapi, eases, createSpring } from 'animejs'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import {
    openDatabase,
    getAllSummaries,
    getAllHistory,
  } from '@/lib/indexedDBService'
  import SidePanel from './SidePanel.svelte'
  import TabNavigation from '@/components/TabNavigation.svelte'
  import { marked } from 'marked'

  import hljs from 'highlight.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
  } from '../../stores/themeStore.svelte.js'

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
      archiveList = await getAllSummaries()
      historyList = await getAllHistory()

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
        }
      }
    } catch (error) {
      console.error('Failed to initialize DB or load data:', error)
    }
  }

  $effect(() => {
    initialize2(document.body)
    loadData()
  })

  $effect(() => {
    if (selectedSummary) {
      document
        .querySelectorAll('.summary-content pre code')
        .forEach((block) => {
          hljs.highlightElement(block)
        })
    }
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    return () => {
      unsubscribeTheme()
    }
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

  const mainTabs = $derived([
    { id: 'history', label: 'History', show: true, isLoading: false },
    { id: 'archive', label: 'Archive', show: true, isLoading: false },
  ])
</script>

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
      <TabNavigation tabs={mainTabs} {activeTab} onSelectTab={selectTab} />
      <SidePanel
        list={activeTab === 'archive' ? archiveList : historyList}
        {selectedSummary}
        {selectSummary}
        {selectedSummaryId}
      />
    {/if}
  </div>

  <!-- Right Column -->
  <div
    class="flex-1 pl-0 relative transition-all bg-surface-1 duration-300 ease-out z-20 p-4 flex flex-col gap-2
    {isSidePanelVisible ? 'sm:pl-80' : ''}
    "
  >
    {#if selectedSummary}
      <div class="mx-auto p-8">
        <div>
          <div class="flex flex-col gap-2">
            <div
              class="font-mono text-text-muted text-xs flex gap-8 justify-center items-center"
            >
              <div class="flex justify-center items-center gap-1">
                <Icon height="16" width="16" icon="lucide:clock" class="" />
                {formatDate(selectedSummary.date)}
              </div>
              <div class="flex justify-center items-center gap-1">
                <Icon height="16" width="16" icon="lucide:link" class="" />
                <a
                  href={selectedSummary.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selectedSummary.url
                    ? selectedSummary.url
                        .replace(/(^\w+:|^)\/\//, '')
                        .split('/')[0]
                    : 'Unknown URL'}
                </a>
              </div>
            </div>
            <h1
              class="mx-auto my-0 p-0 max-w-3xl text-balance text-center text-3xl font-bold"
            >
              {selectedSummary.title}
            </h1>
          </div>
          <div
            class="prose w-full mx-auto py-16 max-w-3xl prose-xs pb-12 summary-content"
          >
            {#each selectedSummary.summaries as subSummary}
              <h2 class="text-xl font-semibold mt-8 mb-4">
                {subSummary.title}
              </h2>
              {@html marked.parse(subSummary.content)}
            {/each}
          </div>
        </div>
      </div>
    {:else}
      <p class="text-center text-text-secondary">No summary selected.</p>
    {/if}
  </div>
  <div
    class="top-stripes sticky top-0 w-8 h-screen border-l border-border/70"
  ></div>
</main>
