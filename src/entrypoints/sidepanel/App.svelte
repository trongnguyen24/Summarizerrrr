<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import 'overlayscrollbars/overlayscrollbars.css'
  import SettingButton from '@/components/buttons/SettingButton.svelte'
  import SummarizeButton from '@/components/buttons/SummarizeButton.svelte'
  import TabNavigation from '@/components/navigation/TabNavigation.svelte'
  import GenericSummaryDisplay from '@/components/displays/core/GenericSummaryDisplay.svelte'
  import YouTubeSummaryDisplay from '@/components/displays/platform/YouTubeSummaryDisplay.svelte'
  import CourseSummaryDisplay from '@/components/displays/platform/CourseSummaryDisplay.svelte'
  import ErrorDisplay from '@/components/displays/ui/ErrorDisplay.svelte'
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
  } from '@/stores/summaryStore.svelte.js'
  import { tabTitle } from '@/stores/tabTitleStore.svelte.js'
  import { setupMessageListener } from '@/services/messageHandler.js'
  import { initializeApp } from '@/services/initialization.js'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    themeSettings,
    initializeTheme,
    subscribeToSystemThemeChanges,
  } from '@/stores/themeStore.svelte.js'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'

  // Use $effect to initialize the app and set up listeners
  $effect(() => {
    const cleanupInitialization = initializeApp()
    const cleanupMessageListener = setupMessageListener()

    return () => {
      cleanupInitialization()
      cleanupMessageListener()
    }
  })

  $effect(() => {
    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    return unsubscribeTheme
  })

  // Apply font family based on settings
  $effect(() => {
    const fontClass =
      {
        default: 'font-default',
        'noto-serif': 'font-noto-serif',
        opendyslexic: 'font-opendyslexic',
        mali: 'font-mali',
      }[settings.selectedFont] || 'font-default'

    const mainSidepanel = document.querySelector('body')
    if (mainSidepanel) {
      mainSidepanel.className = mainSidepanel.className
        .split(' ')
        .filter((c) => !c.startsWith('font-'))
        .join(' ')
      mainSidepanel.classList.add(fontClass)
    }
  })

  // Apply theme based on settings
  $effect(() => {
    console.log('Theme settings changed:', themeSettings.theme)
    // The actual theme application logic is handled by initializeTheme and subscribeToSystemThemeChanges
    // which are called in the initial $effect. This effect is mainly for logging.
  })

  // Create derived variable to check if any Course summary is loading
  const isAnyCourseLoading = $derived(
    summaryState.isCourseSummaryLoading || summaryState.isCourseConceptsLoading
  )

  // Derived state to find the first active error object
  const anyError = $derived(
    summaryState.summaryError ||
      summaryState.chapterError ||
      summaryState.courseSummaryError ||
      summaryState.courseConceptsError ||
      summaryState.selectedTextError
  )

  // Handle summarize button click
  // Register global event listener and ensure it's cleaned up when component is destroyed
  $effect(() => {
    const handleSummarizeClick = () => {
      resetDisplayState() // Reset display state before new summarization
      fetchAndSummarize() // Call the main summarization function
    }

    document.addEventListener('summarizeClick', handleSummarizeClick)

    return () => {
      document.removeListener('summarizeClick', handleSummarizeClick)
    }
  })
</script>

<div class="main-container flex min-w-[22.5rem] bg-surface-1 w-full flex-col">
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
          title={$t('archive.open_archive')}
        >
          <Icon icon="solar:history-linear" width="24" height="24" />
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
      {#if anyError}
        <ErrorDisplay error={anyError} />
      {:else if summaryState.lastSummaryTypeDisplayed === 'youtube'}
        <YouTubeSummaryDisplay
          activeYouTubeTab={summaryState.activeYouTubeTab}
        />
      {:else if summaryState.lastSummaryTypeDisplayed === 'course'}
        <CourseSummaryDisplay activeCourseTab={summaryState.activeCourseTab} />
      {:else if summaryState.lastSummaryTypeDisplayed === 'selectedText'}
        <GenericSummaryDisplay
          summary={summaryState.selectedTextSummary}
          isLoading={summaryState.isSelectedTextLoading}
          loadingText="Summarizing selected text..."
          targetId="selected-text-summary-display"
          showTOC={true}
        />
      {:else if summaryState.lastSummaryTypeDisplayed === 'web'}
        <GenericSummaryDisplay
          summary={summaryState.summary}
          isLoading={summaryState.isLoading}
          loadingText="Processing web summary..."
          targetId="web-summary-display"
          showTOC={true}
        />
      {/if}
    </div>
    <div id="footer"></div>
  </div>

  <div
    class="fixed bg-linear-to-t from-surface-1 to-surface-1/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
  ></div>
</div>
