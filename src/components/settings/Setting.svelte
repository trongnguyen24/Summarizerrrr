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
  let scrollContainerEl // Reference to the scroll container element

  const tabs = [
    {
      id: 'ai-summary',
      label: 'Summary',
      iconSolid: 'heroicons:sparkles-solid',
      iconOutline: 'heroicons:sparkles',
    },
    {
      id: 'fab',
      label: 'FAB',
      iconSolid: 'heroicons:cursor-arrow-rays-solid',
      iconOutline: 'heroicons:cursor-arrow-rays',
    },
    {
      id: 'general',
      label: 'General',
      iconSolid: 'heroicons:swatch-solid',
      iconOutline: 'heroicons:swatch',
    },
    {
      id: 'tools',
      label: 'Tools',
      iconSolid: 'heroicons:wrench-screwdriver-solid',
      iconOutline: 'heroicons:wrench-screwdriver',
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
      class="flex flex-row sm:flex-col w-full items-center sm:items-stretch p-3 gap-0.5 relative"
    >
      {#each tabs as tab}
        <button
          data-tab={tab.id}
          class="setting-tab-button relative rounded-md flex flex-col sm:flex-row w-16 sm:w-full py-2 px-3 items-center sm:justify-start justify-center gap-1 sm:gap-3 cursor-pointer transition-colors duration-200 hover:duration-75 {activeTab ===
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
