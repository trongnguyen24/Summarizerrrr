<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import SettingButton from '../../components/buttons/SettingButton.svelte'
  import SummarizeButton from '../../components/buttons/SummarizeButton.svelte'
  import TabNavigation from '../../components/TabNavigation.svelte' // Vẫn cần cho các component wrapper
  import CourseConceptsDisplay from '../../components/displays/CourseConceptsDisplay.svelte' // Component nội dung Course Concepts
  import CourseVideoSummary from '../../components/displays/CourseVideoSummary.svelte' // Component nội dung Course Video Summary
  import YouTubeChapterSummary from '../../components/displays/YouTubeChapterSummary.svelte' // Component nội dung YouTube Chapter
  import YouTubeVideoSummary from '../../components/displays/YouTubeVideoSummary.svelte'
  import WebSummaryDisplay from '../../components/displays/WebSummaryDisplay.svelte'
  import SelectedTextSummaryDisplay from '../../components/displays/SelectedTextSummaryDisplay.svelte'
  import YouTubeSummaryDisplay from '../../components/displays/YouTubeSummaryDisplay.svelte'
  import CourseSummaryDisplay from '../../components/displays/CourseSummaryDisplay.svelte'
  import 'webextension-polyfill'

  // Import direct variables and functions from refactored stores
  import {
    summaryState,
    summarizeSelectedText,
    resetDisplayState,
    updateVideoActiveStates,
    fetchAndSummarize,
    fetchAndSummarizeStream,
    updateActiveCourseTab,
    updateActiveYouTubeTab,
  } from '../../stores/summaryStore.svelte.js'
  import {
    themeSettings, // Import themeSettings
    initializeTheme,
    setTheme,
    subscribeToSystemThemeChanges,
    applyThemeToDocument, // Import applyThemeToDocument
  } from '../../stores/themeStore.svelte.js'
  import { tabTitle, setTabTitle } from '../../stores/tabTitleStore.svelte.js'
  import {
    settings,
    loadSettings,
    subscribeToSettingsChanges,
  } from '../../stores/settingsStore.svelte.js'

  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'

  const options = {
    scrollbars: {
      autoHide: 'scroll',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  let showToast = $state(false)
  let toastMessage = $state('')
  let toastType = $state('success')

  function displayToast(message, type = 'success') {
    toastMessage = message
    toastType = type
    showToast = true
    setTimeout(() => {
      showToast = false
    }, 3000) // Hide toast after 3 seconds
  }

  // Use $effect to initialize OverlayScrollbars and listeners
  $effect(() => {
    initialize(document.body)

    // Call initialization and subscription functions
    loadSettings()
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()
    subscribeToSettingsChanges()

    // $effect để tự động áp dụng theme khi themeSettings.theme thay đổi
    $effect(() => {
      applyThemeToDocument(themeSettings.theme)
    })

    // Cleanup function for $effect
    return () => {
      unsubscribeTheme()
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
        'font-mali'
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
        // Tính toán isCourse từ isUdemy và isCoursera
        const isCourseActive = request.isUdemy || request.isCoursera
        updateVideoActiveStates(request.isYouTube, isCourseActive)
        break
      case 'displaySummary':
        console.log(
          '[App.svelte] Received displaySummary message:',
          $state.snapshot(request)
        )
        summaryState.summary = request.summary
        summaryState.error = request.error ? request.summary : null
        break
      case 'udemyTranscriptAvailable':
        console.log(
          '[App.svelte] Received udemyTranscriptAvailable message:',
          $state.snapshot(request)
        )
        // Chỉ cập nhật trạng thái, không tự động tóm tắt
        summaryState.isCourseVideoActive = true
        summaryState.lastSummaryTypeDisplayed = 'course'
        updateActiveCourseTab('courseSummary')
        break
      case 'courseraContentAvailable':
        console.log(
          '[App.svelte] Received courseraContentAvailable message:',
          $state.snapshot(request)
        )
        // Chỉ cập nhật trạng thái, không tự động tóm tắt
        summaryState.isCourseVideoActive = true
        summaryState.lastSummaryTypeDisplayed = 'course'
        updateActiveCourseTab('courseSummary')
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
      case 'summarizeCurrentPage':
        console.log(
          '[App.svelte] Received summarizeCurrentPage message (will not trigger fetchAndSummarize directly):',
          $state.snapshot(request)
        )
        // Chỉ cập nhật trạng thái, không tự động tóm tắt
        resetDisplayState()
        if (request.isYouTube) {
          summaryState.lastSummaryTypeDisplayed = 'youtube'
          updateActiveYouTubeTab('youtubeSummary')
        } else if (request.isUdemy || request.isCoursera) {
          summaryState.lastSummaryTypeDisplayed = 'course'
          updateActiveCourseTab('courseSummary')
        } else {
          summaryState.lastSummaryTypeDisplayed = 'web'
        }
        // fetchAndSummarize() // Removed to prevent double API call
        break
      default:
        console.warn('[App.svelte] Unknown message action:', request.action)
    }
  }

  // Logic to handle messages from background script (using connection port)
  $effect(() => {
    // Establish a long-lived connection for primary communication
    const port = browser.runtime.connect({ name: 'side-panel' })
    console.log('[App.svelte] Port connected to background script.')

    // Listen for messages on this specific port
    port.onMessage.addListener(handleBackgroundMessage)

    // Also, add a listener for general runtime messages.
    // This acts as a fallback if the port connection is lost (e.g., service worker restarts).
    browser.runtime.onMessage.addListener(handleBackgroundMessage)
    console.log('[App.svelte] Added fallback runtime.onMessage listener.')

    // Cleanup function when the component is destroyed
    return () => {
      // Clean up port listener and disconnect
      port.onMessage.removeListener(handleBackgroundMessage)
      port.disconnect()
      console.log('[App.svelte] Port disconnected from background script.')

      // Clean up the general runtime message listener
      browser.runtime.onMessage.removeListener(handleBackgroundMessage)
      console.log('[App.svelte] Removed fallback runtime.onMessage listener.')
    }
  })

  // Create derived variable to check if any Course summary is loading
  const isAnyCourseLoading = $derived(
    summaryState.isCourseSummaryLoading || summaryState.isCourseConceptsLoading
  )

  // Handle summarize button click
  // Register global event listener and ensure it's cleaned up when component is destroyed
  $effect(() => {
    const handleSummarizeClick = () => {
      resetDisplayState() // Reset display state before new summarization
      fetchAndSummarizeStream() // Call function from summaryStore
    }

    document.addEventListener('summarizeClick', handleSummarizeClick)

    return () => {
      document.removeListener('summarizeClick', handleSummarizeClick)
    }
  })
</script>

<div class="flex min-w-[22.5rem] bg-surface-1 w-full flex-col">
  <div
    class="grid grid-rows-[32px_1px_8px_1px_160px_1px_8px_1px_1fr] min-h-screen"
  >
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
      <div class="size-6 absolute top-12 left-2 text-text-secondary">
        <button
          onclick={() => {
            browser.tabs.create({ url: 'archive.html' })
          }}
          class="p-1 setting-animation transition-colors hover:bg-surface-1 rounded-full hover:text-text-primary"
          title="Open Archive"
        >
          <Icon
            icon="heroicons:bars-3-bottom-left-solid"
            width="24"
            height="24"
          />
        </button>
      </div>
      <div class="size-6 absolute top-12 right-4 text-text-secondary">
        <SettingButton />
      </div>

      <div class="flex flex-col gap-6 items-center justify-center">
        <SummarizeButton
          isLoading={summaryState.isLoading || isAnyCourseLoading}
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
      class="relative prose main-sidepanel prose-h2:mt-4 p z-10 flex flex-col gap-8 px-6 pt-8 pb-[50vh] max-w-[52rem] w-screen mx-auto"
    >
      {#if summaryState.lastSummaryTypeDisplayed === 'youtube'}
        <YouTubeSummaryDisplay
          activeYouTubeTab={summaryState.activeYouTubeTab}
        />
      {:else if summaryState.lastSummaryTypeDisplayed === 'course'}
        <CourseSummaryDisplay activeCourseTab={summaryState.activeCourseTab} />
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
    class="fixed bg-linear-to-t from-surface-1 to-surface-1/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
  <div class="fixed z-50 top-0 right-0"></div>
</div>
