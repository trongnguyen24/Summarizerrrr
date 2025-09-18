<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import './styles/floating-ui.css'
  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import {
    themeSettings,
    loadThemeSettings,
    subscribeToShadowThemeChanges,
  } from '@/stores/themeStore.svelte.js'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade'
  import { summaryState } from '../../stores/summaryStore.svelte.js'
  import FloatingButton from './components/FloatingButton.svelte'
  import FloatingPanel from './components/FloatingPanel.svelte'
  import MobileSheet from './components/MobileSheet.svelte'
  import { useNavigationManager } from './composables/useNavigationManager.svelte.js'
  import { useOneClickSummarization } from './composables/useOneClickSummarization.svelte.js'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'

  let isPanelVisible = $state(false) // Add $state
  let isMobile = $state(false) // Add $state
  let shadowContainer = $state(null) // Shadow DOM container reference
  let navigationManager = useNavigationManager()
  let unsubscribeNavigation = null
  let currentUrlKey = $state(window.location.href)
  let themeUnsubscribe = null

  // One-click summarization
  let oneClickSummarization = useOneClickSummarization()

  // Initialize stores
  $effect(() => {
    loadSettings()
    subscribeToSettingsChanges()
  })

  // Initialize shadow theme when component mounts
  $effect(() => {
    if (shadowContainer) {
      // Just load the theme settings, direct application is handled by $effect below
      loadThemeSettings()
      // Subscribe to theme changes for real-time updates
      themeUnsubscribe = subscribeToShadowThemeChanges(shadowContainer)
    }
  })

  // Apply font family based on settings to shadow DOM
  $effect(() => {
    if (shadowContainer && settings.selectedFont !== undefined) {
      // Map selectedFont to corresponding CSS class
      const fontClassMap = {
        default: 'font-default',
        'noto-serif': 'font-noto-serif',
        opendyslexic: 'font-opendyslexic',
        mali: 'font-mali',
      }

      const fontClass = fontClassMap[settings.selectedFont] || 'font-default'

      // Remove existing font classes and add the new one
      shadowContainer.className = shadowContainer.className
        .split(' ')
        .filter((c) => !c.startsWith('font-'))
        .join(' ')
      shadowContainer.classList.add(fontClass)
    }
  })

  // Apply theme based on themeSettings to shadow DOM
  $effect(() => {
    if (shadowContainer && themeSettings.theme !== undefined) {
      const apply = (theme) => {
        if (theme === 'dark') {
          shadowContainer.classList.add('dark')
        } else {
          shadowContainer.classList.remove('dark')
        }
      }

      if (themeSettings.theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
          .matches
          ? 'dark'
          : 'light'
        apply(systemTheme)
      } else {
        apply(themeSettings.theme)
      }
    }
  })

  onMount(() => {
    const checkMobile = () => {
      // Đặt threshold thấp hơn để ưu tiên sidepanel trên desktop/tablet
      isMobile = window.innerWidth < 480
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Bắt đầu monitoring navigation changes
    navigationManager.startMonitoring()
    unsubscribeNavigation = navigationManager.subscribe(handleUrlChange)

    // Listen for system theme changes to update shadow DOM
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (shadowContainer && themeSettings.theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light'
        if (systemTheme === 'dark') {
          shadowContainer.classList.add('dark')
        } else {
          shadowContainer.classList.remove('dark')
        }
      }
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    return () => {
      window.removeEventListener('resize', checkMobile)
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
      // Cleanup navigation monitoring
      if (unsubscribeNavigation) {
        unsubscribeNavigation()
      }
      navigationManager.stopMonitoring()
    }
  })

  function togglePanel() {
    isPanelVisible = !isPanelVisible
  }

  // Handle one-click summarization
  async function handleOneClickSummarization() {
    return await oneClickSummarization.handleFloatingButtonClick()
  }

  // Initialize one-click when component mounts
  $effect(() => {
    if (settings && shadowContainer) {
      oneClickSummarization.initializeForUrl(window.location.href, () => {
        isPanelVisible = true
      })
    }
  })

  function handleUrlChange(newUrl) {
    // Khi URL thay đổi, chúng ta cần reinitialize components
    // Tạm thời đóng panel để tránh state conflict
    isPanelVisible = false

    // Update URL key để force re-render components
    currentUrlKey = newUrl

    // Initialize one-click for new URL
    oneClickSummarization.initializeForUrl(newUrl, () => {
      isPanelVisible = true
    })

    // Force re-render components bằng cách thay đổi key
    // Điều này sẽ khiến Svelte tạo lại components mới
    console.log('URL changed to:', newUrl)
  }

  onDestroy(() => {
    // Cleanup navigation monitoring
    if (unsubscribeNavigation) {
      unsubscribeNavigation()
    }
    navigationManager.stopMonitoring()

    // Cleanup theme subscription
    if (themeUnsubscribe) {
      themeUnsubscribe()
    }
  })
</script>

<div bind:this={shadowContainer} class="floating-ui-root absolute top-0 left-0">
  <!-- rerender when settings.floatButton changes -->
  {#if settings.showFloatingButton}
    {#key settings.floatButton}
      <FloatingButton
        topButton={settings.floatButton}
        toggle={togglePanel}
        oneClickHandler={handleOneClickSummarization}
        buttonState={oneClickSummarization.oneClickState().buttonState}
      />
    {/key}
  {/if}
  {#if isMobile}
    {#key currentUrlKey}
      <MobileSheet
        visible={isPanelVisible}
        onclose={() => (isPanelVisible = false)}
        summarization={oneClickSummarization}
      />
    {/key}
  {:else}
    <!-- Sidepanel for desktop/tablet -->
    {#key currentUrlKey}
      <FloatingPanel
        visible={isPanelVisible}
        onclose={() => (isPanelVisible = false)}
        summary={oneClickSummarization.summaryToDisplay()}
        status={oneClickSummarization.statusToDisplay()}
        summarization={oneClickSummarization}
      >
        {#snippet settingsMini()}
          <!-- <SettingsMini /> -->
          <div>Settings Mini (placeholder)</div>
        {/snippet}
      </FloatingPanel>
    {/key}
  {/if}
</div>
