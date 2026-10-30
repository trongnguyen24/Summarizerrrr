<script>
  // @ts-nocheck
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import Icon from '@iconify/svelte'
  import { fadeOnly } from '@/lib/utils/slideScaleFade.js'
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { isReduceMotionEnabled } from '@/services/animationService.js'
  import { t } from 'svelte-i18n'
  import DeepDiveToolSettings from '@/entrypoints/settings/components/tools/DeepDiveToolSettings.svelte'
  import {
    loadSettings,
    settings,
    updateSettings,
  } from '@/stores/settingsStore.svelte.js'
  import { domVisibility } from '@/stores/stateAbout.svelte.js'
  import AIProviderSettings from '@/entrypoints/settings/components/AIProviderSettings.svelte'
  import AppearanceSettings from '@/entrypoints/settings/components/AppearanceSettings.svelte'
  import DataSyncSettings from '@/entrypoints/settings/components/DataSyncSettings.svelte'
  import SummarySettings from '@/entrypoints/settings/components/SummarySettings.svelte'
  import ChatSettings from '@/entrypoints/settings/components/ChatSettings.svelte'
  import FABSettings from '@/entrypoints/settings/components/FABSettings.svelte'
  import SitePermissionsSettings from '@/entrypoints/settings/components/SitePermissionsSettings.svelte'
  import AboutSettings from '@/entrypoints/settings/components/AboutSettings.svelte'
  import ReleaseNote from '@/entrypoints/settings/components/ReleaseNote.svelte'
  import { getTabFromURL, updateTabInURL } from '@/lib/utils/urlUtils.js'

  let activeTab = $state(getTabFromURL()) // Initialize tab from URL
  let scrollContainerEl // Reference to the scroll container element
  let navScrollEl // Reference to the desktop sidebar scroll container
  let menuOpen = $state(false) // Mobile menu, expands upward out of the bottom bar

  const mainTabs = [
    {
      id: 'ai-provider',
      label: 'AI Provider',
      iconSolid: 'heroicons:cpu-chip-solid',
      iconOutline: 'heroicons:cpu-chip',
    },
    {
      id: 'summary',
      label: 'Summary',
      iconSolid: 'heroicons:sparkles-solid',
      iconOutline: 'heroicons:sparkles',
    },
    {
      id: 'chat',
      label: 'Chat',
      iconSolid: 'heroicons:chat-bubble-left-right-solid',
      iconOutline: 'heroicons:chat-bubble-left-right',
    },
    {
      id: 'appearance',
      label: 'Appearance',
      iconSolid: 'heroicons:swatch-solid',
      iconOutline: 'heroicons:swatch',
    },
    {
      id: 'fab',
      label: 'FAB',
      iconSolid: 'heroicons:cursor-arrow-rays-solid',
      iconOutline: 'heroicons:cursor-arrow-rays',
    },
    ...(import.meta.env.BROWSER === 'firefox'
      ? [
          {
            id: 'site-access',
            label: 'Site Access',
            iconSolid: 'heroicons:shield-check-solid',
            iconOutline: 'heroicons:shield-check',
          },
        ]
      : []),
    {
      id: 'deep-dive',
      label: 'Deep Dive',
      iconSolid: 'heroicons:light-bulb-solid',
      iconOutline: 'heroicons:light-bulb',
    },
    {
      id: 'data-sync',
      label: 'Data & Sync',
      iconSolid: 'heroicons:cloud-arrow-up-solid',
      iconOutline: 'heroicons:cloud-arrow-up',
    },
  ]

  const footerTabs = [
    {
      id: 'whats-new',
      label: "What's New",
      iconSolid: 'heroicons:megaphone-solid',
      iconOutline: 'heroicons:megaphone',
    },
    {
      id: 'about',
      label: 'About',
      iconSolid: 'heroicons:information-circle-solid',
      iconOutline: 'heroicons:information-circle',
    },
  ]

  const allTabs = [...mainTabs, ...footerTabs]
  let activeTabIndex = $derived(
    Math.max(
      0,
      allTabs.findIndex((tab) => tab.id === activeTab),
    ),
  )
  let activeTabInfo = $derived(allTabs[activeTabIndex])

  // Mobile bottom bar: step to the previous/next settings section
  function stepTab(offset) {
    const next = allTabs[activeTabIndex + offset]
    if (next) switchTab(next.id)
  }

  $effect(() => {
    // React to activeTab changes
    const currentTab = activeTab
    // Mobile: scroll internal container
    if (scrollContainerEl) scrollContainerEl.scrollTop = 0
    const scrollContent = document.querySelector(
      '#setting-scroll > div:nth-child(1)',
    )
    if (scrollContent) scrollContent.scrollTop = 0
    // Desktop: scroll body (handled by OverlayScrollbars on body)
    if (window.matchMedia('(min-width: 640px)').matches) {
      const osViewport = document.querySelector('.os-viewport')
      if (osViewport) osViewport.scrollTop = 0
      else window.scrollTo({ top: 0 })
    }
  })

  // Function to handle tab switching with URL update
  function switchTab(tabName) {
    activeTab = tabName
    updateTabInURL(tabName)
    if (menuOpen) toggleMenu()
  }

  function toggleMenu() {
    menuOpen = !menuOpen
    if (menuOpen) sheetDragY = 0
  }

  // Bottom sheet: rises from behind the bar, drag the handle down to dismiss
  function sheetFly(node) {
    return fly(node, {
      y: '100%',
      opacity: 1,
      duration: isReduceMotionEnabled() ? 0 : 280,
      easing: cubicOut,
    })
  }

  // Drag to dismiss, after the content script's MobileSheet: from the handle
  // anywhere, from the list only while it is scrolled to the top.
  const SHEET_DISMISS_PX = 80
  const SHEET_DISMISS_VELOCITY = 0.5 // px/ms
  const SHEET_CLICK_SLOP_PX = 5
  let sheetHandleEl = $state()
  let sheetListEl = $state()
  let sheetDragY = $state(0)
  let sheetDragging = $state(false)
  let dragSource = 'handle' // 'handle' | 'content'
  let dragStartY = 0
  let dragStartTime = 0
  let suppressNextClick = false

  const pointerY = (e) => (e.touches ? e.touches[0] : e).clientY

  function onSheetDragStart(event) {
    const fromHandle = sheetHandleEl?.contains(event.target)
    const fromContentTop =
      sheetListEl?.contains(event.target) && sheetListEl.scrollTop <= 0
    if (!fromHandle && !fromContentTop) return
    sheetDragging = true
    dragSource = fromHandle ? 'handle' : 'content'
    dragStartY = pointerY(event)
    dragStartTime = event.timeStamp
  }

  function onSheetDragMove(event) {
    if (!sheetDragging) return
    const deltaY = pointerY(event) - dragStartY
    // Pulling the list up means scrolling it, not dragging the sheet
    if (dragSource === 'content' && deltaY < 0 && sheetDragY === 0) {
      sheetDragging = false
      return
    }
    sheetDragY = Math.max(0, deltaY)
  }

  function onSheetDragEnd(event) {
    if (!sheetDragging) return
    sheetDragging = false
    // A real drag must not also count as a tap on the item under the finger
    if (sheetDragY > SHEET_CLICK_SLOP_PX) suppressNextClick = true
    const velocity = sheetDragY / Math.max(1, event.timeStamp - dragStartTime)
    if (sheetDragY > SHEET_DISMISS_PX || velocity > SHEET_DISMISS_VELOCITY) {
      // Keep the dragged offset: the outro continues from where the finger left it
      menuOpen = false
    } else {
      sheetDragY = 0
    }
  }

  function onSheetClickCapture(event) {
    if (!suppressNextClick) return
    suppressNextClick = false
    event.stopPropagation()
    event.preventDefault()
  }

  function handleKeydown(event) {
    if (menuOpen && event.key === 'Escape') toggleMenu()
  }
  const options = {
    scrollbars: {
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Sidebar menu (desktop) / tab bar (mobile) gets its own overlay scrollbar
  const navOptions = {
    scrollbars: {
      theme: 'os-theme-custom-app',
      autoHide: 'leave',
      autoHideDelay: 500,
    },
  }
  const [initializeNav, navInstance] = useOverlayScrollbars({
    options: navOptions,
    defer: true,
  })

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  // Use $effect to initialize OverlayScrollbars (only on mobile non-touch devices)
  $effect(() => {
    const tocElement = document.getElementById('setting-scroll')
    const isDesktop = window.matchMedia('(min-width: 640px)').matches
    const touch = isTouchDevice()
    if (tocElement && !touch && !isDesktop) {
      initialize(tocElement)
    }
    // Desktop sidebar scroller (hidden on mobile, where the drawer is used)
    if (navScrollEl && !touch) {
      initializeNav(navScrollEl)
    }

    return () => {
      instance()?.destroy()
      navInstance()?.destroy()
    }
  })

  // Use $effect to load settings from stores when the component mounts
  $effect(async () => {
    await loadSettings()
  })

  // Use $effect to save settings when they change

  // No longer needed, handled by the dynamic position effects
  import FirefoxPermissionOverlay from '@/entrypoints/settings/components/FirefoxPermissionOverlay.svelte'
</script>

<svelte:window
  onkeydown={handleKeydown}
  onmousemove={onSheetDragMove}
  onmouseup={onSheetDragEnd}
  ontouchmove={onSheetDragMove}
  ontouchend={onSheetDragEnd}
  ontouchcancel={onSheetDragEnd}
/>

<div
  class="relative settings font-mono text-text-primary dark:text-text-secondary text-xs bg-surface-1 overflow-hidden sm:overflow-visible w-full h-full sm:h-auto flex-shrink-0 flex flex-col sm:flex-row"
>
  <FirefoxPermissionOverlay />

  {#snippet tabButton(tab)}
    <button
      data-tab={tab.id}
      class="setting-tab-button relative rounded-md flex flex-row w-full py-2 px-3 items-center justify-start gap-3 flex-shrink-0 cursor-pointer transition-colors duration-200 hover:duration-75 {activeTab ===
      tab.id
        ? 'text-text-primary bg-neutral-100 hover:bg-white/60 dark:hover:bg-white/10 dark:bg-surface-2 active'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-surface-2'}"
      aria-current={activeTab === tab.id ? 'page' : undefined}
      onclick={() => switchTab(tab.id)}
    >
      <div class="size-5 flex-shrink-0 flex items-center justify-center">
        {#if activeTab === tab.id}
          <Icon icon={tab.iconSolid} width="20" height="20" />
        {:else}
          <Icon icon={tab.iconOutline} width="20" height="20" />
        {/if}
      </div>
      <span class="text-left text-xs sm:text-sm">{tab.label}</span>
    </button>
  {/snippet}

  <!-- Side stripes (mobile), mirroring the archive page -->
  <div
    class="sm:hidden top-stripes absolute z-50 left-0 inset-y-0 w-2 border-r border-border/70"
  ></div>
  <div
    class="sm:hidden top-stripes absolute z-50 right-0 inset-y-0 w-2 border-l border-border/70"
  ></div>

  <!-- Bottom bar background (mobile): solid content color behind the bar
       (lower half, h-14) fading out above it (upper half), so content scrolls
       softly under the bar instead of being cut at its edge. -->
  <div
    class="sm:hidden absolute bottom-0 left-2 right-2 z-40 h-28 pointer-events-none bg-linear-to-t from-surface-1 from-50% to-surface-1/0 mask-t-from-50% backdrop-blur-[2px]"
  ></div>

  <!-- Bottom bar (mobile): the label area opens the menu sheet (reachable with
       either thumb); the arrows on the right step through the sections. The
       open sheet simply covers the bar. -->
  <div
    class="sm:hidden absolute bottom-0 left-2 right-2 z-40 flex h-14 items-center pr-3"
  >
    <button
      class="flex flex-1 min-w-0 h-full items-center justify-start gap-3 pl-6 cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
      aria-label="Open settings menu"
      aria-expanded={menuOpen}
      aria-controls="settings-mobile-menu"
      onclick={toggleMenu}
    >
      <span class="size-5 flex-shrink-0 flex items-center justify-center">
        <Icon icon="heroicons:bars-3" width="20" height="20" />
      </span>
      <span class="flex items-center gap-1.5 min-w-0 truncate">
        <span>{$t('settings.title')}</span>
        <span class="opacity-50">/</span>
        <span class="text-text-primary truncate">{activeTabInfo.label}</span>
      </span>
    </button>
    {#snippet stepButton(offset, icon, label)}
      <button
        class="size-10 flex-shrink-0 flex items-center justify-center rounded-full cursor-pointer text-text-secondary hover:text-text-primary hover:bg-blackwhite/10 active:bg-blackwhite/15 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        aria-label={label}
        disabled={!allTabs[activeTabIndex + offset]}
        onclick={() => stepTab(offset)}
      >
        <Icon {icon} width="20" height="20" />
      </button>
    {/snippet}
    <!-- Spaced apart: these are touch targets -->
    <div class="flex items-center gap-3 pl-3 flex-shrink-0">
      {@render stepButton(-1, 'heroicons:chevron-left', 'Previous section')}
      {@render stepButton(1, 'heroicons:chevron-right', 'Next section')}
    </div>
  </div>

  {#if menuOpen}
    <!-- Backdrop (mobile) - click outside to close the menu -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      transition:fadeOnly
      class="sm:hidden absolute inset-y-0 left-2 right-2 bg-black/40 z-[45]"
      onclick={toggleMenu}
    ></div>

    <!-- Menu bottom sheet (mobile) -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <nav
      id="settings-mobile-menu"
      transition:sheetFly
      class="sm:hidden absolute bottom-0 left-2 right-2 z-50 flex flex-col max-h-[calc(100%-3rem)] bg-surface-1 rounded-t-2xl border border-b-0 border-border/70 shadow-[0_-8px_24px_rgb(0_0_0/0.25)] {sheetDragging
        ? ''
        : 'transition-transform duration-200 ease-out'}"
      style="transform: translateY({sheetDragY}px)"
      onmousedown={onSheetDragStart}
      ontouchstart={onSheetDragStart}
      onclickcapture={onSheetClickCapture}
    >
      <!-- Drag handle: pull down to dismiss -->
      <div
        bind:this={sheetHandleEl}
        class="flex justify-center pt-2.5 pb-1.5 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
        aria-hidden="true"
      >
        <span class="w-10 h-1 rounded-full bg-border"></span>
      </div>
      <div
        bind:this={sheetListEl}
        class="flex flex-col min-h-0 overflow-y-auto overscroll-contain px-3 pt-1 pb-5 gap-1 select-none [&>button]:py-3.5 [&>button]:gap-4"
      >
        {#each mainTabs as tab}
          {@render tabButton(tab)}
        {/each}
        <div class="h-px bg-border/70 my-3 mx-3 flex-shrink-0"></div>
        {#each footerTabs as tab}
          {@render tabButton(tab)}
        {/each}
      </div>
    </nav>
  {/if}

  <!-- Left Sidebar (Desktop) -->
  <div
    class="hidden sm:flex flex-col bg-background items-stretch text-sm justify-start w-64 sticky top-[calc(1.5rem+1px)] h-[calc(100dvh-3rem-2px)] overflow-hidden border-r border-border z-10 flex-shrink-0"
  >
    <!-- Title for Desktop -->
    <div class="flex justify-center items-center py-4 border-b border-border">
      <p class="font-bold text-center">{$t('settings.title')}</p>
    </div>

    <!-- Navigation container (OverlayScrollbars host) -->
    <div
      bind:this={navScrollEl}
      class="w-full h-full min-h-0 relative overflow-x-hidden overflow-y-auto"
    >
      <div class="flex flex-col w-full min-h-full items-stretch p-3 gap-0.5">
        {#each mainTabs as tab}
          {@render tabButton(tab)}
        {/each}

        <!-- Spacer to push footer to bottom -->
        <div class="flex-grow"></div>

        <!-- Footer Group (What's New, About) -->
        {#each footerTabs as tab}
          {@render tabButton(tab)}
        {/each}
      </div>
    </div>
  </div>

  <!-- Content Area -->
  <div
    id="setting-scroll"
    class="isolate sm:isolation-auto flex-grow min-h-0 min-w-0 mx-2 sm:mx-0 sm:h-auto pb-24 sm:pb-8 overflow-y-auto sm:overflow-visible bg-surface-1"
    bind:this={scrollContainerEl}
  >
    <div class="p-0 sm:p-4">
      {#if activeTab === 'ai-provider'}
        <AIProviderSettings />
      {:else if activeTab === 'summary'}
        <SummarySettings />
      {:else if activeTab === 'chat'}
        <ChatSettings />
      {:else if activeTab === 'appearance'}
        <AppearanceSettings />
      {:else if activeTab === 'fab'}
        <FABSettings />
      {:else if import.meta.env.BROWSER === 'firefox' && activeTab === 'site-access'}
        <SitePermissionsSettings />
      {:else if activeTab === 'deep-dive'}
        <div class="px-5"><DeepDiveToolSettings /></div>
      {:else if activeTab === 'data-sync'}
        <DataSyncSettings />
      {:else if activeTab === 'whats-new'}
        <ReleaseNote />
      {:else if activeTab === 'about'}
        <AboutSettings />
      {/if}
    </div>
  </div>
</div>

<style>
  .setting-tab-button::after {
    content: '';
    display: block;
    position: absolute;
    background: white;
    transition: all 0.3s ease-in-out;
    box-shadow:
      0 0 2px #ffffff18,
      0 0 0 #ffffff18;
    width: 0px;
    top: 50%;
    transform: translateY(-50%) translateX(-0.25rem);
    left: -0.75rem;
    height: 1rem;
    border-radius: 0 4px 4px 0;
  }

  .setting-tab-button.active::after {
    transform: translateY(-50%) translateX(1px);
    width: 4px;
    box-shadow:
      4px 0 8px 2px #ffffff71,
      0 0 3px 1px #ffffff94;
  }
</style>
