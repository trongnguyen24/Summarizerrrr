<script>
  // @ts-nocheck
  import { onMount } from 'svelte'
  // import './styles/floating-ui.css'
  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import {
    themeSettings,
    loadThemeSettings,
    initializeShadowTheme,
    subscribeToShadowSystemThemeChanges,
  } from '@/stores/themeStore.svelte.js'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade'
  import { summaryState } from '../../stores/summaryStore.svelte.js'
  import FloatingButton from './components/FloatingButton.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import MobileSheet from './components/MobileSheet.svelte'

  let isPanelVisible = $state(false) // Add $state
  let isMobile = $state(false) // Add $state
  let shadowContainer = $state(null) // Shadow DOM container reference

  // Initialize stores
  $effect(() => {
    loadSettings()
    subscribeToSettingsChanges()
  })

  // Initialize shadow theme when component mounts
  $effect(() => {
    if (shadowContainer) {
      initializeShadowTheme(shadowContainer)
      subscribeToShadowSystemThemeChanges(shadowContainer)
    }
  })

  onMount(() => {
    const checkMobile = () => {
      // Đặt threshold thấp hơn để ưu tiên sidepanel trên desktop/tablet
      isMobile = window.innerWidth < 480
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  })

  function togglePanel() {
    isPanelVisible = !isPanelVisible
  }

  async function requestSummary() {
    console.log('Requesting page summary...')
    try {
      const response = await browser.runtime.sendMessage({
        type: 'REQUEST_SUMMARY',
        payload: {
          url: window.location.href,
        },
        // For page summary, we assume type is 'pageSummary'
        type: 'pageSummary',
      })
      console.log('Summary request response:', response)
    } catch (error) {
      console.error('Failed to request summary:', error)
    }
  }
</script>

<div bind:this={shadowContainer} class="floating-ui-root absolute top-0 left-0">
  <!-- rerender when settings.floatButton changes -->
  {#if settings.showFloatingButton}
    {#key settings.floatButton}
      <FloatingButton topButton={settings.floatButton} toggle={togglePanel} />
    {/key}
  {/if}
  {#if isMobile}
    <MobileSheet
      visible={isPanelVisible}
      onclose={() => (isPanelVisible = false)}
    />
  {:else}
    <!-- Sidepanel for desktop/tablet -->
    <FloatingPanel
      visible={isPanelVisible}
      onclose={() => (isPanelVisible = false)}
      summary={summaryState.summary}
      status={summaryState.isLoading
        ? 'loading'
        : summaryState.summaryError
          ? 'error'
          : 'idle'}
    >
      {#snippet actionButton()}
        <!-- FloatingPanel now has its own summarizePageContent function -->
        <button onclick={requestSummary}>Summarize (Global)</button>
      {/snippet}
      {#snippet settingsMini()}
        <!-- <SettingsMini /> -->
        <div>Settings Mini (placeholder)</div>
      {/snippet}
    </FloatingPanel>
  {/if}
</div>
