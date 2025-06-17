<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import SettingButton from '../../components/SettingButton.svelte'
  import SummarizeButton from '../../components/SummarizeButton.svelte'
  import TabNavigation from '../../components/TabNavigation.svelte' // Vẫn cần cho các component wrapper
  import SummaryDisplay from '../../components/SummaryDisplay.svelte' // Component hiển thị chung
  import UdemyConceptsDisplay from '../../components/displays/UdemyConceptsDisplay.svelte' // Component nội dung Udemy Concepts // Component nội dung Udemy Summary (đã đổi tên)
  import UdemyVideoSummary from '../../components/displays/UdemyVideoSummary.svelte' // Component nội dung Udemy Video Summary (mới tạo)
  import YouTubeChapterSummary from '../../components/displays/YouTubeChapterSummary.svelte' // Component nội dung YouTube Chapter
  import YouTubeVideoSummary from '../../components/displays/YouTubeVideoSummary.svelte' // Component nội dung YouTube Video
  import WebSummaryDisplay from '../../components/displays/WebSummaryDisplay.svelte' // Component nội dung Web Summary
  import SelectedTextSummaryDisplay from '../../components/displays/SelectedTextSummaryDisplay.svelte' // Component nội dung Selected Text Summary
  import YouTubeSummaryDisplay from '../../components/displays/YouTubeSummaryDisplay.svelte' // Component wrapper YouTube
  import UdemySummaryDisplay from '../../components/displays/UdemySummaryDisplay.svelte' // Component wrapper Udemy (mới tạo)
  import 'webextension-polyfill'

  // Import direct variables and functions from refactored stores
  import {
    summaryState, // Import the summaryState object
    summarizeSelectedText,
    resetDisplayState,
    updateVideoActiveStates,
    fetchAndSummarize,
    updateActiveUdemyTab,
    updateActiveYouTubeTab,
  } from '../../stores/summaryStore.svelte.js'
  import {
    getTheme,
    initializeTheme,
    setTheme,
    subscribeToSystemThemeChanges,
  } from '../../stores/themeStore.svelte.js'
  import {
    tabTitle, // Import the writable store
    setTabTitle,
  } from '../../stores/tabTitleStore.svelte.js'
  import {
    settings, // Import settings
    loadSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js'

  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'

  const options = {
    scrollbars: {
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Use $effect to initialize OverlayScrollbars and listeners
  $effect(() => {
    initialize(document.body)

    // Call initialization and subscription functions
    loadSettings()
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges() // Subscribe to system theme changes
    subscribeToSettingsChanges() // Subscribe to settings changes

    // Cleanup function for $effect
    return () => {
      unsubscribeTheme() // Unsubscribe from system theme changes
      // No need to unsubscribe from settings as onStorageChange does not return an unsubscribe function
    }
  })

  // Use $effect to update font class on body when settings.selectedFont changes
  $effect(() => {
    if (document.body && settings.selectedFont) {
      // Remove all old font classes
      document.body.classList.remove(
        'font-default',
        'font-noto-serif',
        'font-opendyslexic',
        'font-noto-mix'
      )
      // Add new font class
      document.body.classList.add(`font-${settings.selectedFont}`)
    }
  })

  // Function to handle messages from the background script
  function handleBackgroundMessage(request) {
    switch (request.action) {
      case 'tabUpdated':
      case 'currentTabInfo':
        console.log(`[App.svelte] Received ${request.action} message:`, request)
        setTabTitle(request.tabTitle)
        updateVideoActiveStates(request.isYouTube, request.isUdemy)
        break
      case 'displaySummary':
        console.log(
          '[App.svelte] Received displaySummary message:',
          $state.snapshot(request)
        )
        summaryState.summary = request.summary
        summaryState.error = request.error ? request.summary : null
        break
      case 'summarizeSelectedText':
        console.log(
          '[App.svelte] Received summarizeSelectedText message:',
          $state.snapshot(request)
        )
        resetDisplayState()
        summaryState.lastSummaryTypeDisplayed = 'selectedText'
        summarizeSelectedText(request.selectedText)
        break
      case 'udemyTranscriptAvailable':
        console.log(
          '[App.svelte] Received udemyTranscriptAvailable message:',
          $state.snapshot(request)
        )
        // When Udemy transcript is available, trigger summarization and concept explanation
        // Only trigger if no Udemy summary exists or is not loading
        if (!summaryState.udemySummary && !isAnyUdemyLoading) {
          resetDisplayState()
          summaryState.lastSummaryTypeDisplayed = 'udemy' // Set display type to Udemy
          updateActiveUdemyTab('udemySummary') // Default to summary tab
          fetchAndSummarize() // Trigger summarization and explanation process
        } else {
          console.log(
            '[App.svelte] Udemy summary already exists or is loading, skipping fetchAndSummarize.'
          )
        }
        break
      default:
        console.warn('[App.svelte] Unknown message action:', request.action)
    }
  }

  // Logic to handle messages from background script (using connection port)
  $effect(() => {
    const port = browser.runtime.connect({ name: 'side-panel' })
    console.log('[App.svelte] Connected to background script.')

    port.onMessage.addListener(handleBackgroundMessage)

    return () => {
      port.onMessage.removeListener(handleBackgroundMessage)
      port.disconnect()
      console.log('[App.svelte] Disconnected from background script.')
    }
  })

  // Create derived variable to check if any Udemy summary is loading
  const isAnyUdemyLoading = $derived(
    summaryState.isUdemySummaryLoading || summaryState.isUdemyConceptsLoading
  )

  // Handle summarize button click
  // Register global event listener and ensure it's cleaned up when component is destroyed
  $effect(() => {
    const handleSummarizeClick = () => {
      resetDisplayState() // Reset display state before new summarization
      fetchAndSummarize() // Call function from summaryStore
    }

    document.addEventListener('summarizeClick', handleSummarizeClick)

    return () => {
      document.removeListener('summarizeClick', handleSummarizeClick)
    }
  })
</script>

<div class="flex min-w-[22.5rem] w-full flex-col">
  <div class="grid grid-rows-[32px_1px_8px_1px_160px_1px_8px_1px_1fr] h-screen">
    <div class=" flex justify-center items-center w-full h-full">
      <div class="text-text-secondary">
        <div class="line-clamp-1 text-[0.75rem] px-2 text-text-secondary">
          {$tabTitle}
        </div>
      </div>
    </div>

    <div class="bg-border"></div>
    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>
    <div class="bg-border"></div>

    <div class="flex font-mono flex-col gap-1 justify-center items-center">
      <div class="size-6 absolute top-12 right-4 text-text-secondary">
        <SettingButton />
      </div>
      <div class="flex flex-col gap-6 items-center justify-center">
        <SummarizeButton
          isLoading={summaryState.isLoading || isAnyUdemyLoading}
          isChapterLoading={summaryState.isChapterLoading}
        />
      </div>
    </div>

    <div class="bg-border"></div>

    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>

    <div class="bg-border"></div>

    <div
      class="relative prose prose-h2:mt-4 p z-10 flex flex-col gap-8 px-6 pt-8 pb-[50vh] max-w-3xl w-screen mx-auto"
    >
      {#if summaryState.lastSummaryTypeDisplayed === 'youtube'}
        <YouTubeSummaryDisplay
          activeYouTubeTab={summaryState.activeYouTubeTab}
        />
      {:else if summaryState.lastSummaryTypeDisplayed === 'udemy'}
        <UdemySummaryDisplay activeUdemyTab={summaryState.activeUdemyTab} />
      {:else if summaryState.lastSummaryTypeDisplayed === 'selectedText'}
        <SelectedTextSummaryDisplay
          selectedTextSummary={summaryState.selectedTextSummary}
          isSelectedTextLoading={summaryState.isSelectedTextLoading}
          selectedTextError={summaryState.selectedTextError}
        />
      {:else if summaryState.lastSummaryTypeDisplayed === 'web'}
        <WebSummaryDisplay
          summary={summaryState.summary}
          isLoading={summaryState.isLoading}
          error={summaryState.error}
        />
      {/if}
    </div>
  </div>

  <div
    class="fixed bg-linear-to-t from-background to-background/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
