<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import PlusIcon from '@/components/PlusIcon.svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { animate, waapi, eases, createSpring } from 'animejs'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { openDatabase, getAllSummaries } from '@/lib/indexedDBService'
  import { marked } from 'marked'
  import SidePanel from './SidePanel.svelte'

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

  $effect(() => {
    initialize2(document.getElementById('scroll-content'))

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
        if (list.length > 0) {
          selectedSummary = list[0] // Select the first summary by default
        }
      } catch (error) {
        console.error('Failed to initialize DB or load summaries:', error)
      }
    }
    initDbAndLoadSummaries()
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

<main
  class="flex text-sm relative min-w-4xl min-h-dvh bg-background text-text-primary"
>
  <button
    class="fixed top-4 left-10 translate-x-0.5 z-30 hover:bg-blackwhite/5 rounded-4xl p-1"
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
    class="top-0 p-0 w-80 relative h-screen z-20 bg-background overflow-hidden"
  >
    <div class="w-px absolute z-30 top-0 right-0 h-screen bg-border/70"></div>
    {#if isSidePanelVisible}
      <SidePanel {list} {selectedSummary} {selectSummary} />
    {/if}
  </div>

  <!-- Right Column -->
  <div
    id="scroll-content"
    class="flex-1 relative h-screen overflow-auto bg-surface-1 z-20 p-4 flex flex-col gap-2"
  >
    <!-- <PlusIcon /> -->

    {#if selectedSummary}
      <div class="prose w-full py-16 max-w-3xl prose-xs mx-auto">
        <div>
          <h1 class="mx-auto text-center text-2xl font-bold">
            {selectedSummary.title}
          </h1>
          <div
            class="font-mono text-text-muted text-xs flex gap-8 justify-center items-center"
          >
            <div class="flex justify-center items-center gap-1">
              <Icon height="16" width="16" icon="lucide:link" class="" />
              <a
                href={selectedSummary.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {selectedSummary.url.replace(/(^\w+:|^)\/\//, '').split('/')[0]}
              </a>
            </div>

            <div class="flex justify-center items-center gap-1">
              <Icon height="16" width="16" icon="lucide:clock" class="" />
              {formatDate(selectedSummary.date)}
            </div>
          </div>
          <div class="py-12" id="summary">
            {@html marked.parse(selectedSummary.summary)}
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
