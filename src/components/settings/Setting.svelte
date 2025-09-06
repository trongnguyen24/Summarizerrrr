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
  import FABSettings from '@/components/settings/FABSettings.svelte'
  import AboutSettings from './AboutSettings.svelte'

  let activeTab = $state('ai-model') // State variable for current tab
  let tabContainerEl // Reference to the tab container element
  let activeBarEl // Reference to the active bar element
  let scrollContainerEl // Reference to the scroll container element

  // Function to update the active bar's position dynamically
  function updateActiveBarPosition() {
    if (!tabContainerEl) return
    scrollContainerEl.scrollTop = 0
    document.querySelector('#setting-scroll > div:nth-child(1)').scrollTop = 0
    const activeButton = tabContainerEl.querySelector(
      `[data-tab='${activeTab}']`
    )
    if (!activeButton || !activeBarEl) return

    const containerRect = tabContainerEl.getBoundingClientRect()
    const buttonRect = activeButton.getBoundingClientRect()

    const activeBarOffset =
      buttonRect.left -
      containerRect.left +
      buttonRect.width / 2 -
      activeBarEl.offsetWidth / 2

    activeBarEl.style.transform = `translateX(${activeBarOffset}px) skewX(45deg)`
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
</script>

<!-- Apply Tailwind classes for overall layout and styling -->
<div
  class="relative settings font-mono text-text-primary dark:text-text-secondary text-xs bg-surface-1 overflow-hidden w-full flex-shrink-0 flex flex-col"
>
  <div
    class="px-4 sm:order-1 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
  >
    <p class="!text-center">{$t('settings.title')}</p>
  </div>

  <div
    class="flex order-4 sm:order-2 bg-background items-center text-[0.65rem] justify-center p-3 gap-2"
    bind:this={tabContainerEl}
  >
    <button
      data-tab="ai-model"
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
      data-tab="summary"
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
      data-tab="fab"
      class="flex flex-col w-16 items-center gap-1 justify-center cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'fab'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => (activeTab = 'fab')}
    >
      <div class="size-5">
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
      <span>FAB</span>
    </button>
    <button
      data-tab="general"
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

    <button
      data-tab="about"
      class="flex flex-col w-16 items-center gap-1 justify-center cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'about'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => (activeTab = 'about')}
    >
      <div class="size-5">
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
      <span>About</span>
    </button>
  </div>
  <div
    class="top-stripes order-3 relative bg-background flex items-center h-2 border border-border border-l-0 border-r-0"
  >
    <div
      id="activebar"
      bind:this={activeBarEl}
      class="w-14 left-0.5 h-1 rounded-xs relative bg-white skew-x-[45deg] transition-transform duration-300 ease-out"
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
    class="sm:h-[calc(100dvh-9.5rem)] order-2 sm:order-4 h-[calc(100dvh-6.35rem)] overflow-y-auto"
    bind:this={scrollContainerEl}
  >
    <div>
      {#if activeTab === 'ai-model'}
        <AIModelSettings />
      {:else if activeTab === 'summary'}
        <SummarySettings />
      {:else if activeTab === 'general'}
        <GeneralSettings />
      {:else if activeTab === 'fab'}
        <FABSettings />
      {:else if activeTab === 'about'}
        <AboutSettings />
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
