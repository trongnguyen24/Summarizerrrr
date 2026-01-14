<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { tabTitle } from '@/stores/tabTitleStore.svelte.js'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    summaryState,
    globalStoreUpdate,
    isAnyLoading,
    stopStreaming,
    resetState,
  } from '@/stores/summaryStore.svelte.js'
  import {
    getTabsWithSummaryInfo,
    navigateToTab,
    navigateToPreviousCachedTab,
    navigateToNextCachedTab,
    getCurrentTabId,
    getTabsWithSummary,
    clearTabState,
  } from '@/services/tabCacheService.js'
  import { onMount } from 'svelte'

  // Props - none

  // State for cached tabs info
  let cachedTabs = $state([])

  // State for current tab ID (reactive)
  let currentTabId = $state(null)

  // Computed: Check if should show navigation buttons
  let showNavigation = $derived(settings.tools?.perTabCache?.enabled)

  // Computed: Check if current tab is in cached tabs list
  let isCurrentTabInCache = $derived(
    cachedTabs.some((tab) => tab.id === currentTabId),
  )

  // Computed: Check if current tab has summary from reactive summaryState
  // This allows immediate UI update when summary is completed
  let currentTabHasSummary = $derived(
    !!(
      summaryState.summary ||
      summaryState.courseSummary ||
      summaryState.selectedTextSummary ||
      summaryState.customActionResult
    ),
  )

  // Load tabs info when summary state changes (reactive dependency on summaryState)
  $effect(() => {
    // Reactive dependencies - these trigger when summary content OR loading state changes
    const _trigger = [
      summaryState.summary,
      summaryState.courseSummary,
      summaryState.selectedTextSummary,
      summaryState.customActionResult,
      summaryState.lastSummaryTypeDisplayed,
      isAnyLoading(),
      globalStoreUpdate.version, // Trigger update when background tabs change
    ]
    if (showNavigation) {
      loadTabsInfo()
    }
  })

  // Listen for tab events to update the list
  onMount(() => {
    // Initialize tabs info on mount - use async to get browser tab directly
    initializeCurrentTab()

    // Handle tab close
    const handleTabRemoved = (tabId) => {
      // Remove the closed tab from cachedTabs immediately
      cachedTabs = cachedTabs.filter((tab) => tab.id !== tabId)
    }

    // Handle tab activation (user switches tabs via browser)
    const handleTabActivated = (activeInfo) => {
      // Scroll is saved in messageHandler.js handleTabSwitch()
      // Just update local state here for UI
      currentTabId = activeInfo.tabId
      // Reload tabs info to update list
      loadTabsInfo(false)
    }

    browser.tabs.onRemoved.addListener(handleTabRemoved)
    browser.tabs.onActivated.addListener(handleTabActivated)

    return () => {
      browser.tabs.onRemoved.removeListener(handleTabRemoved)
      browser.tabs.onActivated.removeListener(handleTabActivated)
    }
  })

  // Initialize current tab directly from browser API
  async function initializeCurrentTab() {
    try {
      // Get current tab directly from browser API
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      })
      if (tab?.id) {
        currentTabId = tab.id
      }
    } catch (error) {
      console.error('[TabTitleBar] Failed to get current tab:', error)
    }
    // Load tabs info after setting currentTabId
    await loadTabsInfo(false)
  }

  async function loadTabsInfo(updateCurrentTab = true) {
    let tabs = await getTabsWithSummaryInfo()

    // Check if current tab has summary OR is loading (show tab button immediately when user clicks summarize)
    // This happens when summary just completed but syncToTabState hasn't run yet
    const hasSummaryOrLoading = !!(
      summaryState.summary ||
      summaryState.courseSummary ||
      summaryState.selectedTextSummary ||
      summaryState.customActionResult ||
      summaryState.customActionResult ||
      isAnyLoading()
    )

    // Get current tab ID
    let activeTabId = currentTabId
    if (!activeTabId) {
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })
        activeTabId = tab?.id
      } catch (error) {
        console.error('[TabTitleBar] Failed to get current tab:', error)
      }
    }

    // If current tab has summary or is loading, add it to tabs list
    if (activeTabId && hasSummaryOrLoading) {
      const isInList = tabs.some((t) => t.id === activeTabId)
      if (!isInList) {
        try {
          const tab = await browser.tabs.get(activeTabId)
          const isActuallyLoading = isAnyLoading()

          tabs = [
            ...tabs,
            {
              id: activeTabId,
              title: tab.title || 'Untitled',
              isActive: true,
              isLoading: isActuallyLoading,
            },
          ]
        } catch (error) {
          console.error('[TabTitleBar] Failed to add current tab:', error)
        }
      }
    }

    cachedTabs = tabs

    if (updateCurrentTab && activeTabId) {
      currentTabId = activeTabId
    }
  }

  async function handleTabClick(tabId) {
    // Scroll is saved in messageHandler.js handleTabSwitch() when tabUpdated fires
    // Just update local state and navigate
    currentTabId = tabId
    await navigateToTab(tabId)
    // Reload tabs list only, don't overwrite currentTabId
    await loadTabsInfo(false)
  }

  async function handleCloseTab(tabId) {
    // If closing the current active tab, we need to:
    // 1. Stop any ongoing streaming
    // 2. Reset the global summaryState so the tab button disappears
    if (tabId === currentTabId) {
      // Stop streaming if running
      if (isAnyLoading()) {
        stopStreaming()
      }
      // Reset global state so currentTabHasSummary becomes false
      resetState()
    }

    // Clear the tab state from cache (don't close the actual browser tab)
    clearTabState(tabId)

    await loadTabsInfo(false)
  }

  function handleTabMiddleClick(e, tabId) {
    if (e.button === 1) {
      // Middle click
      e.preventDefault()
      e.stopPropagation()
      handleCloseTab(tabId)
    }
  }

  async function handlePrevious() {
    // Scroll is saved in messageHandler.js handleTabSwitch()
    const newTabId = await navigateToPreviousCachedTab()
    if (newTabId) {
      currentTabId = newTabId
      await loadTabsInfo(false)
    }
  }

  async function handleNext() {
    // Scroll is saved in messageHandler.js handleTabSwitch()
    const newTabId = await navigateToNextCachedTab()
    if (newTabId) {
      currentTabId = newTabId
      await loadTabsInfo(false)
    }
  }
</script>

<div
  class="text-text-secondary relative bg-border dark:bg-black h-full w-full flex gap-px pl-2 items-center"
>
  {#if showNavigation}
    <!-- Left arrow -->
    <button
      onclick={handlePrevious}
      class="py-0.5 px-1 hover:bg-surface-2 rounded transition-colors hover:text-text-primary shrink-0"
      title="Previous cached tab"
    >
      <Icon icon="solar:alt-arrow-left-linear" width="16" height="16" />
    </button>
    <!-- Right arrow -->
    <button
      onclick={handleNext}
      class="py-0.5 px-1 hover:bg-surface-2 rounded transition-colors hover:text-text-primary shrink-0"
      title="Next cached tab"
    >
      <Icon icon="solar:alt-arrow-right-linear" width="16" height="16" />
    </button>

    <!-- Tab list -->
    <div
      class="flex px-2 z-10 relative h-full overflow-x-auto overflow-y-hidden scrollbar-hide flex-1"
    >
      {#each cachedTabs as tab (tab.id)}
        <div
          role="button"
          tabindex="0"
          onclick={() => handleTabClick(tab.id)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleTabClick(tab.id)
            }
          }}
          onauxclick={(e) => handleTabMiddleClick(e, tab.id)}
          class="tab-btn flex items-center group tab {tab.id === currentTabId
            ? 'bg-surface-1 tab-active  text-text-primary !border !border-b-0 !border-border  '
            : ' hover:text-text-primary !border !border-b-0 !border-transparent'}"
          title={tab.title}
        >
          <div
            class="-translate-y-0.5 w-full mask-alpha mask-r-from-black mask-r-from-75% mask-r-to-90% flex items-center gap-1 relative overflow-hidden"
          >
            {#if tab.isLoading}
              <Icon
                icon="eos-icons:loading"
                width="12"
                height="12"
                class="shrink-0"
              />
            {/if}

            <span class="flex max-w-full select-none">{tab.title}</span>
          </div>
          <!-- Close Button - Hidden by default, visible on hover -->
          <button
            class="absolute right-0.5 top-1/2 -translate-y-2.75 p-0.5 rounded-full text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            onclick={(e) => {
              e.stopPropagation()
              handleCloseTab(tab.id)
            }}
            title="Remove from list (Middle-click)"
          >
            <Icon icon="solar:close-circle-bold" width="14" height="14" />
          </button>
          <span class="tab-round-l bg-surface-1"></span>
          <span class="tab-round-r bg-surface-1"></span>
        </div>
      {/each}

      <!-- Current tab button (when not in cached list but has summary OR just for showing current tab) -->
      {#if !isCurrentTabInCache && currentTabId && currentTabHasSummary}
        <button
          class="tab-btn tab tab-active bg-surface-1 text-text-primary !border !border-b-0 !border-border"
          title={$tabTitle}
        >
          <div
            class="-translate-y-0.5 w-full mask-alpha mask-r-from-black mask-r-from-85% mask-r-to-transparent"
          >
            {$tabTitle}
          </div>
          <span class="tab-round-l bg-surface-1"></span>
          <span class="tab-round-r bg-surface-1"></span>
        </button>
      {:else if !isCurrentTabInCache && currentTabId && !currentTabHasSummary}
        <!-- Current tab without summary - show simple tab button -->
        <button
          class="tab-btn tab tab-active bg-surface-1 text-text-primary !border !border-b-0 !border-border"
          title={$tabTitle}
        >
          <div
            class="-translate-y-0.5 w-full mask-alpha mask-r-from-black mask-r-from-85% mask-r-to-transparent"
          >
            {$tabTitle}
          </div>
          <span class="tab-round-l bg-surface-1"></span>
          <span class="tab-round-r bg-surface-1"></span>
        </button>
      {/if}
    </div>
  {:else}
    <!-- Centered title mode when feature disabled or no cached tabs -->
    <div
      class="line-clamp-1 w-full text-center text-[0.75rem] px-2 text-text-secondary"
    >
      {$tabTitle}
    </div>
  {/if}
  <div class="w-full right-0 left-0 absolute bottom-0 h-px bg-border"></div>
</div>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  .tab {
    cursor: pointer;
    height: 2.25rem;
    min-width: 3rem;
    max-width: 8rem;
    text-align: left;
    width: 100%;
    flex: 1;
    border: 1px solid transparent;
    transform: translateY(2px);
    padding: 0.125rem 0.5rem;
    font-size: 0.7rem;
    border-radius: 0.5rem 0.5rem 0 0;
    white-space: nowrap;
    flex-shrink: 0;
    .tab-round-l,
    .tab-round-r {
      opacity: 0;
      position: absolute;
      bottom: 0.125rem;
      left: 0;
      transform: translateX(-100%);
      width: 0.5rem;
      height: 0.5rem;
      overflow: hidden;
      &:before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 200%;
        height: 200%;
        border: 1px solid var(--color-border);
        transform: translate(-50%, -50%);
        border-radius: 100%;
        background-color: var(--color-black);
      }
    }
    .tab-round-l {
      left: 100%;
      transform: translateX(0);
      &::before {
        left: 100%;
      }
    }
  }
  .tab-active {
    z-index: 2;
    &::after {
      opacity: 0;
    }
    .tab-round-l,
    .tab-round-r {
      opacity: 1;
    }
  }
</style>
