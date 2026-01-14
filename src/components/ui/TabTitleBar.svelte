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
    // Reactive dependencies - these trigger when summary content OR loading/error state changes
    const _trigger = [
      summaryState.summary,
      summaryState.courseSummary,
      summaryState.selectedTextSummary,
      summaryState.customActionResult,
      summaryState.lastSummaryTypeDisplayed,
      isAnyLoading(),
      summaryState.summaryError, // Trigger update when error state changes
      summaryState.customActionError,
      summaryState.courseSummaryError,
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

    // Check if current tab has summary OR is loading OR has error (show tab button immediately)
    // This happens when summary just completed but syncToTabState hasn't run yet
    const hasSummaryOrLoadingOrError = !!(
      summaryState.summary ||
      summaryState.courseSummary ||
      summaryState.selectedTextSummary ||
      summaryState.customActionResult ||
      isAnyLoading() ||
      summaryState.summaryError ||
      summaryState.customActionError ||
      summaryState.courseSummaryError
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

    // If current tab has summary, loading, or error, add it to tabs list
    if (activeTabId && hasSummaryOrLoadingOrError) {
      const isInList = tabs.some((t) => t.id === activeTabId)
      if (!isInList) {
        try {
          const tab = await browser.tabs.get(activeTabId)
          const isActuallyLoading = isAnyLoading()
          const hasError = !!(
            summaryState.summaryError ||
            summaryState.customActionError ||
            summaryState.courseSummaryError
          )

          tabs = [
            ...tabs,
            {
              id: activeTabId,
              title: tab.title || 'Untitled',
              isActive: true,
              isLoading: isActuallyLoading,
              hasError,
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

  // ==========================================
  // Grab Scroll (Drag to scroll) functionality
  // ==========================================
  let tabListContainer = $state(null)
  let isGrabbing = $state(false)
  let hasDragged = $state(false) // Track if actual drag occurred
  let startX = $state(0)
  let scrollLeft = $state(0)

  function handleMouseDown(e) {
    // Only trigger on left mouse button
    if (e.button !== 0) return
    if (!tabListContainer) return

    isGrabbing = true
    hasDragged = false // Reset drag flag
    startX = e.pageX - tabListContainer.offsetLeft
    scrollLeft = tabListContainer.scrollLeft
    tabListContainer.style.cursor = 'grabbing'
  }

  function handleMouseMove(e) {
    if (!isGrabbing) return
    e.preventDefault()

    const x = e.pageX - tabListContainer.offsetLeft
    const walk = (x - startX) * 1.5 // Scroll speed multiplier

    // If moved more than 5px, consider it a drag
    if (Math.abs(x - startX) > 5) {
      hasDragged = true
    }

    tabListContainer.scrollLeft = scrollLeft - walk
  }

  function handleMouseUp() {
    if (!isGrabbing) return
    isGrabbing = false
    if (tabListContainer) {
      tabListContainer.style.cursor = 'grab'
    }

    // If we dragged, prevent click on tabs by resetting after a short delay
    if (hasDragged) {
      // Use setTimeout to allow this flag to be checked by click handlers
      setTimeout(() => {
        hasDragged = false
      }, 10)
    }
  }

  function handleMouseLeave() {
    if (isGrabbing) {
      isGrabbing = false
      hasDragged = false
      if (tabListContainer) {
        tabListContainer.style.cursor = 'grab'
      }
    }
  }

  // Wrapper to prevent tab click after dragging
  function handleTabClickWrapper(tabId) {
    if (hasDragged) {
      return // Don't navigate if we just finished dragging
    }
    handleTabClick(tabId)
  }
</script>

<div
  class="text-text-secondary relative {showNavigation
    ? ' bg-background-dark '
    : 'bg-transparent'} h-full w-full flex gap-px pl-2 items-center"
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
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={tabListContainer}
      onmousedown={handleMouseDown}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseLeave}
      role="group"
      class="flex font-mono px-2 z-10 relative h-full overflow-x-auto overflow-y-hidden scrollbar-hide flex-1 cursor-grab"
    >
      {#each cachedTabs as tab (tab.id)}
        <div
          role="button"
          tabindex="0"
          onclick={() => handleTabClickWrapper(tab.id)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleTabClickWrapper(tab.id)
            }
          }}
          onauxclick={(e) => handleTabMiddleClick(e, tab.id)}
          class="tab-btn flex items-center group tab {tab.id === currentTabId
            ? 'bg-surface-1 tab-active  text-text-primary !border !border-b-0 !border-surface-2/50 dark:!border-border  '
            : ' hover:text-text-primary !border !border-b-0 !border-transparent'}"
          title={tab.title}
        >
          <div
            class="-translate-y-0.5 w-full mask-alpha mask-r-from-black mask-r-from-75% mask-r-to-90% flex items-center gap-1 relative overflow-hidden"
          >
            <span
              class="flex max-w-full select-none {tab.isLoading
                ? 'animate-pulse'
                : ''} {tab.hasError ? 'text-red-400' : ''}">{tab.title}</span
            >
          </div>
          <!-- Close Button - Hidden by default, visible on hover -->
          <button
            class="absolute right-0.5 top-1/2 -translate-y-3.25 p-0.5 hover:bg-surface-2 rounded-full text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            onclick={(e) => {
              e.stopPropagation()
              handleCloseTab(tab.id)
            }}
            title="Remove from list (Middle-click)"
          >
            <Icon icon="heroicons:x-mark-16-solid" width="16" height="16" />
          </button>
          <span
            class="tab-round-l bg-surface-1 before:bg-background-dark before:!border-surface-2/70 dark:before:!border-border dark:before:bg-black"
          ></span>
          <span
            class="tab-round-r bg-surface-1 before:bg-background-dark before:!border-surface-2/70 dark:before:!border-border dark:before:bg-black"
          ></span>
        </div>
      {/each}

      <!-- Current tab button (when not in cached list but has summary OR cache is empty) -->
      {#if !isCurrentTabInCache && currentTabId && (currentTabHasSummary || cachedTabs.length === 0)}
        <button
          class="tab-btn tab tab-active bg-surface-1 text-text-primary !border !border-b-0 !border-surface-2/50 dark:!border-border"
          title={$tabTitle}
        >
          <div
            class="-translate-y-0.5 w-full mask-alpha overflow-x-hidden mask-r-from-black mask-r-from-85% mask-r-to-transparent"
          >
            <span class="flex max-w-full select-none"> {$tabTitle}</span>
          </div>
          <span
            class="tab-round-l bg-surface-1 before:bg-background-dark before:!border-surface-2/70 dark:before:!border-border dark:before:bg-black"
          ></span>
          <span
            class="tab-round-r bg-surface-1 before:bg-background-dark before:!border-surface-2/70 dark:before:!border-border dark:before:bg-black"
          ></span>
        </button>
      {/if}
    </div>
  {:else}
    <!-- Centered title mode when feature disabled or no cached tabs -->
    <div class="w-full text-center text-[0.75rem] px-2 text-text-secondary">
      <div class="line-clamp-1 w-full">{$tabTitle}</div>
    </div>
  {/if}
  <div
    class="w-full right-0 left-0 absolute bottom-0 h-px dark:bg-border bg-surface-2/50 {showNavigation
      ? ''
      : 'hidden'}"
  ></div>
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
    text-align: left;
    width: clamp(5.75rem, 1.5714rem + 18.5714vw, 9rem);
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
        border: 1px solid transparent;
        left: 0;
        width: 200%;
        height: 200%;
        transform: translate(-50%, -50%);
        border-radius: 100%;
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
