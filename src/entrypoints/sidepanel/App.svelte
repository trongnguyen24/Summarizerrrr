<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import 'overlayscrollbars/overlayscrollbars.css'
  import SettingButton from '@/entrypoints/sidepanel/components/SettingButton.svelte'
  import SummarizeButton from '@/components/buttons/SummarizeButton.svelte'
  import ActionButtons from '@/entrypoints/sidepanel/components/ActionButtons.svelte'
  import TabNavigation from '@/components/ui/TabNavigation.svelte'
  import GenericSummaryDisplay from '@/entrypoints/sidepanel/components/displays/GenericSummaryDisplay.svelte'
  import YouTubeSummaryDisplay from '@/entrypoints/sidepanel/components/displays/YouTubeSummaryDisplay.svelte'
  import CourseSummaryDisplay from '@/entrypoints/sidepanel/components/displays/CourseSummaryDisplay.svelte'
  import ErrorDisplay from '@/components/ui/ErrorDisplay.svelte'
  import ApiKeySetupPrompt from '@/components/ui/ApiKeySetupPrompt.svelte'
  import { Toaster, toast } from 'svelte-sonner'
  import ModelToast from '@/entrypoints/sidepanel/components/ModelToast.svelte'
  import Noti from '@/entrypoints/sidepanel/components/Noti.svelte'
  import 'webextension-polyfill'
  import { browser } from 'wxt/browser'

  // Import direct variables and functions from refactored stores
  import {
    summaryState,
    isAnyLoading,
    summarizeSelectedText,
    resetDisplayState,
    updateVideoActiveStates,
    fetchAndSummarize,
    fetchAndSummarizeStream,
    updateActiveCourseTab,
  } from '@/stores/summaryStore.svelte.js'
  import { setupMessageListener } from './messageHandler.js'
  import {
    getCurrentTabId,
    getTabsWithSummary,
    getOrCreateTabState,
  } from '@/services/tabCacheService.js'
  import { initializeApp } from './initialization.js'
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
  import { fadeOnly, slideScaleFade } from '@/lib/utils/slideScaleFade.js'
  import ActionButtonsMini from '@/entrypoints/sidepanel/components/ActionButtonsMini.svelte'
  import { debounce } from '@/lib/utils/utils.js'
  import Tooltip from '@/entrypoints/sidepanel/components/Tooltip.svelte'
  import { Tooltip as BitsTooltip } from 'bits-ui'
  import TabTitleBar from '@/entrypoints/sidepanel/components/TabTitleBar.svelte'
  import { tabTitle } from '@/stores/tabTitleStore.svelte.js'

  // Deep Dive imports
  import DeepDiveFAB from '@/entrypoints/sidepanel/components/deepdive/DeepDiveFAB.svelte'
  import DeepDiveDialog from '@/entrypoints/sidepanel/components/deepdive/DeepDiveDialog.svelte'
  import DeepDiveContent from '@/entrypoints/sidepanel/components/deepdive/DeepDiveContent.svelte'
  import InlineDeepDiveQuestions from '@/entrypoints/sidepanel/components/deepdive/InlineDeepDiveQuestions.svelte'
  import {
    deepDiveState,
    toggleDeepDive,
    updateSummaryContext,
    setQuestions,
    setGenerating,
    setError,
    addToQuestionHistory,
  } from '@/stores/deepDiveStore.svelte.js'
  import { generateFollowUpQuestions } from '@/services/tools/deepDiveService.js'

  // Chat harness (Phase 5): chat is the default side-panel surface
  import ChatShell from '@/entrypoints/sidepanel/components/chat/ChatShell.svelte'
  import ChatHeader from '@/entrypoints/sidepanel/components/chat/ChatHeader.svelte'
  import ChatTabTitleBar from '@/entrypoints/sidepanel/components/chat/ChatTabTitleBar.svelte'
  import { openConversation } from '@/stores/chatStore.svelte.js'
  import {
    sidepanelViewState,
    showLegacySummarySurface,
  } from '@/stores/sidepanelViewStore.svelte.js'

  // Track if settings are loaded
  let settingsLoaded = $state(false)

  // Legacy summary UI remains reachable behind an explicit toggle. The flag
  // lives in a store because `messageHandler` needs it too: whichever surface
  // is off screen must not touch the shared document scroll.
  const showLegacySummary = $derived(sidepanelViewState.surface === 'summary')

  // Permission state for Firefox
  let hasPermission = $state(true) // Default to true for non-Firefox
  let currentTabUrl = $state('')

  // Track cached tabs count for navigation arrows
  let cachedTabsCount = $state(0)

  // Derived value for Deep Dive visibility - ensures reactivity when tab switches
  let shouldShowDeepDiveNow = $derived(
    (settings.tools?.deepDive?.enabled ?? false) &&
      deepDiveState.lastSummaryContent.trim() !== '',
  )

  // Effect to update cached tabs count when summary state changes
  $effect(() => {
    // Dependencies: any summary content changes
    const _trigger = [
      summaryState.summary,
      summaryState.courseSummary,
      summaryState.selectedTextSummary,
      summaryState.customActionResult,
      summaryState.lastSummaryTypeDisplayed,
    ]

    // Sync current summaryState to tabStates for current tab
    // This ensures getTabsWithSummary() sees the latest summary content
    const currentTabId = getCurrentTabId()
    if (currentTabId) {
      const tabState = getOrCreateTabState(currentTabId)
      if (tabState) {
        // Copy all summary fields to tab state dynamically
        Object.keys(summaryState).forEach((key) => {
          if (key !== 'abortController') {
            tabState.summaryState[key] = summaryState[key]
          }
        })
      }
    }

    // Update count
    cachedTabsCount = getTabsWithSummary().length
  })


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

  // Apply reduce motion setting to DOM
  $effect(() => {
    // Import dynamically to avoid circular dependency issues
    import('@/services/animationService.js').then(
      ({ applyReduceMotionToDOM }) => {
        applyReduceMotionToDOM()
      },
    )
  })

  // Re-apply when settings.reduceMotion changes
  $effect(() => {
    // Track the setting value to make this effect reactive
    const _reduceMotion = settings.reduceMotion
    import('@/services/animationService.js').then(
      ({ applyReduceMotionToDOM }) => {
        applyReduceMotionToDOM()
      },
    )
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

  // Listen for custom toast events from non-component files
  $effect(() => {
    const handleToast = (event) => {
      const { title, message, icon } = event.detail
      const id = Math.random().toString(36).substring(7)
      toast.custom(ModelToast, {
        id,
        componentProps: {
          id,
          title,
          message,
          icon,
        },
        duration: 8000,
      })
    }

    window.addEventListener('gemini-toast', handleToast)

    return () => {
      window.removeEventListener('gemini-toast', handleToast)
    }
  })

  // Create derived variable to check if any Course summary is loading
  const isAnyCourseLoading = $derived(
    summaryState.isCourseSummaryLoading || summaryState.isCourseConceptsLoading,
  )

  // Create derived variable to check if all summaries for the current page type are completed
  const areAllSummariesCompleted = $derived(() => {
    // No loading states should be active
    const noLoadingStates = !isAnyLoading()

    if (!noLoadingStates) return false

    // Check if we have content OR error based on the last summary type displayed
    switch (summaryState.lastSummaryTypeDisplayed) {
      case 'youtube':
        // For YouTube, only show action buttons if video summary is done
        // Chapter summary alone doesn't count
        const hasYouTubeVideoContent =
          summaryState.summary && summaryState.summary.trim() !== ''
        const hasYouTubeError = summaryState.summaryError

        return hasYouTubeVideoContent || hasYouTubeError

      case 'course':
        // For courses, we need either content or error
        const hasCourseContent =
          (summaryState.courseSummary &&
            summaryState.courseSummary.trim() !== '') ||
          (summaryState.courseConcepts &&
            summaryState.courseConcepts.trim() !== '')
        const hasCourseError =
          summaryState.courseSummaryError || summaryState.courseConceptsError
        return hasCourseContent || hasCourseError

      case 'web':
        // For web pages, we need content or error
        const hasWebContent =
          summaryState.summary && summaryState.summary.trim() !== ''
        const hasWebError = summaryState.summaryError
        return hasWebContent || hasWebError

      case 'selectedText':
        // For selected text, we need content or error
        const hasSelectedTextContent =
          summaryState.selectedTextSummary &&
          summaryState.selectedTextSummary.trim() !== ''
        const hasSelectedTextError = summaryState.selectedTextError
        return hasSelectedTextContent || hasSelectedTextError

      case 'custom':
        // For custom actions, we need content or error
        const hasCustomContent =
          summaryState.customActionResult &&
          summaryState.customActionResult.trim() !== ''
        const hasCustomError = summaryState.customActionError
        return hasCustomContent || hasCustomError

      default:
        // If no summary type is set, no summaries are completed
        return false
    }
  })

  // Derived state to find the first active error object
  const anyError = $derived(
    summaryState.summaryError ||
      summaryState.courseSummaryError ||
      summaryState.courseConceptsError ||
      summaryState.selectedTextError ||
      summaryState.customActionError,
  )

  // Track current tab URL for permission checking with tab change listener (Firefox only)
  $effect(async () => {
    if (import.meta.env.BROWSER === 'firefox') {
      // Get initial tab URL
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

      // Listen for tab activation changes (Firefox only)
      const handleTabActivated = async (activeInfo) => {
        try {
          const tab = await browser.tabs.get(activeInfo.tabId)
          if (tab?.url) {
            currentTabUrl = tab.url
          }
        } catch (error) {
          console.error('[App] Error getting activated tab:', error)
        }
      }

      // Listen for tab updates (URL changes within same tab) - Firefox only
      const handleTabUpdated = (tabId, changeInfo, tab) => {
        if (changeInfo.url && tab.active) {
          currentTabUrl = changeInfo.url
        }
      }

      browser.tabs.onActivated.addListener(handleTabActivated)
      browser.tabs.onUpdated.addListener(handleTabUpdated)

      // Cleanup listeners
      return () => {
        browser.tabs.onActivated.removeListener(handleTabActivated)
        browser.tabs.onUpdated.removeListener(handleTabUpdated)
      }
    }
  })

  // Handle permission status changes from PermissionWarningPrompt
  function handlePermissionChange(granted) {
    hasPermission = granted
  }

  /**
   * Helper để lấy summary content dựa trên type
   * @returns {string} Summary content hoặc empty string
   */
  function getSummaryContent() {
    switch (summaryState.lastSummaryTypeDisplayed) {
      case 'youtube':
        return summaryState.summary || ''
      case 'course':
        return summaryState.courseSummary || summaryState.courseConcepts || ''
      case 'web':
        return summaryState.summary || ''
      case 'selectedText':
        return summaryState.selectedTextSummary || ''
      case 'custom':
        return summaryState.customActionResult || ''
      default:
        return ''
    }
  }

  /**
   * Debounced version of updateSummaryContext để tránh update quá nhiều
   */
  const debouncedUpdateContext = debounce((content, title, url, lang) => {
    updateSummaryContext(content, title, url, lang)
  }, 500)

  /**
   * Effect: Update Deep Dive context SAU KHI summary thay đổi
   * CHỈ update khi TẤT CẢ loading states = false
   * Sử dụng debounce để tránh update liên tục khi streaming
   */
  $effect(() => {
    // Chỉ update context khi KHÔNG còn loading nào
    const allLoadingComplete = !isAnyLoading()

    const content = getSummaryContent()

    if (allLoadingComplete && content && content.trim() !== '') {
      debouncedUpdateContext(
        content,
        summaryState.pageTitle,
        summaryState.pageUrl,
        settings.summaryLang || 'English',
      )
    }
  })

  /**
   * Effect: Auto-generate Deep Dive questions sau khi summary hoàn thành
   * Chỉ chạy khi autoGenerate setting = true
   *
   * FIX: Check hasGenerated from TAB-SPECIFIC state (not global) to prevent
   * duplicate generation when switching between tabs.
   */
  $effect(() => {
    const allLoadingComplete = !isAnyLoading()

    const content = getSummaryContent()
    const autoGenEnabled = settings.tools?.deepDive?.autoGenerate ?? false
    const toolEnabled = settings.tools?.deepDive?.enabled ?? false

    // Get current tab ID for checking tab-specific state
    const targetTabId = getCurrentTabId()

    // Check hasGenerated from TAB-SPECIFIC state, not global state
    // This prevents regenerating questions when switching tabs
    let hasAlreadyGenerated = false
    if (targetTabId) {
      const tabState = getOrCreateTabState(targetTabId)
      if (tabState?.deepDiveState) {
        hasAlreadyGenerated = tabState.deepDiveState.hasGenerated
      }
    }

    // Trigger auto-generate nếu:
    // 1. All loading complete
    // 2. Có content
    // 3. Tool enabled
    // 4. Auto-generate enabled
    // 5. Tab-specific hasGenerated = false (tránh regenerate khi switch tab)
    if (
      allLoadingComplete &&
      content &&
      content.trim() !== '' &&
      toolEnabled &&
      autoGenEnabled &&
      !hasAlreadyGenerated
    ) {
      console.log(
        `[App] Auto-generating Deep Dive questions for tab ${targetTabId}...`,
      )

      // Async function inside effect
      ;(async () => {
        try {
          setGenerating(true, targetTabId)
          setError(null, targetTabId) // Clear previous errors

          const questions = await generateFollowUpQuestions(
            content,
            summaryState.pageTitle,
            summaryState.pageUrl,
            settings.summaryLang || 'English',
            deepDiveState.questionHistory,
          )

          setQuestions(questions, targetTabId)
          addToQuestionHistory(questions, targetTabId)
          console.log(
            `[App] Auto-generated questions for tab ${targetTabId}:`,
            questions,
          )
        } catch (error) {
          console.error(
            `[App] Auto-generation failed for tab ${targetTabId}:`,
            error,
          )
          // Silent fail - Lưu error vào store
          // Error sẽ hiển thị khi user mở dialog
          setError(
            error.message || 'Failed to auto-generate questions',
            targetTabId,
          )
        } finally {
          setGenerating(false, targetTabId)
        }
      })()
    }
  })

  // Deep Dive error state
  let deepDiveError = $state(null)
</script>

{#if !settings.hasCompletedOnboarding}
  <div
    class=" absolute z-[50] inset-0"
    out:fadeOnly={{
      duration: 400,
    }}
  >
    {#await import('@/components/welcome/WelcomeFlow.svelte')}
      <div
        out:fadeOnly={{ delay: 1000 }}
        class="welcome-loading-container absolute z-50 bg-surface-1 inset-0 flex items-center justify-center"
      ></div>
    {:then { default: WelcomeFlow }}
      <div
        in:slideScaleFade={{ delay: 500, duration: 600 }}
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

<!--
  Firefox-only permission overlay, rendered by BOTH the legacy summary surface
  and the chat surface — a missing host permission blocks extraction for both,
  so both need the notice and the blocking overlay. Only one branch of the
  `showLegacySummary` if/else mounts at a time, so this never renders twice.

  Skipped while API-key setup is pending: without a key nothing works at all,
  so ApiKeySetupPrompt takes precedence over the permission notice.
-->
{#snippet firefoxPermissionOverlay()}
  {#if import.meta.env.BROWSER === 'firefox' && !needsApiKeySetup()()}
    {#await import('@/entrypoints/sidepanel/components/PermissionWarningPrompt.svelte')}
      <!-- Loading placeholder - có thể để trống hoặc thêm loading indicator nhỏ -->
    {:then { default: PermissionWarningPrompt }}
      <PermissionWarningPrompt
        currentUrl={currentTabUrl}
        onPermissionGranted={handlePermissionChange}
      />
    {:catch error}
      <!-- Silent fail - log error nhưng không block UI -->
    {/await}
  {/if}
{/snippet}

{#if showLegacySummary}
<div
  class="main-container flex min-w-[22.5rem] bg-surface-1 w-full flex-col"
  data-per-tab="true"
>
  <div
    class="grid min-h-screen grid-rows-[36px_32px_10px_192px_10px_1fr]"
  >
    <div
      class="flex sticky top-0 z-50 justify-center items-center w-screen h-full bg-surface-1"
    >
      <TabTitleBar {cachedTabsCount} />
      <div
        class="absolute w-screen h-3 -bottom-3 bg-linear-to-b from-surface-1 to-surface-1/0"
      ></div>
    </div>
    <div
      class="w-screen text-center text-[0.7rem] flex justify-center items-center px-2 text-text-secondary"
    >
      <div class="line-clamp-1 !text-center w-full">
        {$tabTitle}
      </div>
    </div>
    <div
      class="top-stripes flex justify-center border-b border-border border-t items-center w-full h-full"
    ></div>
    <div
      class="flex relative font-mono flex-col gap-1 justify-center items-center"
    >
      <!-- z-50: phải nằm trên permission overlay (z-45) để user luôn mở được
           archive / settings ngay cả khi panel đang bị che. -->
      <div class="size-6 absolute z-50 top-2 left-2 text-text-secondary">
        <BitsTooltip.Provider>
          <Tooltip
            content={$t('archive.open_archive')}
            side="right"
            align="start"
          >
            {#snippet children({ builder })}
              <button
                {...builder}
                onclick={() => {
                  browser.tabs.create({ url: browser.runtime.getURL('archive.html') })
                }}
                class="p-1 setting-animation transition-colors hover:bg-surface-1 rounded-full hover:text-text-primary"
              >
                <Icon icon="solar:history-linear" width="24" height="24" />
              </button>
            {/snippet}
          </Tooltip>
        </BitsTooltip.Provider>
      </div>
      <div class="size-6 z-50 absolute top-2 right-4 text-text-secondary">
        <SettingButton />
      </div>

      <div class="flex flex-col gap-4 items-center justify-center">
        {#if !needsApiKeySetup()()}
          <div class="flex flex-row gap-3 items-center">
            <SummarizeButton
              isLoading={isAnyLoading()}
              disabled={!hasPermission && import.meta.env.BROWSER === 'firefox'}
            />
          </div>
          <!-- Custom Action Buttons - Only show when all summaries are completed -->
          {#if areAllSummariesCompleted()}
            <ActionButtonsMini />
          {/if}
        {/if}
      </div>

      {@render firefoxPermissionOverlay()}
    </div>

    <div
      class="top-stripes flex justify-center border-b border-border border-t items-center w-full h-full"
    ></div>

    <div
      class="relative prose wrap-anywhere main-sidepanel prose-h2:mt-4 p z-10 flex flex-col gap-8 px-6 pt-8 pb-[30vh] min-w-[22.5rem] max-w-[52rem] w-screen mx-auto"
    >
      {#if needsApiKeySetup()()}
        <ApiKeySetupPrompt />
      {:else if anyError}
        <ErrorDisplay error={anyError} />
      {:else if summaryState.lastSummaryTypeDisplayed === 'youtube'}
        <YouTubeSummaryDisplay />
        <!-- Inline Deep Dive Questions for YouTube -->
        {#if shouldShowDeepDiveNow && settings.tools?.deepDive?.autoGenerate}
          <InlineDeepDiveQuestions
            summaryContent={getSummaryContent()}
            pageTitle={summaryState.pageTitle}
            pageUrl={summaryState.pageUrl}
            summaryLang={settings.summaryLang || 'English'}
          />
        {/if}
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
        <!-- Inline Deep Dive Questions for Selected Text -->
        {#if shouldShowDeepDiveNow && settings.tools?.deepDive?.autoGenerate}
          <InlineDeepDiveQuestions
            summaryContent={getSummaryContent()}
            pageTitle={summaryState.pageTitle}
            pageUrl={summaryState.pageUrl}
            summaryLang={settings.summaryLang || 'English'}
          />
        {/if}
      {:else if summaryState.lastSummaryTypeDisplayed === 'web'}
        <GenericSummaryDisplay
          summary={summaryState.summary}
          isLoading={summaryState.isLoading}
          loadingText="Processing web summary..."
          targetId="web-summary-display"
          showTOC={true}
        />
        <!-- Inline Deep Dive Questions for Web -->
        {#if shouldShowDeepDiveNow && settings.tools?.deepDive?.autoGenerate}
          <InlineDeepDiveQuestions
            summaryContent={getSummaryContent()}
            pageTitle={summaryState.pageTitle}
            pageUrl={summaryState.pageUrl}
            summaryLang={settings.summaryLang || 'English'}
          />
        {/if}
      {:else if summaryState.lastSummaryTypeDisplayed === 'custom'}
        <GenericSummaryDisplay
          summary={summaryState.customActionResult}
          isLoading={summaryState.isCustomActionLoading}
          loadingText="Processing {summaryState.currentActionType}..."
          targetId="custom-action-display"
          showTOC={true}
        />
        <!-- Inline Deep Dive Questions for Custom Actions -->
        {#if shouldShowDeepDiveNow && settings.tools?.deepDive?.autoGenerate}
          <InlineDeepDiveQuestions
            summaryContent={getSummaryContent()}
            pageTitle={summaryState.pageTitle}
            pageUrl={summaryState.pageUrl}
            summaryLang={settings.summaryLang || 'English'}
          />
        {/if}
      {:else}
        <ActionButtons />
      {/if}
    </div>
  </div>
</div>

<div
  class=" fixed bg-linear-to-t from-surface-1 to-surface-1/40 bottom-0 mask-t-from-50% h-16 backdrop-blur-[2px] w-full z-30 pointer-events-none"
></div>
{#if !summaryState.lastSummaryTypeDisplayed && settings.hasCompletedOnboarding && !needsApiKeySetup()()}
  <Noti />
{/if}
{:else}
<div
  class="flex min-h-screen min-w-[22.5rem] w-full flex-col bg-surface-1"
  data-per-tab="true"
>
  <!-- `data-sticky-header`: ChatShell measures this to offset its submit scroll. -->
  <!-- z-50: trên permission overlay (z-45) để ConversationMenu → Settings vẫn
       mở được khi overlay đang che chat. -->
  <div class="sticky top-0 z-50 bg-surface-1" data-sticky-header>
    <div
      class="relative flex h-9 shrink-0 items-center justify-center bg-surface-1"
    >
      <ChatTabTitleBar />
      <div
        class="absolute -bottom-3 h-3 w-screen bg-linear-to-b from-surface-1 to-surface-1/0"
      ></div>
    </div>
    <ChatHeader
      onOpenConversation={openConversation}
      onShowLegacySummary={showLegacySummarySurface}
    />
  </div>

  {#if needsApiKeySetup()()}
    <div class="prose wrap-anywhere main-sidepanel p z-10 flex flex-col gap-8 px-6 pt-8 min-w-[22.5rem] max-w-[52rem] w-screen mx-auto">
      <ApiKeySetupPrompt />
    </div>
  {:else}
    <div class="flex flex-1 flex-col">
      <ChatShell />
    </div>
  {/if}

  {@render firefoxPermissionOverlay()}
</div>
{/if}
<Toaster />
<!-- Deep Dive FAB & Section with Error Boundary -->
{#if shouldShowDeepDiveNow && showLegacySummary}
  {#await Promise.resolve()}
    <!-- Loading placeholder -->
  {:then}
    <DeepDiveFAB
      summaryContent={deepDiveState.lastSummaryContent}
      pageTitle={deepDiveState.lastPageTitle}
      pageUrl={deepDiveState.lastPageUrl}
      summaryLang={deepDiveState.lastSummaryLang}
    />

    <DeepDiveDialog>
      <DeepDiveContent
        summaryContent={deepDiveState.lastSummaryContent}
        pageTitle={deepDiveState.lastPageTitle}
        pageUrl={deepDiveState.lastPageUrl}
        summaryLang={deepDiveState.lastSummaryLang}
      />
    </DeepDiveDialog>
  {:catch error}
    <div
      class="fixed bottom-6 left-4 z-40 p-3 bg-red-500/10 border border-red-500/30 rounded-lg max-w-xs"
      transition:slideScaleFade={{ duration: 300, slideFrom: 'bottom' }}
    >
      <p class="text-xs text-red-400">
        DeepDive error: {error.message || 'Unknown error'}
      </p>
    </div>
  {/await}
{/if}
