<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { tabTitle } from '@/stores/tabTitleStore.svelte.js'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    getTabsWithSummaryInfo,
    navigateToTab,
    navigateToPreviousCachedTab,
    navigateToNextCachedTab,
    getCurrentTabId,
    getTabsWithSummary,
  } from '@/services/tabCacheService.js'
  import { onMount } from 'svelte'

  // Props
  let { cachedTabsCount = 0 } = $props()

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

  // Load tabs info when cachedTabsCount changes (new summaries added)
  $effect(() => {
    // Depend on cachedTabsCount to trigger reload
    const _count = cachedTabsCount
    if (showNavigation || _count > 0) {
      loadTabsInfo()
    }
  })

  // Listen for tab events to update the list
  onMount(() => {
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

  async function loadTabsInfo(updateCurrentTab = true) {
    cachedTabs = await getTabsWithSummaryInfo()
    if (updateCurrentTab) {
      currentTabId = getCurrentTabId()
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
  class="text-text-secondary relative bg-border dark:bg-black h-full w-full flex gap-1 items-center"
>
  {#if showNavigation}
    <!-- Left arrow -->
    <button
      onclick={handlePrevious}
      class="py-0.5 px-1.5 hover:bg-surface-2 rounded transition-colors hover:text-text-primary shrink-0"
      title="Previous cached tab"
    >
      <Icon icon="solar:alt-arrow-left-linear" width="16" height="16" />
    </button>
    <!-- Right arrow -->
    <button
      onclick={handleNext}
      class="py-0.5 px-1.5 hover:bg-surface-2 rounded transition-colors hover:text-text-primary shrink-0"
      title="Next cached tab"
    >
      <Icon icon="solar:alt-arrow-right-linear" width="16" height="16" />
    </button>

    <!-- Tab list -->
    <div
      class="flex px-2 z-10 relative h-full overflow-x-auto overflow-y-hidden scrollbar-hide flex-1"
    >
      {#each cachedTabs as tab (tab.id)}
        <button
          onclick={() => handleTabClick(tab.id)}
          class="tab-btn tab {tab.id === currentTabId
            ? 'bg-surface-1 tab-active  text-text-primary !border !border-b-0 !border-border  '
            : ' hover:text-text-primary'}"
          title={tab.title}
        >
          <div
            class="-translate-y-0.5 w-full mask-alpha mask-r-from-black mask-r-from-85% mask-r-to-transparent"
          >
            {tab.title}
          </div>
          <span class="tab-round-l bg-surface-1"></span>
          <span class="tab-round-r bg-surface-1"></span>
        </button>
      {/each}

      <!-- Current tab button (when not in cached list) -->
      {#if !isCurrentTabInCache && currentTabId}
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
  <div class="w-full absolute bottom-0 h-px bg-border"></div>
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
    min-width: 6rem;
    height: 2.25rem;
    max-width: 8rem;
    text-align: left;
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
