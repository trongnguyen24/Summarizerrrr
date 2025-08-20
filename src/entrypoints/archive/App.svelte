<script>
  // @ts-nocheck
  import { onMount } from 'svelte'
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { appStateStorage } from '@/services/wxtStorageService.js'
  import SidePanel from './SidePanel.svelte'
  import { fade } from 'svelte/transition'
  import {
    settings,
    loadSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
    themeSettings,
    applyThemeToDocument,
  } from '@/stores/themeStore.svelte.js'
  import SummaryDisplay from '@/components/displays/archive/SummaryDisplay.svelte'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'
  import { formatDate } from '@/lib/utils/utils.js'
  import { archiveStore } from '@/stores/archiveStore.svelte.js'
  import { animationService } from '@/services/animationService.js'

  // State management
  let isSidePanelVisible = $state(window.innerWidth >= 768) // Initialize based on current window size
  let activeTab = $state('history') // Local state for active tab
  let sidePanel
  let isMobile = $state(window.innerWidth < 768) // Initialize mobile state immediately

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

  function handleResize() {
    const newIsMobile = window.innerWidth < 768
    if (newIsMobile !== isMobile) {
      isMobile = newIsMobile
      isSidePanelVisible = !isMobile // Set visibility based on screen size
    }
  }

  // Close sidepanel when clicking outside on mobile
  function handleOverlayClick() {
    if (isMobile && isSidePanelVisible) {
      toggleSidePanel()
    }
  }

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  // Effects
  $effect(() => {
    // Initialize OverlayScrollbars only on non-touch devices
    if (!isTouchDevice()) {
      initializeScrollbars(document.body)
    }
    archiveStore.loadData().then((result) => {
      if (result && result.activeTab) {
        activeTab = result.activeTab // Set initial activeTab from URL
      }
    })

    // Listen for archive updates
    const unsubscribe = appStateStorage.watch((newValue, oldValue) => {
      if (newValue && newValue.data_updated_at !== oldValue?.data_updated_at) {
        console.log('Data updated, reloading data...')
        archiveStore.loadData()
      }
    })

    // Initialize mobile state and listen for resize
    handleResize()
    window.addEventListener('resize', handleResize)

    // Return cleanup function
    return () => {
      unsubscribe()
      window.removeEventListener('resize', handleResize)
    }
  })

  $effect(() => {
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    return unsubscribeTheme
  })

  $effect(() => {
    archiveStore.validateSelectedItem(activeTab)
  })

  loadSettings().then(() => {
    subscribeToSettingsChanges()
  })
</script>

<!--
<Logdev /> -->

<main class="flex text-sm relative min-h-dvh bg-background text-text-primary">
  <!-- Overlay backdrop for mobile - click outside to close sidepanel -->
  {#if isMobile && isSidePanelVisible}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      transition:fade
      class="fixed top-0 bottom-0 left-3 right-3 sm:left-5 sm:right-5 bg-black/40 z-30"
      onclick={handleOverlayClick}
    ></div>
  {/if}

  <button
    class="fixed top-4 left-5 sm:left-7 md:left-10 translate-x-0.5 z-50 hover:bg-blackwhite/5 rounded-4xl p-1"
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
    class="top-stripes sticky shrink-0 top-0 w-3 sm:w-5 md:w-8 h-screen border-r border-border/70"
  ></div>

  <div
    bind:this={sidePanel}
    class="top-0 p-0 fixed left-3 sm:left-5 md:left-8 h-screen max-h-screen z-40 bg-background overflow-hidden"
  >
    <div class="w-px absolute z-30 top-0 right-0 h-screen bg-border/70"></div>

    {#if isSidePanelVisible}
      <SidePanel
        list={activeTab === 'archive'
          ? archiveStore.archiveList
          : archiveStore.historyList}
        selectedSummary={archiveStore.selectedSummary}
        selectSummary={(summary) => {
          archiveStore.selectSummary(summary, activeTab)
          // Auto-close sidepanel on mobile when selecting summary
          if (isMobile && isSidePanelVisible) {
            toggleSidePanel()
          }
        }}
        selectedSummaryId={archiveStore.selectedSummaryId}
        {activeTab}
        selectTab={(tabName) => {
          activeTab = tabName
        }}
        onRefresh={archiveStore.loadData}
      />
    {/if}
  </div>

  <!-- Right Column -->
  <div
    class="flex-1 relative bg-surface-1 z-20 flex flex-col gap-2
    {isSidePanelVisible ? 'sm:pl-80' : ''}
    {isMobile && !isSidePanelVisible ? 'pl-0' : ''}"
  >
    <SummaryDisplay
      selectedSummary={archiveStore.selectedSummary}
      {formatDate}
      {activeTab}
      archiveList={archiveStore.archiveList}
    />
    <div
      class="sticky bg-linear-to-t from-surface-1 to-surface-1/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-10 pointer-events-none"
    ></div>
  </div>

  <div
    class="top-stripes shrink-0 sticky top-0 w-3 sm:w-5 md:w-8 h-screen border-l border-border/70"
  ></div>
</main>
