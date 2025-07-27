<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { onStorageChange } from '@/services/chromeService'
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
  import '@fontsource/mali'
  import { formatDate } from '@/lib/utils.js'
  import { archiveStore } from '../../stores/archiveStore.svelte.js'
  import { animationService } from '../../services/animationService.js'

  // State management
  let isSidePanelVisible = $state(true)
  let sidePanel

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

  // Event handlers
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
    archiveStore.loadData()

    // Listen for archive updates
    onStorageChange((changes, areaName) => {
      if (areaName === 'sync' && changes.data_updated_at) {
        console.log('Data updated, reloading data...')
        archiveStore.loadData()
      }
    })
  })

  $effect(() => {
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    return unsubscribeTheme
  })

  $effect(() => {
    archiveStore.validateSelectedItem()
  })

  loadSettings().then(() => {
    subscribeToSettingsChanges()
  })
</script>

<!--
<Logdev /> -->

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
    class="top-stripes sticky shrink-0 top-0 w-8 h-screen border-r border-border/70"
  ></div>

  <div
    bind:this={sidePanel}
    class="top-0 p-0 w-80 fixed left-8 h-screen max-h-screen z-40 bg-background overflow-hidden"
  >
    <div class="w-px absolute z-30 top-0 right-0 h-screen bg-border/70"></div>

    {#if isSidePanelVisible}
      <SidePanel
        list={archiveStore.activeTab === 'archive'
          ? archiveStore.archiveList
          : archiveStore.historyList}
        selectedSummary={archiveStore.selectedSummary}
        selectSummary={archiveStore.selectSummary}
        selectedSummaryId={archiveStore.selectedSummaryId}
        activeTab={archiveStore.activeTab}
        selectTab={archiveStore.selectTab}
        onRefresh={archiveStore.loadData}
      />
    {/if}
  </div>

  <!-- Right Column -->
  <div
    class="flex-1 relative pl-0 bg-surface-1 z-20 p-4 flex flex-col gap-2
    {isSidePanelVisible ? 'sm:pl-80' : ''}"
  >
    <SummaryDisplay
      selectedSummary={archiveStore.selectedSummary}
      {formatDate}
      activeTab={archiveStore.activeTab}
      archiveList={archiveStore.archiveList}
    />
    <div
      class="sticky bg-linear-to-t from-surface-1 to-surface-1/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-10 pointer-events-none"
    ></div>
  </div>

  <div
    class="top-stripes shrink-0 sticky top-0 w-8 h-screen border-l border-border/70"
  ></div>
</main>
