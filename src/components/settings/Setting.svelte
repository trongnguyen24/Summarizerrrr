<script>
  // @ts-nocheck
  import Icon, { loadIcons } from '@iconify/svelte'
  import { Dialog } from 'bits-ui'
  import { t } from 'svelte-i18n'
  import Logdev from './Logdev.svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import {
    settings,
    loadSettings,
    updateSettings,
  } from '@/stores/settingsStore.svelte.js'
  import { domVisibility } from '@/stores/stateAbout.svelte.js'
  import ModelSummarySettings from '@/components/settings/ModelSummarySettings.svelte'
  import GeneralSettings from '@/components/settings/GeneralSettings.svelte'
  import FABSettings from '@/components/settings/FABSettings.svelte'
  import AboutSettings from './AboutSettings.svelte'
  import ToolsSettings from './ToolsSettings.svelte'
  import ReleaseNote from './ReleaseNote.svelte'
  import { getTabFromURL } from '@/lib/utils/urlUtils.js'

  let activeTab = $state(getTabFromURL()) // Initialize tab from URL
  let tabContainerEl // Reference to the tab container element
  let activeBarEl // Reference to the active bar element
  let scrollContainerEl // Reference to the scroll container element

  // Function to update the active bar's position dynamically
  function updateActiveBarPosition() {
    if (!tabContainerEl) return
    if (scrollContainerEl) scrollContainerEl.scrollTop = 0
    const scrollContent = document.querySelector('#setting-scroll > div:nth-child(1)')
    if (scrollContent) scrollContent.scrollTop = 0
    const activeButton = tabContainerEl.querySelector(
      `[data-tab='${activeTab}']`,
    )
    if (!activeButton || !activeBarEl) return

    const containerRect = tabContainerEl.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()

    const isDesktop = window.innerWidth >= 640

    if (isDesktop) {
      const activeBarOffset =
        buttonRect.top -
        containerRect.top +
        buttonRect.height / 2 -
        activeBarEl.offsetHeight / 2

      activeBarEl.style.transform = `translateY(${activeBarOffset}px)`
    } else {
      const activeBarOffset =
        buttonRect.left -
        containerRect.left +
        buttonRect.width / 2 -
        activeBarEl.offsetWidth / 2

      activeBarEl.style.transform = `translateX(${activeBarOffset}px)`
    }
  }

  // Effect to update the bar when the active tab changes
  $effect(updateActiveBarPosition)

  // Effect for handling resize events
  $effect(() => {
    if (!tabContainerEl) return

    const resizeObserver = new ResizeObserver(() => {
      updateActiveBarPosition()
    })

    resizeObserver.observe(tabContainerEl)

    return () => {
      resizeObserver.disconnect()
    }
  })

  // Function to handle tab switching with URL update
  function switchTab(tabName) {
    activeTab = tabName
  }
  const options = {
    scrollbars: {
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  // Use $effect to initialize OverlayScrollbars (only on non-touch devices)
  $effect(() => {
    const tocElement = document.getElementById('setting-scroll')
    if (tocElement && !isTouchDevice()) {
      initialize(tocElement)
    }
  })

  // Use $effect to load settings from stores when the component mounts
  $effect(async () => {
    await loadSettings()
  })

  // Use $effect to save settings when they change

  // No longer needed, handled by the dynamic position effects
  loadIcons([
    'heroicons:sparkles-solid',
    'heroicons:sparkles',
    'heroicons:document-text-solid',
    'heroicons:document-text',
    'heroicons:cursor-arrow-rays-solid',
    'heroicons:cursor-arrow-rays',
    'heroicons:swatch-solid',
    'heroicons:swatch',
    'heroicons:information-circle-solid',
    'heroicons:information-circle',
    'heroicons:wrench-screwdriver-solid',
    'heroicons:wrench-screwdriver',
    // Icons from AboutSettings.svelte
    'heroicons:circle-stack',
    'heroicons:adjustments-horizontal',
    'heroicons:device-phone-mobile',
    'mdi:github',
    'logos:chrome',
    'logos:firefox',
    'logos:microsoft-edge',
    'heroicons:arrow-up-right-16-solid',
    'mdi:reddit',
  ])
  import FirefoxPermissionOverlay from './FirefoxPermissionOverlay.svelte'
</script>

<div
  class="relative settings font-mono text-text-primary dark:text-text-secondary text-xs bg-surface-1 overflow-hidden w-full h-full flex-shrink-0 flex flex-col sm:flex-row"
>
  <FirefoxPermissionOverlay />

  <!-- Title for Mobile -->
  <div
    class="flex sm:hidden justify-center relative items-center py-2 bg-background border-b-0 border-border"
  >
    <p class="!text-center">{$t('settings.title')}</p>
  </div>

  <!-- Left Sidebar (Desktop) / Bottom Bar (Mobile) -->
  <div
    class="flex flex-row sm:flex-col order-4 sm:order-1 bg-background items-center sm:items-stretch text-[0.65rem] sm:text-sm justify-center sm:justify-start sm:w-40 border-t sm:border-t-0 sm:border-r border-border z-10 flex-shrink-0"
  >
    <!-- Title for Desktop -->
    <div class="hidden sm:flex justify-center items-center py-4 border-b border-border">
      <p class="font-bold text-center">{$t('settings.title')}</p>
    </div>

    <!-- Navigation container -->
    <div class="flex flex-row sm:flex-col w-full items-center sm:items-stretch sm:p-0 p-2 sm:py-2 gap-2 sm:gap-1 relative" bind:this={tabContainerEl}>
      <button
        data-tab="ai-summary"
        class="flex flex-col sm:flex-row w-16 sm:w-full sm:py-3 sm:px-4 items-center sm:justify-start justify-center gap-1 sm:gap-3 cursor-pointer transition-colors duration-200 {activeTab ===
        'ai-summary'
          ? ' text-blackwhite sm:bg-surface-2'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/50'}"
        onclick={() => switchTab('ai-summary')}
      >
        <div class="size-5 flex-shrink-0 flex items-center justify-center">
          {#if activeTab === 'ai-summary'}
            <Icon icon="heroicons:sparkles-solid" width="20" height="20" />
          {:else}
            <Icon icon="heroicons:sparkles" width="20" height="20" />
          {/if}
        </div>
        <span class="text-center sm:text-left">Summary</span>
      </button>

      <button
        data-tab="fab"
        class="flex flex-col sm:flex-row w-16 sm:w-full sm:py-3 sm:px-4 items-center sm:justify-start justify-center gap-1 sm:gap-3 cursor-pointer transition-colors duration-200 {activeTab ===
        'fab'
          ? ' text-blackwhite sm:bg-surface-2'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/50'}"
        onclick={() => switchTab('fab')}
      >
        <div class="size-5 flex-shrink-0 flex items-center justify-center">
          {#if activeTab === 'fab'}
            <Icon
              icon="heroicons:cursor-arrow-rays-solid"
              width="20"
              height="20"
            />
          {:else}
            <Icon icon="heroicons:cursor-arrow-rays" width="20" height="20" />
          {/if}
        </div>
        <span class="text-center sm:text-left">FAB</span>
      </button>

      <button
        data-tab="general"
        class="flex flex-col sm:flex-row w-16 sm:w-full sm:py-3 sm:px-4 items-center sm:justify-start justify-center gap-1 sm:gap-3 cursor-pointer transition-colors duration-200 {activeTab ===
        'general'
          ? ' text-blackwhite sm:bg-surface-2'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/50'}"
        onclick={() => switchTab('general')}
      >
        <div class="size-5 flex-shrink-0 flex items-center justify-center">
          {#if activeTab === 'general'}
            <Icon icon="heroicons:swatch-solid" width="20" height="20" />
          {:else}
            <Icon icon="heroicons:swatch" width="20" height="20" />
          {/if}
        </div>
        <span class="text-center sm:text-left">General</span>
      </button>

      <button
        data-tab="tools"
        class="flex flex-col sm:flex-row w-16 sm:w-full sm:py-3 sm:px-4 items-center sm:justify-start justify-center gap-1 sm:gap-3 cursor-pointer transition-colors duration-200 {activeTab ===
        'tools'
          ? ' text-blackwhite sm:bg-surface-2'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/50'}"
        onclick={() => switchTab('tools')}
      >
        <div class="size-5 flex-shrink-0 flex items-center justify-center">
          {#if activeTab === 'tools'}
            <Icon
              icon="heroicons:wrench-screwdriver-solid"
              width="20"
              height="20"
            />
          {:else}
            <Icon icon="heroicons:wrench-screwdriver" width="20" height="20" />
          {/if}
        </div>
        <span class="text-center sm:text-left">Tools</span>
      </button>

      <button
        data-tab="about"
        class="flex flex-col sm:flex-row w-16 sm:w-full sm:py-3 sm:px-4 items-center sm:justify-start justify-center gap-1 sm:gap-3 cursor-pointer transition-colors duration-200 {activeTab ===
        'about'
          ? ' text-blackwhite sm:bg-surface-2'
          : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/50'}"
        onclick={() => switchTab('about')}
      >
        <div class="size-5 flex-shrink-0 flex items-center justify-center">
          {#if activeTab === 'about'}
            <Icon
              icon="heroicons:information-circle-solid"
              width="20"
              height="20"
            />
          {:else}
            <Icon icon="heroicons:information-circle" width="20" height="20" />
          {/if}
        </div>
        <span class="text-center sm:text-left">About</span>
      </button>

      <!-- Active Bar Indicator -->
      <div
        class="absolute left-0 top-0 sm:right-0 sm:left-auto w-full h-0 sm:w-0 sm:h-full pointer-events-none"
      >
        <div
          id="activebar"
          bind:this={activeBarEl}
          class="w-14 h-1 sm:w-1 sm:h-11 bg-white sm:-translate-x-1 sm:rounded-sm absolute left-0 top-0 sm:top-auto sm:left-auto sm:right-0 transition-transform duration-300 ease-out"
        >
          <div class="absolute inset-0 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Content Area -->
  <div
    id="setting-scroll"
    class="flex-grow order-2 sm:order-2 h-[calc(100dvh-6.35rem)] sm:h-full pb-16 sm:pb-8 overflow-y-auto bg-surface-1"
    bind:this={scrollContainerEl}
  >
    <div class="p-0 sm:p-4">
      {#if activeTab === 'ai-summary'}
        <ModelSummarySettings />
      {:else if activeTab === 'general'}
        <GeneralSettings />
      {:else if activeTab === 'fab'}
        <FABSettings />
      {:else if activeTab === 'about'}
        <AboutSettings />
      {:else if activeTab === 'tools'}
        <ToolsSettings />
      {/if}
    </div>
  </div>
  <!-- Summary Format Section -->
</div>

<!-- Apply Tailwind classes for overall layout and styling -->
<Dialog.Root bind:open={domVisibility.value}>
  <Dialog.Content>
    <button
      onclick={domVisibility.toggle}
      aria-label="Close"
      class="group absolute font-mono z-[999] flex items-center right-1.5 top-1.5 text-sm py-1.5 px-2 bg-surface-1 dark:bg-surface-2 border border-border"
      ><svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
      >
        <path
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
      <span
        class=" absolute inset-0 bg-blackwhite/0 transition-colors group-hover:bg-blackwhite/5"
      ></span>
    </button>
    <ReleaseNote />
  </Dialog.Content>
</Dialog.Root>
