<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
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
  import { isReduceMotionEnabled } from '@/services/animationService.js'
  import { onMount, onDestroy } from 'svelte'

  // ==========================================
  // Constants
  // ==========================================
  const SCROLL_SPEED_MULTIPLIER = 1
  const DRAG_THRESHOLD_PX = 5
  const ANIMATION_DELAY_MS = 50
  const LERP_FACTOR = 0.15 // Lower = smoother but slower, Higher = faster but less smooth
  const LERP_THRESHOLD = 0.5 // Stop animating when difference is less than this

  // Props - none

  // State for cached tabs info
  let cachedTabs = $state([])

  // State to track if we've ever had cached tabs (controls Current tab button visibility)
  let hasHadCachedTabs = $state(false)

  // State for current tab ID (reactive)
  let currentTabId = $state(null)

  // Computed: Check if should show navigation buttons
  let showNavigation = $derived(settings.tools?.perTabCache?.enabled)

  // Computed: Auto scroll behavior ('off' | 'jump' | 'smooth')
  let autoScrollBehavior = $derived(
    settings.tools?.perTabCache?.autoScrollBehavior ?? 'smooth',
  )

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
      loadTabsInfo(false).then(() => {
        // Only scroll to the tab if it's actually in the cached list
        // This prevents flash/scroll issues when switching to tabs without summaries
        const isTabInList = cachedTabs.some((t) => t.id === activeInfo.tabId)
        if (isTabInList) {
          setTimeout(() => scrollToActiveTab(activeInfo.tabId), 50)
        }
      })
    }

    browser.tabs.onRemoved.addListener(handleTabRemoved)
    browser.tabs.onActivated.addListener(handleTabActivated)

    return () => {
      browser.tabs.onRemoved.removeListener(handleTabRemoved)
      browser.tabs.onActivated.removeListener(handleTabActivated)
      // Cleanup global mouse listeners to prevent memory leaks
      cleanupGlobalMouseListeners()
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

    // Note: We no longer add current tab based on global summaryState here
    // because it caused race conditions during tab switches (flash issue).
    // The tab will be added to the list once its state is properly synced
    // to tabStates cache via syncToTabState in messageHandler.js

    cachedTabs = tabs

    // Update hasHadCachedTabs based on current tabs
    if (tabs.length > 0) {
      hasHadCachedTabs = true // Have cached tabs → true
    } else if (hasHadCachedTabs && tabs.length === 0) {
      hasHadCachedTabs = false // Had tabs but now empty → reset
    }

    if (updateCurrentTab && activeTabId) {
      currentTabId = activeTabId
    }
  }

  // Scroll to the active tab button based on autoScrollBehavior setting
  function scrollToActiveTab(tabId) {
    // Check if auto scroll is disabled
    if (autoScrollBehavior === 'off') return
    if (!tabListContainer) return

    // Find the tab button element by data-tab-id
    const tabButton = tabListContainer.querySelector(`[data-tab-id="${tabId}"]`)
    if (!tabButton) return

    // Calculate the scroll position to center the tab button
    const containerRect = tabListContainer.getBoundingClientRect()
    const buttonRect = tabButton.getBoundingClientRect()
    const containerWidth = containerRect.width
    const buttonWidth = buttonRect.width

    // Calculate the target scroll position to center the button
    const buttonOffsetLeft = tabButton.offsetLeft
    const targetScroll = buttonOffsetLeft - containerWidth / 2 + buttonWidth / 2

    // Clamp to valid scroll range
    const maxScroll = tabListContainer.scrollWidth - containerWidth
    const clampedTarget = Math.max(0, Math.min(targetScroll, maxScroll))

    // Apply scroll based on behavior setting
    if (autoScrollBehavior === 'smooth' && !isReduceMotionEnabled()) {
      // Use lerp animation for smooth scroll
      targetScrollLeft = clampedTarget
      currentScrollLeft = tabListContainer.scrollLeft
      startLerpAnimation()
    } else {
      // Instant scroll (jump) or if reduce motion is enabled
      tabListContainer.scrollLeft = clampedTarget
    }
  }

  async function handleTabClick(tabId) {
    // Scroll is saved in messageHandler.js handleTabSwitch() when tabUpdated fires
    // Just update local state and navigate
    currentTabId = tabId
    await navigateToTab(tabId)
    // Reload tabs list only, don't overwrite currentTabId
    await loadTabsInfo(false)
    // Scroll to the clicked tab (use timeout to ensure DOM is updated)
    setTimeout(() => scrollToActiveTab(tabId), ANIMATION_DELAY_MS)
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

  // Prevent middle-click auto-scroll icon from appearing
  function preventMiddleClickScroll(e) {
    if (e.button === 1) {
      e.preventDefault()
    }
  }

  async function handlePrevious() {
    // Scroll is saved in messageHandler.js handleTabSwitch()
    const newTabId = await navigateToPreviousCachedTab()
    if (newTabId) {
      currentTabId = newTabId
      await loadTabsInfo(false)
      // Scroll to the new active tab
      setTimeout(() => scrollToActiveTab(newTabId), ANIMATION_DELAY_MS)
    }
  }

  async function handleNext() {
    // Scroll is saved in messageHandler.js handleTabSwitch()
    const newTabId = await navigateToNextCachedTab()
    if (newTabId) {
      currentTabId = newTabId
      await loadTabsInfo(false)
      // Scroll to the new active tab
      setTimeout(() => scrollToActiveTab(newTabId), ANIMATION_DELAY_MS)
    }
  }

  // ==========================================
  // Grab Scroll (Drag to scroll) functionality with Lerp Animation
  // ==========================================
  let tabListContainer = $state(null)
  let isGrabbing = $state(false)
  let hasDragged = $state(false) // Track if actual drag occurred
  let startX = $state(0)
  let scrollLeft = $state(0)

  // Lerp animation state
  let targetScrollLeft = $state(0)
  let currentScrollLeft = $state(0)
  let lerpAnimationId = $state(null)

  // Lerp (Linear Interpolation) function
  function lerp(start, end, factor) {
    return start + (end - start) * factor
  }

  // Animation loop for smooth scrolling
  function animateLerp() {
    if (!tabListContainer) {
      lerpAnimationId = null
      return
    }

    // Calculate new position using lerp
    currentScrollLeft = lerp(currentScrollLeft, targetScrollLeft, LERP_FACTOR)

    // Apply the scroll position
    tabListContainer.scrollLeft = currentScrollLeft

    // Continue animation if we haven't reached target (within threshold)
    if (Math.abs(targetScrollLeft - currentScrollLeft) > LERP_THRESHOLD) {
      lerpAnimationId = requestAnimationFrame(animateLerp)
    } else {
      // Snap to target when close enough
      tabListContainer.scrollLeft = targetScrollLeft
      currentScrollLeft = targetScrollLeft
      lerpAnimationId = null
    }
  }

  // Start lerp animation
  function startLerpAnimation() {
    if (lerpAnimationId === null) {
      lerpAnimationId = requestAnimationFrame(animateLerp)
    }
  }

  // Stop lerp animation
  function stopLerpAnimation() {
    if (lerpAnimationId !== null) {
      cancelAnimationFrame(lerpAnimationId)
      lerpAnimationId = null
    }
  }

  // Cleanup function for global mouse listeners
  function cleanupGlobalMouseListeners() {
    document.removeEventListener('mousemove', handleGlobalMouseMove)
    document.removeEventListener('mouseup', handleGlobalMouseUp)
  }

  // Global mouse handlers for grab scroll - allows dragging to continue outside container
  function handleGlobalMouseMove(e) {
    if (!isGrabbing || !tabListContainer) return
    e.preventDefault()

    const x = e.pageX - tabListContainer.offsetLeft
    const walk = (x - startX) * SCROLL_SPEED_MULTIPLIER

    // If moved more than threshold, consider it a drag
    if (Math.abs(x - startX) > DRAG_THRESHOLD_PX) {
      hasDragged = true
    }

    // Update target scroll position
    targetScrollLeft = scrollLeft - walk

    // Use lerp animation if reduce motion is not enabled
    if (!isReduceMotionEnabled()) {
      startLerpAnimation()
    } else {
      // Instant scroll if reduce motion is enabled
      tabListContainer.scrollLeft = targetScrollLeft
      currentScrollLeft = targetScrollLeft
    }
  }

  function handleGlobalMouseUp() {
    if (!isGrabbing) return
    isGrabbing = false
    if (tabListContainer) {
      tabListContainer.style.cursor = 'grab'
    }

    // Remove global listeners
    cleanupGlobalMouseListeners()

    // If we dragged, prevent click on tabs by resetting after a short delay
    if (hasDragged) {
      // Use setTimeout to allow this flag to be checked by click handlers
      setTimeout(() => {
        hasDragged = false
      }, 10)
    }

    // Let lerp animation continue to finish smoothly after mouse up
    // Don't stop it immediately - it will stop when reaching target
  }

  function handleMouseDown(e) {
    // Only trigger on left mouse button
    if (e.button !== 0) return
    if (!tabListContainer) return

    isGrabbing = true
    hasDragged = false // Reset drag flag
    startX = e.pageX - tabListContainer.offsetLeft
    scrollLeft = tabListContainer.scrollLeft
    tabListContainer.style.cursor = 'grabbing'

    // Sync lerp state with current scroll position
    currentScrollLeft = tabListContainer.scrollLeft
    targetScrollLeft = tabListContainer.scrollLeft

    // Stop any existing lerp animation
    stopLerpAnimation()

    // Add global listeners to track mouse outside container
    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }

  // handleMouseMove now delegates to global handler to avoid code duplication
  function handleMouseMove(e) {
    handleGlobalMouseMove(e)
  }

  function handleMouseUp() {
    // This is now handled by handleGlobalMouseUp
    // Keep for compatibility but global handler does the main work
    if (!isGrabbing) return
    handleGlobalMouseUp()
  }

  function handleMouseLeave() {
    // Don't stop grabbing when mouse leaves - global listeners handle it
    // This allows dragging to continue even when cursor leaves the container
  }

  // Wrapper to prevent tab click after dragging
  function handleTabClickWrapper(tabId) {
    if (hasDragged) {
      return // Don't navigate if we just finished dragging
    }
    handleTabClick(tabId)
  }

  // ==========================================
  // Horizontal Wheel Scroll functionality
  // ==========================================
  function handleWheel(e) {
    if (!tabListContainer) return

    // Prevent default vertical scroll
    e.preventDefault()

    // Convert vertical scroll to horizontal scroll
    // deltaY is the vertical scroll amount, we use it for horizontal scrolling
    const scrollAmount = e.deltaY || e.deltaX

    // Update target scroll position
    targetScrollLeft =
      tabListContainer.scrollLeft + scrollAmount * SCROLL_SPEED_MULTIPLIER

    // Clamp to valid scroll range
    const maxScroll =
      tabListContainer.scrollWidth - tabListContainer.clientWidth
    targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll))

    // Sync current position for lerp
    currentScrollLeft = tabListContainer.scrollLeft

    // Use lerp animation if reduce motion is not enabled
    if (!isReduceMotionEnabled()) {
      startLerpAnimation()
    } else {
      // Instant scroll if reduce motion is enabled
      tabListContainer.scrollLeft = targetScrollLeft
      currentScrollLeft = targetScrollLeft
    }
  }
</script>

<div
  class="text-text-secondary relative {showNavigation
    ? ' bg-background-dark '
    : 'bg-transparent'} overflow-hidden w-full h-9 flex gap-px items-center"
>
  {#if showNavigation}
    <div
      class="flex fixed gap-1.5 z-40 left-0 top-0 h-9 px-1.5 justify-center items-center"
    >
      <!-- Left arrow -->
      <button
        onclick={handlePrevious}
        class="size-5 flex justify-center items-center relative z-20 bg-surface-1 hover:bg-surface-2 rounded-full transition-colors hover:text-text-primary shrink-0"
        title={$t('settings.tools.perTabCache.nav.previous_tab')}
      >
        <Icon icon="carbon:caret-left" width="14" height="14" />
      </button>
      <!-- Right arrow -->
      <button
        onclick={handleNext}
        class="size-5 flex justify-center items-center relative z-20 bg-surface-1 hover:bg-surface-2 rounded-full transition-colors hover:text-text-primary shrink-0"
        title={$t('settings.tools.perTabCache.nav.next_tab')}
      >
        <Icon icon="carbon:caret-right" width="14" height="14" />
      </button>
      <div
        class="w-14 absolute z-10 left-0 top-0 h-8.5 bg-linear-to-r from-background-dark/70 to-background-dark/0 mask-r-from-50% backdrop-blur-[2px]"
      ></div>
    </div>

    <!-- Tab list -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      bind:this={tabListContainer}
      onmousedown={(e) => {
        preventMiddleClickScroll(e)
        handleMouseDown(e)
      }}
      onmousemove={handleMouseMove}
      onmouseup={handleMouseUp}
      onmouseleave={handleMouseLeave}
      onwheel={handleWheel}
      role="group"
      class="flex gap-0.5 font-mono pr-8 pl-15 z-10 relative h-full overflow-x-auto overflow-y-hidden scrollbar-hide flex-1 cursor-grab"
    >
      {#each cachedTabs as tab (tab.id)}
        <div
          role="button"
          tabindex="0"
          data-tab-id={tab.id}
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
          <span
            class="flex z-20 -translate-y-0.75 px-1.75 max-w-full w-full group-hover:w-[90%] duration-200 transition-all mask-alpha overflow-x-hidden mask-r-from-black mask-r-from-75% mask-r-to-90% select-none {tab.isLoading
              ? 'animate-pulse'
              : ''} {tab.hasError ? 'text-red-400' : ''}">{tab.title}</span
          >
          <div
            class=" absolute scale-50 translate-y-2 group-hover:scale-100 group-hover:translate-y-0 w-[calc(100%-4px)] top-0 left-1/2 -translate-x-1/2 flex items-center gap-1 transition-all duration-200 group-hover:bg-surface-1 px-1.5 h-6 rounded overflow-hidden"
          ></div>
          <!-- Close Button - Hidden by default, visible on hover -->
          <button
            class="absolute z-30 right-0.5 top-1/2 -translate-y-3.25 p-0.5 hover:bg-blackwhite/10 rounded-full text-text-secondary hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all duration-200"
            onclick={(e) => {
              e.stopPropagation()
              handleCloseTab(tab.id)
            }}
            title={$t('settings.tools.perTabCache.nav.remove_tab')}
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

      <!-- Current tab button (only when never had cached tabs, or all were removed) -->
      {#if !hasHadCachedTabs && currentTabId}
        <button
          class="tab-btn tab tab-active bg-surface-1 text-text-primary !border !border-b-0 !border-surface-2/50 dark:!border-border"
          title={$tabTitle}
        >
          <span
            class="flex z-20 -translate-y-0.75 px-1.75 max-w-full w-full group-hover:w-[90%] duration-200 transition-all mask-alpha overflow-hidden mask-r-from-black mask-r-from-75% mask-r-to-90% select-none"
          >
            {$tabTitle}</span
          >

          <div
            class=" absolute w-[calc(100%-4px)] top-0 left-1/2 -translate-x-1/2 flex items-center gap-1 transition-colors duration-200 group-hover:bg-surface-1 px-1.5 h-6 rounded overflow-hidden"
          ></div>
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
    height: 2rem;
    text-align: left;
    width: clamp(5rem, 2.5rem + 12.5vw, 7.5rem);
    border: 1px solid transparent;
    transform: translateY(6px);
    padding: 2px 0 2px 2px;
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
