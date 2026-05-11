<script>
  // @ts-nocheck
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import Icon, { loadIcons } from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import {
    loadSettings,
    settings,
    updateSettings,
  } from '@/stores/settingsStore.svelte.js'
  import { domVisibility } from '@/stores/stateAbout.svelte.js'
  import AIProviderSettings from './AIProviderSettings.svelte'
  import AppearanceSettings from './AppearanceSettings.svelte'
  import DataSyncSettings from './DataSyncSettings.svelte'
  import SummarySettings from './SummarySettings.svelte'
  import FABSettings from '@/components/settings/FABSettings.svelte'
  import AboutSettings from './AboutSettings.svelte'
  import ReleaseNote from './ReleaseNote.svelte'
  import { getTabFromURL, updateTabInURL } from '@/lib/utils/urlUtils.js'

  let activeTab = $state(getTabFromURL()) // Initialize tab from URL
  let scrollContainerEl // Reference to the scroll container element

  const tabs = [
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
    {
      id: 'data-sync',
      label: 'Data & Sync',
      iconSolid: 'heroicons:cloud-arrow-up-solid',
      iconOutline: 'heroicons:cloud-arrow-up',
    },
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

  $effect(() => {
    // React to activeTab changes
    const currentTab = activeTab
    if (scrollContainerEl) scrollContainerEl.scrollTop = 0
    const scrollContent = document.querySelector(
      '#setting-scroll > div:nth-child(1)',
    )
    if (scrollContent) scrollContent.scrollTop = 0
  })

  // Function to handle tab switching with URL update
  function switchTab(tabName) {
    activeTab = tabName
    updateTabInURL(tabName)
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
    'heroicons:cpu-chip-solid',
    'heroicons:cpu-chip',
    'heroicons:sparkles-solid',
    'heroicons:sparkles',
    'heroicons:swatch-solid',
    'heroicons:swatch',
    'heroicons:cursor-arrow-rays-solid',
    'heroicons:cursor-arrow-rays',
    'heroicons:cloud-arrow-up-solid',
    'heroicons:cloud-arrow-up',
    'heroicons:megaphone-solid',
    'heroicons:megaphone',
    'heroicons:information-circle-solid',
    'heroicons:information-circle',
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
    class="flex flex-row sm:flex-col order-4 sm:order-1 bg-background items-center sm:items-stretch text-[0.65rem] sm:text-sm justify-center sm:justify-start sm:w-64 border-t sm:border-t-0 sm:border-r border-border z-10 flex-shrink-0"
  >
    <!-- Title for Desktop -->
    <div
      class="hidden sm:flex justify-center items-center py-4 border-b border-border"
    >
      <p class="font-bold text-center">{$t('settings.title')}</p>
    </div>

    <!-- Navigation container -->
    <div
      class="flex flex-row sm:flex-col w-full items-center sm:items-stretch p-3 gap-0.5 relative overflow-x-auto sm:overflow-x-visible no-scrollbar"
    >
      {#each tabs as tab}
        <button
          data-tab={tab.id}
          class="setting-tab-button relative rounded-md flex flex-col sm:flex-row w-16 sm:w-full py-2 px-3 items-center sm:justify-start justify-center gap-1 sm:gap-3 flex-shrink-0 cursor-pointer transition-colors duration-200 hover:duration-75 {activeTab ===
          tab.id
            ? 'text-text-primary bg-neutral-100 hover:bg-white/60 dark:hover:bg-white/10 dark:bg-surface-2 active'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-1 dark:hover:bg-surface-2'}"
          onclick={() => switchTab(tab.id)}
        >
          <div class="size-5 flex-shrink-0 flex items-center justify-center">
            {#if activeTab === tab.id}
              <Icon icon={tab.iconSolid} width="20" height="20" />
            {:else}
              <Icon icon={tab.iconOutline} width="20" height="20" />
            {/if}
          </div>
          <span class="text-center sm:text-left">{tab.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Content Area -->
  <div
    id="setting-scroll"
    class="flex-grow order-2 sm:order-2 h-[calc(100dvh-6.35rem)] sm:h-full pb-16 sm:pb-8 overflow-y-auto bg-surface-1"
    bind:this={scrollContainerEl}
  >
    <div class="p-0 sm:p-4">
      {#if activeTab === 'ai-provider'}
        <AIProviderSettings />
      {:else if activeTab === 'summary'}
        <SummarySettings />
      {:else if activeTab === 'appearance'}
        <AppearanceSettings />
      {:else if activeTab === 'fab'}
        <FABSettings />
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
