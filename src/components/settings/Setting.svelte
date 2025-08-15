<script>
  // @ts-nocheck
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import {
    settings,
    loadSettings,
    updateSettings,
  } from '@/stores/settingsStore.svelte.js'
  import AIModelSettings from '@/components/settings/AIModelSettings.svelte'
  import SummarySettings from '@/components/settings/SummarySettings.svelte'
  import GeneralSettings from '@/components/settings/GeneralSettings.svelte'

  let activeTab = $state('ai-model') // State variable for current tab
  let activeBarTransformClass = $state('-translate-x-18') // New variable to control transform
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

  // Effect to update transform class for activebar
  $effect(() => {
    switch (activeTab) {
      case 'ai-model':
        activeBarTransformClass = '-translate-x-18'
        break
      case 'summary':
        activeBarTransformClass = 'translate-x-0'
        break
      case 'general': // Note: this tab has id 'general' in the button
        activeBarTransformClass = 'translate-x-18'
        break
      default:
        activeBarTransformClass = '-translate-x-18' // Default value
    }
  })
</script>

<!-- Apply Tailwind classes for overall layout and styling -->
<div
  class="relative settings font-mono text-text-primary dark:text-text-secondary text-xs bg-background dark:bg-surface-1 overflow-hidden w-full flex-shrink-0 flex flex-col"
>
  <div
    class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
  >
    <p class="!text-center">{$t('settings.title')}</p>
  </div>

  <div
    class="flex bg-background items-center text-[0.65rem] justify-center p-3 gap-2"
  >
    <button
      class="flex flex-col w-16 items-center justify-center gap-1 cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'ai-model'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => (activeTab = 'ai-model')}
    >
      <div class="size-5">
        {#if activeTab === 'ai-model'}
          <Icon icon="heroicons:sparkles-solid" width="20" height="20" />
        {:else}
          <Icon icon="heroicons:sparkles" width="20" height="20" />
        {/if}
      </div>
      <span>Model</span>
    </button>
    <button
      class="flex flex-col w-16 items-center gap-1 justify-center cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'summary'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => (activeTab = 'summary')}
    >
      <div class="size-5">
        {#if activeTab === 'summary'}
          <Icon icon="heroicons:document-text-solid" width="20" height="20" />
        {:else}
          <Icon icon="heroicons:document-text" width="20" height="20" />
        {/if}
      </div>
      <span> Summary</span>
    </button>
    <button
      class="flex flex-col w-16 items-center gap-1 justify-center cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'general'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => (activeTab = 'general')}
    >
      <div class="size-5">
        {#if activeTab === 'general'}
          <Icon icon="heroicons:swatch-solid" width="20" height="20" />
        {:else}
          <Icon icon="heroicons:swatch" width="20" height="20" />
        {/if}
      </div>
      <span> General</span>
    </button>
  </div>
  <div
    class="top-stripes relative bg-background flex justify-center items-center h-2 border border-border border-l-0 border-r-0"
  >
    <div
      id="activebar"
      class="w-14 h-1 rounded-xs relative bg-white skew-x-[45deg] transition-transform duration-400 ease-out {activeBarTransformClass}"
    >
      <div class=" absolute rounded-xs -inset-px bg-white"></div>
      <div
        class=" -skew-x-[30deg] absolute -inset-px bg-white/50 blur-xs"
      ></div>
      <div
        class=" -skew-x-[30deg] absolute -inset-px bg-white/50 blur-[2px]"
      ></div>
    </div>
  </div>
  <div
    id="setting-scroll"
    class="sm:h-[calc(100vh-9.5rem)] h-[calc(100vh-6.35rem)] overflow-y-auto"
  >
    <div>
      {#if activeTab === 'ai-model'}
        <AIModelSettings />
      {:else if activeTab === 'summary'}
        <SummarySettings />
      {:else if activeTab === 'general'}
        <GeneralSettings />
      {/if}
    </div>
  </div>
  <!-- Summary Format Section -->
</div>

<style>
  .setting-block {
    background-color: var(--color-surface-1);
  }
</style>
