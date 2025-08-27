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
  import { settings, loadSettings } from '@/stores/settingsStore.svelte.js'
  import {
    themeSettings,
    initializeTheme,
    subscribeToSystemThemeChanges,
  } from '@/stores/themeStore.svelte.js'
  import '@fontsource-variable/geist-mono'
  import '@fontsource-variable/noto-serif'
  import '@fontsource/opendyslexic'
  import '@fontsource/mali'
  import { fade, slide } from 'svelte/transition'

  // Track if settings are loaded
  let settingsLoaded = $state(false)

  // Provider to API key field mapping
  const providerApiKeyMap = {
    gemini: 'geminiApiKey',
    'gemini-advanced': 'geminiAdvancedApiKey',
    'openai-compatible': 'openaiCompatibleApiKey',
    openrouter: 'openrouterApiKey',
    deepseek: 'deepseekApiKey',
    chatgpt: 'chatgptApiKey',
    groq: 'groqApiKey',
    // ollama và lmstudio không cần API key (local endpoints)
  }

  // Provider display names for user-friendly messages
  const providerDisplayNames = {
    gemini: 'Gemini',
    'gemini-advanced': 'Gemini Advanced',
    'openai-compatible': 'OpenAI Compatible',
    openrouter: 'OpenRouter',
    deepseek: 'DeepSeek',
    chatgpt: 'ChatGPT',
    groq: 'Groq',
    ollama: 'Ollama',
    lmstudio: 'LM Studio',
  }

  // Check if current provider needs API key setup
  let needsApiKeySetup = $derived(() => {
    const rawProvider = settings.selectedProvider
    const isAdvanced = settings.isAdvancedMode

    console.log('🔍 [needsApiKeySetup] Debug Info:')
    console.log('  - selectedProvider (raw):', rawProvider)
    console.log('  - isAdvancedMode:', isAdvanced)

    // Determine the actual provider based on isAdvancedMode (like in api.js)
    let actualProvider = rawProvider
    if (!isAdvanced) {
      actualProvider = 'gemini' // Force Gemini in basic mode
    }

    console.log(
      '  - actualProvider (after isAdvancedMode check):',
      actualProvider
    )

    // Special handling for Gemini provider based on advanced mode
    let keyField
    if (actualProvider === 'gemini') {
      keyField = isAdvanced ? 'geminiAdvancedApiKey' : 'geminiApiKey'
      console.log(
        '  - Gemini provider, using keyField:',
        keyField,
        '(advanced:',
        isAdvanced,
        ')'
      )
    } else {
      keyField = providerApiKeyMap[actualProvider]
      console.log('  - Non-Gemini provider, keyField from map:', keyField)
    }

    console.log('  - Final keyField:', keyField)
    console.log('  - providerApiKeyMap:', providerApiKeyMap)
    console.log('  - settings object keys:', Object.keys(settings))

    // Providers không cần API key (ollama, lmstudio)
    if (!keyField) {
      console.log('  - No keyField required for this provider, returning false')
      return false
    }

    // Check xem API key có rỗng không
    const apiKey = settings[keyField]
    console.log('  - apiKey value:', apiKey)
    console.log('  - apiKey type:', typeof apiKey)
    console.log('  - apiKey length:', apiKey?.length || 'undefined')
    console.log('  - apiKey trimmed:', apiKey?.trim() || 'undefined')

    const needsSetup = !apiKey || apiKey.trim() === ''
    console.log('  - needsApiKeySetup result:', needsSetup)
    console.log('🔍 [needsApiKeySetup] End Debug Info\n')

    return needsSetup
  })

  // Get display name for current provider
  const currentProviderDisplayName = $derived(() => {
    return (
      providerDisplayNames[settings.selectedProvider] ||
      settings.selectedProvider
    )
  })

  // Function to open settings page
  const openSettings = () => {
    browser.tabs.create({ url: browser.runtime.getURL('settings.html') })
  }

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
      resetDisplayState() // Reset display state before new summarization
      fetchAndSummarize() // Call the main summarization function
    }

    document.addEventListener('summarizeClick', handleSummarizeClick)

    return () => {
      document.removeListener('summarizeClick', handleSummarizeClick)
    }
  })
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
      class="relative prose main-sidepanel prose-h2:mt-4 p z-10 flex flex-col gap-8 px-6 pt-8 pb-[40vh] max-w-[52rem] w-screen mx-auto"
    >
      {#if needsApiKeySetup()}
        <div
          class="absolute inset-0 px-6 flex flex-col text-center w-full justify-center items-center gap-4"
          in:fade={{ duration: 300 }}
          out:fade={{ duration: 200 }}
        >
          <div class="flex flex-col gap-3 items-center">
            <div
              class="size-16 shrink-0 flex justify-center items-center overflow-hidden relative"
            >
              <div
                class="absolute z-40 border border-border dark:border-surface-2 inset-0"
              ></div>
              <div class="absolute inset-1 bg-white/50 dark:bg-white/3"></div>
              <span
                class="absolute z-20 size-6 rotate-45 bg-surface-1 bottom-px left-px -translate-x-1/2 translate-y-1/2"
              ></span>
              <span
                class="absolute z-20 size-6 rotate-45 bg-surface-1 top-px right-px translate-x-1/2 -translate-y-1/2"
              ></span>
              <span
                class="absolute z-50 size-4 rotate-45 bg-surface-1 border border-border dark:border-surface-2 bottom-px left-px -translate-x-1/2 translate-y-1/2"
              ></span>
              <span
                class="absolute z-50 size-4 rotate-45 border-surface-1 bg-border dark:bg-muted border dark:border-surface-2 top-px right-px translate-x-1/2 -translate-y-1/2"
              ></span>
              <Icon
                icon="material-symbols-light:key"
                class="size-8 rotateAnimation  text-muted dark:text-text-primary  shrink-0"
              />
            </div>

            <div class="flex flex-col gap-2 text-center">
              <p class="text-sm text-text-secondary max-w-sm">
                To get started please configure your API key in Settings.
              </p>
            </div>
          </div>

          <div class="flex flex-col gap-2 items-center">
            <button
              onclick={openSettings}
              class="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Open Settings
            </button>
            <a
              href="https://docs.example.com/api-setup"
              target="_blank"
              class="text-xs text-text-secondary hover:text-primary underline underline-offset-2 transition-colors"
            >
              How to setup API key
            </a>
          </div>
        </div>
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
