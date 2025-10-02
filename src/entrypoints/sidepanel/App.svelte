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
  import ApiKeySetupPrompt from '@/components/ui/ApiKeySetupPrompt.svelte'

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
  import { settings, loadSettings } from '@/stores/settingsStore.svelte.js'
  import {
    themeSettings,
    initializeTheme,
    subscribeToSystemThemeChanges,
  } from '@/stores/themeStore.svelte.js'
  import { useApiKeyValidation } from '@/entrypoints/content/composables/useApiKeyValidation.svelte.js'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'
  import { fade, slide } from 'svelte/transition'

  // Track if settings are loaded
  let settingsLoaded = $state(false)

  // Permission state for Firefox
  let hasPermission = $state(true) // Default to true for non-Firefox
  let currentTabUrl = $state('')

  // Use API key validation composable
  const { needsApiKeySetup, currentProviderDisplayName } = useApiKeyValidation()

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
      fetchAndSummarize() // Call the main summarization function, it will handle its own state reset
    }

    document.addEventListener('summarizeClick', handleSummarizeClick)

    return () => {
      document.removeListener('summarizeClick', handleSummarizeClick)
    }
  })

  // Track current tab URL for permission checking
  $effect(async () => {
    if (import.meta.env.BROWSER === 'firefox') {
      try {
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        })
        if (tab?.url) {
          currentTabUrl = tab.url
        }
      } catch (error) {
        console.error('[App] Error getting current tab:', error)
      }
    }
  })

  // Handle permission status changes from PermissionWarningPrompt
  function handlePermissionChange(granted) {
    hasPermission = granted
  }
</script>

{#if !settings.hasCompletedOnboarding}
  <div
    class=" absolute z-[50] inset-0"
    out:fade={{
      duration: 400,
    }}
  >
    {#await import('@/components/welcome/WelcomeFlow.svelte')}
      <div
        out:fade={{ delay: 1000 }}
        class="welcome-loading-container absolute z-50 bg-surface-1 inset-0 flex items-center justify-center"
      ></div>
    {:then { default: WelcomeFlow }}
      <div
        in:fade={{ delay: 500, duration: 600 }}
        class="absolute max-h-svh z-[99] inset-0 flex items-center justify-center"
      >
        <WelcomeFlow />
      </div>
    {:catch error}
      <div
        class="welcome-error-container absolute z-50 bg-surface-1 inset-0 flex items-center justify-center"
      >
        <p class="text-red-500">Error loading welcome flow: {error.message}</p>
      </div>
    {/await}
  </div>
{/if}
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
        {#if !needsApiKeySetup()()}
          <SummarizeButton
            isLoading={summaryState.isLoading || isAnyCourseLoading}
            isChapterLoading={summaryState.isChapterLoading}
            disabled={!hasPermission && import.meta.env.BROWSER === 'firefox'}
          />
        {/if}
      </div>
    </div>

    <div class="bg-border"></div>

    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>

    <div class="bg-border"></div>

    <div
      class="relative prose main-sidepanel prose-h2:mt-4 p z-10 flex flex-col gap-8 px-6 pt-8 pb-[40vh] max-w-[52rem] w-screen mx-auto"
    >
      <!-- NEW: Permission Warning Component for Firefox -->
      {#if import.meta.env.BROWSER === 'firefox'}
        {#await import('@/components/ui/PermissionWarningPrompt.svelte')}
          <!-- Loading placeholder - có thể để trống hoặc thêm loading indicator nhỏ -->
        {:then { default: PermissionWarningPrompt }}
          <PermissionWarningPrompt
            currentUrl={currentTabUrl}
            onPermissionGranted={handlePermissionChange}
          />
        {:catch error}
          <!-- Silent fail - log error nhưng không block UI -->
          <script>
            console.error(
              '[App] Failed to load PermissionWarningPrompt:',
              error
            )
          </script>
        {/await}
      {/if}
      {#if needsApiKeySetup()()}
        <ApiKeySetupPrompt />
      {:else if anyError}
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

    <div
      class=" sticky bg-linear-to-t from-surface-1 to-surface-1/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
    ></div>
  </div>
</div>
