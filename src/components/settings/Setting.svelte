<script>
  // @ts-nocheck
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import Icon, { loadIcons } from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import DeepDiveToolSettings from './tools/DeepDiveToolSettings.svelte'
  import PerTabCacheToolSettings from './tools/PerTabCacheToolSettings.svelte'
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
      id: 'deep-dive',
      label: 'Deep Dive',
      iconSolid: 'heroicons:light-bulb-solid',
      iconOutline: 'heroicons:light-bulb',
    },
    {
      id: 'per-tab-cache',
      label: 'Tab on Sidepanel',
      iconSolid: 'heroicons:document-duplicate-solid',
      iconOutline: 'heroicons:document-duplicate',
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

  // Flat list for mobile and icon preloading
  const allTabs = [...mainTabs, ...footerTabs]

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

  // Use $effect to initialize OverlayScrollbars (only on mobile non-touch devices)
  $effect(() => {
    const tocElement = document.getElementById('setting-scroll')
    const isDesktop = window.matchMedia('(min-width: 640px)').matches
    if (tocElement && !isTouchDevice() && !isDesktop) {
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
    'heroicons:light-bulb-solid',
    'heroicons:light-bulb',
    'heroicons:document-duplicate-solid',
    'heroicons:document-duplicate',
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
  class="relative settings font-mono text-text-primary dark:text-text-secondary text-xs bg-surface-1 overflow-hidden sm:overflow-visible w-full h-full sm:h-auto flex-shrink-0 flex flex-col sm:flex-row"
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
    class="flex flex-row sm:flex-col order-4 sm:order-1 bg-background items-center sm:items-stretch text-[0.65rem] sm:text-sm justify-center sm:justify-start sm:w-64 sm:sticky sm:top-[calc(1.5rem+1px)] sm:h-[calc(100dvh-3rem-2px)] sm:overflow-hidden border-t sm:border-t-0 sm:border-r border-border z-10 flex-shrink-0"
  >
    <!-- Title for Desktop -->
    <div
      class="hidden sm:flex justify-center items-center py-4 border-b border-border"
    >
      <p class="font-bold text-center">{$t('settings.title')}</p>
    </div>

    <!-- Navigation container -->
    <div
      class="flex flex-row sm:flex-col w-full sm:h-full sm:min-h-0 items-center sm:items-stretch p-3 gap-0.5 relative overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto no-scrollbar"
    >
      {#snippet tabButton(tab)}
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
          <span class="text-center text-xs sm:text-left">{tab.label}</span>
        </button>
      {/snippet}

      {#each mainTabs as tab}
        {@render tabButton(tab)}
      {/each}

      <!-- Spacer to push footer to bottom (desktop only) -->
      <div class="hidden sm:block sm:flex-grow"></div>

      <!-- Footer Group (What's New, About) -->
      {#each footerTabs as tab}
        {@render tabButton(tab)}
      {/each}
    </div>
  </div>

  <!-- Content Area -->
  <div
    id="setting-scroll"
    class="flex-grow order-2 sm:order-2 h-[calc(100dvh-6.35rem)] sm:h-auto pb-16 sm:pb-8 overflow-y-auto sm:overflow-visible bg-surface-1"
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
      {:else if activeTab === 'deep-dive'}
        <div class="px-5"><DeepDiveToolSettings /></div>
      {:else if activeTab === 'per-tab-cache'}
        <div class="px-5"><PerTabCacheToolSettings /></div>
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
  }

  /* Desktop layout (sidebar right border) */
  @media (min-width: 640px) {
    .setting-tab-button::after {
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
  }

  /* Mobile layout (bottom bar top border) */
  @media (max-width: 639px) {
    .setting-tab-button::after {
      height: 0px;
      left: 50%;
      transform: translateX(-50%) translateY(-0.25rem);
      top: -0.5rem;
      width: 1rem;
      border-radius: 0 0 4px 4px;
    }

    .setting-tab-button.active::after {
      transform: translateX(-50%) translateY(1px);
      height: 4px;
      box-shadow:
        0 4px 8px 2px #ffffff71,
        0 0 3px 1px #ffffff94;
    }
  }
</style>
