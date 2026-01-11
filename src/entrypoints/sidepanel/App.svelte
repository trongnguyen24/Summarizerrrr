<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import 'overlayscrollbars/overlayscrollbars.css'
  import SettingButton from '@/components/buttons/SettingButton.svelte'
  import SummarizeButton from '@/components/buttons/SummarizeButton.svelte'
  import ActionButtons from '@/components/buttons/ActionButtons.svelte'
  import TabNavigation from '@/components/navigation/TabNavigation.svelte'
  import GenericSummaryDisplay from '@/components/displays/core/GenericSummaryDisplay.svelte'
  import YouTubeSummaryDisplay from '@/components/displays/platform/YouTubeSummaryDisplay.svelte'
  import CourseSummaryDisplay from '@/components/displays/platform/CourseSummaryDisplay.svelte'
  import ErrorDisplay from '@/components/displays/ui/ErrorDisplay.svelte'
  import ApiKeySetupPrompt from '@/components/ui/ApiKeySetupPrompt.svelte'
  import { Toaster, toast } from 'svelte-sonner'
  import ModelToast from '@/components/feedback/ModelToast.svelte'
  import Noti from '@/components/ui/Noti.svelte'
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
  } from '@/stores/summaryStore.svelte.js'
  import { tabTitle } from '@/stores/tabTitleStore.svelte.js'
  import { setupMessageListener } from '@/services/messageHandler.js'
  import { getCurrentTabId } from '@/services/tabCacheService.js'
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
  import { fadeOnly, slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import ActionButtonsMini from '@/components/buttons/ActionButtonsMini.svelte'
  import { debounce } from '@/lib/utils/utils.js'
  import Tooltip from '@/components/ui/Tooltip.svelte'
  import { Tooltip as BitsTooltip } from 'bits-ui'

  // Deep Dive imports
  import DeepDiveFAB from '@/components/tools/deepdive/DeepDiveFAB.svelte'
  import DeepDiveDialog from '@/components/tools/deepdive/DeepDiveDialog.svelte'
  import DeepDiveContent from '@/components/tools/deepdive/DeepDiveContent.svelte'
  import InlineDeepDiveQuestions from '@/components/tools/deepdive/InlineDeepDiveQuestions.svelte'
  import {
    deepDiveState,
    toggleDeepDive,
    shouldShowDeepDive,
    updateSummaryContext,
    setQuestions,
    setGenerating,
    setError,
    addToQuestionHistory,
  } from '@/stores/deepDiveStore.svelte.js'
  import { generateFollowUpQuestions } from '@/services/tools/deepDiveService.js'

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
    const noLoadingStates =
      !summaryState.isLoading &&
      !summaryState.isCourseSummaryLoading &&
      !summaryState.isCourseConceptsLoading &&
      !summaryState.isSelectedTextLoading &&
      !summaryState.isCustomActionLoading

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
    const allLoadingComplete =
      !summaryState.isLoading &&
      !summaryState.isCourseSummaryLoading &&
      !summaryState.isCourseConceptsLoading &&
      !summaryState.isSelectedTextLoading &&
      !summaryState.isCustomActionLoading

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
   */
  $effect(() => {
    const allLoadingComplete =
      !summaryState.isLoading &&
      !summaryState.isCourseSummaryLoading &&
      !summaryState.isCourseConceptsLoading &&
      !summaryState.isSelectedTextLoading &&
      !summaryState.isCustomActionLoading

    const content = getSummaryContent()
    const autoGenEnabled = settings.tools?.deepDive?.autoGenerate ?? false
    const toolEnabled = settings.tools?.deepDive?.enabled ?? false

    // Trigger auto-generate nếu:
    // 1. All loading complete
    // 2. Có content
    // 3. Tool enabled
    // 4. Auto-generate enabled
    // 5. Chưa có questions (tránh regenerate không cần thiết)
    if (
      allLoadingComplete &&
      content &&
      content.trim() !== '' &&
      toolEnabled &&
      autoGenEnabled &&
      deepDiveState.questions.length === 0
    ) {
      console.log('[App] Auto-generating Deep Dive questions...')

      // Async function inside effect
      ;(async () => {
        const targetTabId = getCurrentTabId()
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
          console.log('[App] Auto-generated questions:', questions)
        } catch (error) {
          console.error('[App] Auto-generation failed:', error)
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
<div class="main-container flex min-w-[22.5rem] bg-surface-1 w-full flex-col">
  <div
    class="grid grid-rows-[32px_1px_8px_1px_192px_1px_8px_1px_1fr] min-h-screen"
  >
    <div class=" flex justify-center items-center w-full h-full">
      <div class="text-text-secondary">
        <div
          class="line-clamp-1 w-screen !text-center text-[0.75rem] px-2 text-text-secondary"
        >
          {$tabTitle}
        </div>
      </div>
    </div>

    <div class="bg-border"></div>
    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>
    <div class="bg-border"></div>

    <div
      class="flex relative font-mono flex-col gap-1 justify-center items-center"
    >
      <div class="size-6 absolute z-10 top-2 left-2 text-text-secondary">
        <BitsTooltip.Provider>
          <Tooltip
            content={$t('archive.open_archive')}
            side="right"
            align="start"
          >
            {#snippet children({ builder })}
              <button
                onclick={() => {
                  browser.tabs.create({ url: 'archive.html' })
                }}
                class="p-1 setting-animation transition-colors hover:bg-surface-1 rounded-full hover:text-text-primary"
                {...builder}
              >
                <Icon icon="solar:history-linear" width="24" height="24" />
              </button>
            {/snippet}
          </Tooltip>
        </BitsTooltip.Provider>
      </div>
      <div class="size-6 z-10 absolute top-2 right-4 text-text-secondary">
        <SettingButton />
      </div>

      <div class="flex flex-col gap-4 items-center justify-center">
        {#if !needsApiKeySetup()()}
          <div class="flex flex-row gap-3 items-center">
            <SummarizeButton
              isLoading={summaryState.isLoading ||
                isAnyCourseLoading ||
                summaryState.isCustomActionLoading}
              disabled={!hasPermission && import.meta.env.BROWSER === 'firefox'}
            />
          </div>
          <!-- Custom Action Buttons - Only show when all summaries are completed -->
          {#if areAllSummariesCompleted()}
            <ActionButtonsMini />
          {/if}
        {/if}
      </div>

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
        {/await}
      {/if}
    </div>

    <div class="bg-border"></div>

    <div
      class="top-stripes flex justify-center items-center w-full h-full"
    ></div>

    <div class="bg-border"></div>

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
        {#if shouldShowDeepDive() && settings.tools?.deepDive?.autoGenerate}
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
        {#if shouldShowDeepDive() && settings.tools?.deepDive?.autoGenerate}
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
        {#if shouldShowDeepDive() && settings.tools?.deepDive?.autoGenerate}
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
        {#if shouldShowDeepDive() && settings.tools?.deepDive?.autoGenerate}
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
<Toaster />
<!-- Deep Dive FAB & Section with Error Boundary -->
{#if shouldShowDeepDive()}
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
