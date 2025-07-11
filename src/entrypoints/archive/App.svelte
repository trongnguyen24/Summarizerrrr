<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/PlusIcon.svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { animate, waapi, eases, createSpring } from 'animejs'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { openDatabase, getAllSummaries } from '@/lib/indexedDBService'
  import SidePanel from './SidePanel.svelte'
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
  } from '../../stores/themeStore.svelte.js'

  let isSidePanelVisible = $state(true) // Thêm biến trạng thái để kiểm soát hiển thị sidepanel
  let sidePanel // Biến để bind với div của sidepanel

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

  let list = $state([])
  let selectedSummary = $state(null)
  let selectedSummaryId = $state(null) // Thêm biến trạng thái để lưu ID của tóm tắt được chọn

  $effect(() => {
    initialize2(document.body)

    async function initDbAndLoadSummaries() {
      try {
        await openDatabase()
        const summaries = await getAllSummaries()
        list = summaries.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          summary: s.summary,
          date: s.date,
        }))

        const urlParams = new URLSearchParams(window.location.search)
        const idFromUrl = urlParams.get('summaryId')

        if (idFromUrl) {
          selectedSummary = list.find((s) => s.id === idFromUrl)
          selectedSummaryId = idFromUrl
        } else if (list.length > 0) {
          selectedSummary = list[0] // Select the first summary by default
          selectedSummaryId = list[0].id
          window.history.replaceState({}, '', `?summaryId=${list[0].id}`)
        }
      } catch (error) {
        console.error('Failed to initialize DB or load summaries:', error)
      }
    }
    initDbAndLoadSummaries()
  })

  $effect(() => {
    if (selectedSummary) {
      // Đảm bảo DOM đã được cập nhật trước khi làm nổi bật
      document.querySelectorAll('#summary pre code').forEach((block) => {
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
    window.history.pushState({}, '', `?summaryId=${summary.id}`)
  }

  function formatDate(isoString) {
    const date = new Date(isoString)
    return date.toLocaleString('vi-VN', {
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
    class="top-0 p-0 w-80 fixed left-8 sm:sticky h-screen z-40 bg-background overflow-hidden"
  >
    <div class="w-px absolute z-30 top-0 right-0 h-screen bg-border/70"></div>
    {#if isSidePanelVisible}
      <SidePanel {list} {selectedSummary} {selectSummary} {selectedSummaryId} />
    {/if}
  </div>

  <!-- Right Column -->
  <div class="flex-1 relative bg-surface-1 z-20 p-4 flex flex-col gap-2">
    <!-- <PlusIcon /> -->

    {#if selectedSummary}
      <div class="mx-auto py-8">
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
            <h1 class="mx-auto my-0 p-0 text-center text-2xl font-bold">
              {selectedSummary.title}
            </h1>
          </div>
          <div
            class="prose w-full mx-auto py-16 max-w-3xl prose-xs pb-12"
            id="summary"
          >
            {@html selectedSummary.summary
              ? marked.parse(selectedSummary.summary)
              : ''}
          </div>
        </div>
      </div>
    {:else}
      <p class="text-center text-text-secondary">
        Không có tóm tắt nào được chọn.
      </p>
    {/if}
  </div>
  <div
    class="top-stripes sticky top-0 w-8 h-screen border-l border-border/70"
  ></div>
</main>
