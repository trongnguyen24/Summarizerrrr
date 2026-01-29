<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'

  // Import composables
  import Icon from '@iconify/svelte'
  import SummarizeButton from '@/components/buttons/SummarizeButton.svelte'
  import { useNavigationManager } from '../composables/useNavigationManager.svelte.js'
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import { useFloatingPanelState } from '../composables/useFloatingPanelState.svelte.js'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import { useApiKeyValidation } from '../composables/useApiKeyValidation.svelte.js'
  import ApiKeySetupPrompt from '@/components/ui/ApiKeySetupPrompt.svelte'
  import { fadeOnly } from '@/lib/ui/slideScaleFade.js'
  import FloatingPanelContent from '@/components/displays/floating-panel/FloatingPanelContent.svelte'
  import ActionButtonsFP from '@/components/buttons/ActionButtonsFP.svelte'
  import ActionButtonsMiniFP from '@/components/buttons/ActionButtonsMiniFP.svelte'
  import ShadowToast from '@/components/feedback/ShadowToast.svelte'
  import ShadowTooltip from '@/components/ui/ShadowTooltip.svelte'
  import { t } from 'svelte-i18n'
  // Deep Dive imports
  import DeepDivePanelFP from './DeepDivePanelFP.svelte'
  // Notification for Floating Panel (Shadow DOM compatible)
  import NotiFP from './NotiFP.svelte'
  import {
    deepDiveState,
    shouldShowDeepDive,
  } from '@/stores/deepDiveStore.svelte.js'

  let panelPosition = $derived(settings.floatingPanelLeft ? 'left' : 'right')
  let { visible, summary, status, onclose, children, summarization } = $props()

  let panelElement = $state()
  let isResizing = $state(false)
  let currentWidthPx = $state(380) // Default to MIN_WIDTH_PX để đảm bảo animation hoạt động ngay
  let showElement = $state(false) // Still used for backdrop/animation logic
  const { needsApiKeySetup } = useApiKeyValidation()

  // Toast state
  let toastVisible = $state(false)
  let toastProps = $state({
    title: '',
    message: '',
    icon: '',
  })
  let toastTimeout

  function handleToastEvent(event) {
    const { title, message, icon } = event.detail
    toastProps = { title, message, icon }
    toastVisible = true

    // Clear existing timeout
    if (toastTimeout) clearTimeout(toastTimeout)

    // Auto hide after 3 seconds
    toastTimeout = setTimeout(() => {
      toastVisible = false
    }, 3000)
  }

  function closeToast() {
    toastVisible = false
    if (toastTimeout) clearTimeout(toastTimeout)
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

  function openSettings() {
    browser.runtime.sendMessage({ type: 'OPEN_SETTINGS' })
  }

  function openArchive() {
    browser.runtime.sendMessage({ type: 'OPEN_ARCHIVE' })
  }

  function handleSummarizeClick() {
    summarization.summarizePageContent()
  }

  async function handleCustomAction(actionType) {
    console.log(`[FloatingPanel] Executing custom action: ${actionType}`)
    if (actionType === 'chapters') {
      await summarization.summarizeChapters()
    } else if (actionType === 'comments') {
      await summarization.summarizeComments()
    } else if (actionType === 'courseConcepts') {
      await summarization.summarizeCourseConcepts()
    } else {
      await summarization.summarizePageContent(actionType)
    }
  }

  function handleStopSummarization() {
    console.log('[FloatingPanel] Stopping summarization...')
    summarization.stopSummarization()
  }

  // Detect if current page is YouTube
  let isYouTubeActive = $derived(() => {
    const url = window.location.href
    return /youtube\.com\/watch/i.test(url)
  })

  // Detect if current page is Course (Udemy/Coursera)
  let isCourseActive = $derived(() => {
    const url = window.location.href
    return /udemy\.com|coursera\.org/i.test(url)
  })
  function togglePanelPosition() {
    updateSettings({ floatingPanelLeft: !settings.floatingPanelLeft })
  }
  // Constants in px units
  const MIN_WIDTH_PX = 380 // 380px
  const MAX_WIDTH_PX = 860 // 860px

  // Helper functions to convert between em and px
  function emToPx(em) {
    try {
      const rootFontSize = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      )
      // Fallback to 16px if root font size cannot be determined
      const fontSize = isNaN(rootFontSize) ? 16 : rootFontSize
      return em * fontSize
    } catch (error) {
      console.warn(
        'Failed to get root font size, using 16px as fallback:',
        error,
      )
      return em * 16 // Fallback to 16px
    }
  }

  function pxToEm(px) {
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    )
    return px / rootFontSize
  }

  // Initialize composables
  const panelState = useFloatingPanelState()

  // Computed properties để determine what to display
  let summaryToDisplay = $derived(summarization.summaryToDisplay() || summary)
  let statusToDisplay = $derived(
    summarization.localSummaryState().isLoading
      ? 'loading'
      : summarization.localSummaryState().error
        ? 'error'
        : status,
  )

  // Deep Dive visibility
  let showDeepDive = $derived(
    shouldShowDeepDive() &&
      summaryToDisplay &&
      summaryToDisplay.trim() !== '' &&
      !summarization.localSummaryState().isLoading,
  )

  // Load saved width
  async function loadWidth() {
    try {
      const data = await browser.storage.local.get('sidePanelWidthPx')
      const savedWidthPx = data.sidePanelWidthPx // Saved width is in px units
      if (
        savedWidthPx &&
        savedWidthPx >= MIN_WIDTH_PX &&
        savedWidthPx <= MAX_WIDTH_PX
      ) {
        currentWidthPx = savedWidthPx
      } else {
        // Set default width if no saved width or invalid saved width
        currentWidthPx = Math.max(
          MIN_WIDTH_PX,
          Math.min(emToPx(settings.sidePanelDefaultWidth), MAX_WIDTH_PX),
        )
      }
    } catch (error) {
      console.warn('Failed to load width, using default:', error)
      // Fallback to default width on error
      currentWidthPx = Math.max(
        MIN_WIDTH_PX,
        Math.min(emToPx(settings.sidePanelDefaultWidth), MAX_WIDTH_PX),
      )
    }
  }

  // Save current width
  async function saveWidth() {
    try {
      await browser.storage.local.set({ sidePanelWidthPx: currentWidthPx }) // Save in px units
    } catch (error) {
      console.warn('Failed to save width:', error)
    }
  }

  // Resize logic
  function handleResizeStart(event) {
    if (!panelElement) return

    isResizing = true
    document.body.style.userSelect = 'none'
    // Prevent text selection and other browser behaviors
    event.preventDefault()

    // Get clientX from either mouse or touch event
    const getClientX = (e) => {
      if (e.type.startsWith('touch')) {
        return e.touches[0].clientX
      }
      return e.clientX
    }

    // Store initial mouse position và current panel width in px
    const startMouseX = getClientX(event)
    const startWidthPx = currentWidthPx

    const handleMove = (e) => {
      if (!isResizing) return

      const currentMouseX = getClientX(e)
      let newWidthPx

      if (panelPosition === 'right') {
        // Panel bên phải: kéo trái = tăng width, kéo phải = giảm width
        const deltaX = startMouseX - currentMouseX
        newWidthPx = startWidthPx + deltaX
      } else {
        // Panel bên trái: kéo phải = tăng width, kéo trái = giảm width
        const deltaX = currentMouseX - startMouseX
        newWidthPx = startWidthPx + deltaX
      }

      // Validate width in px
      if (newWidthPx >= MIN_WIDTH_PX && newWidthPx <= MAX_WIDTH_PX) {
        currentWidthPx = newWidthPx
        panelElement.style.width = newWidthPx + 'px'
      }
    }

    const handleEnd = () => {
      isResizing = false
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
      saveWidth()
    }

    // Add event listeners for both mouse and touch
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }

  // Keyboard handler
  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      onclose?.()
    }
  }

  // State for animation class
  let isActive = $state(false)

  // Effect để handle visible state changes với smooth animation
  $effect(() => {
    if (visible) {
      // Show element first
      showElement = true
      // Use requestAnimationFrame to ensure element is rendered/displayed before adding visible class (trigger transition)
      requestAnimationFrame(() => {
        isActive = true
      })
    } else {
      // Start exit animation
      isActive = false
      // Wait for animation to complete before hiding "interactions"
      setTimeout(() => {
        // Only output hidden if we didn't become visible again during the timeout
        if (!isActive) {
          showElement = false
        }
      }, 410) // Match CSS transition duration
    }
  })

  // Width is handled by style binding in template, no need for manual effect

  onMount(() => {
    loadWidth()
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('summarizeClick', handleSummarizeClick)
    window.addEventListener('gemini-toast', handleToastEvent)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('summarizeClick', handleSummarizeClick)
    window.removeEventListener('gemini-toast', handleToastEvent)
    document.body.style.userSelect = ''
    if (toastTimeout) clearTimeout(toastTimeout)
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="backdrop"
  class:visible
  onclick={() => {
    if (settings.closePanelOnOutsideClick) {
      onclose?.()
    }
  }}
></div>
<!-- Sidepanel container -->
<div
  class="floating-panel pt-8"
  class:visible={isActive}
  class:left={panelPosition === 'left'}
  class:right={panelPosition === 'right'}
  class:invisible={!showElement}
  bind:this={panelElement}
  role="dialog"
  aria-modal="true"
  style="width: {currentWidthPx}px"
>
  {#if !settings.hasCompletedOnboarding}
    <div
      class="absolute z-[10001] inset-0"
      in:fadeOnly={{ duration: 300 }}
      out:fadeOnly={{ duration: 300 }}
    >
      {#await import('@/components/welcome/WelcomeFlow.svelte')}
        <div
          class="welcome-loading-container absolute z-50 bg-surface-1 inset-0 flex items-center justify-center"
        ></div>
      {:then { default: WelcomeFlow }}
        <div
          class="absolute max-h-svh z-[99] inset-0 flex items-center justify-center"
        >
          <WelcomeFlow shadow={true} />
        </div>
      {:catch error}
        <div
          class="welcome-error-container absolute z-50 bg-surface-1 inset-0 flex items-center justify-center"
        >
          <p class="text-red-500">
            Error loading welcome flow: {error.message}
          </p>
        </div>
      {/await}
    </div>
  {/if}
  <!-- Resize handle -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="resize-handle bg-transparent transition-colors flex justify-center items-center"
    class:left={panelPosition === 'left'}
    class:right={panelPosition === 'right'}
    class:resizing={isResizing}
    onmousedown={handleResizeStart}
    ontouchstart={handleResizeStart}
    role="separator"
    aria-orientation="vertical"
    aria-label="Resize panel"
    title="Drag to resize panel width"
  >
    <span class="w-2.5 h-12 text-white dark:text-border">
      <svg
        viewBox="0 0 10 48"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          class=" stroke-border"
          d="M9.5 5.20703V42.793L5 47.293L0.5 42.793V5.20703L5 0.707031L9.5 5.20703Z"
          fill="currentColor"
          stroke="black"
        />
      </svg>
    </span>
  </div>
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    onclick={togglePanelPosition}
    class="close-button absolute text-muted z-[99] border-r border-border hover:text-text-primary transition-colors w-14 duration-200 cursor-pointer h-8 top-0 left-0 flex justify-center items-center"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      viewBox="0 0 24 24"
      class="{panelPosition === 'left'
        ? '-scale-x-100'
        : ''} delay-200 transition-transform duration-300"
    >
      <g fill="none" stroke="currentColor" stroke-width="2">
        <path
          d="M2 11c0-3.771 0-5.657 1.172-6.828S6.229 3 10 3h4c3.771 0 5.657 0 6.828 1.172S22 7.229 22 11v2c0 3.771 0 5.657-1.172 6.828S17.771 21 14 21h-4c-3.771 0-5.657 0-6.828-1.172S2 16.771 2 13z"
        />
        <path stroke-linecap="round" d="M5.5 10h6m-5 4h4m4.5 7V3" />
      </g>
    </svg>
  </button>
  <button
    onclick={() => onclose?.()}
    class="close-button absolute text-muted z-[98] border-b border-border bg-blackwhite-10 dark:bg-surface-2 hover:text-text-primary transition-colors duration-200 cursor-pointer h-8 top-0 right-0 left-0 flex justify-center items-center"
    aria-label="Close"
    ><Icon
      icon="heroicons:arrow-long-right"
      class=" {panelPosition === 'left' ? '-scale-x-100' : ''}"
      width="24"
      height="24"
    /></button
  >
  <div
    id="shadow-scroll"
    class="w-full h-full overflow-y-auto pb-32 outline-none"
    tabindex="-1"
  >
    <div class="grid grid-rows-[10px_200px_10px_1fr] relative">
      <div
        class="top-stripes border-b border-border flex justify-center items-center w-full h-full"
      ></div>
      <div class="w-full flex items-center justify-center my-8">
        <div class="size-10 absolute z-10 top-4 left-2">
          <ShadowTooltip content={$t('archive.open_archive')} side="right">
            <button
              class="size-10 cursor-pointer text-text-secondary hover:text-text-primary transition-colors flex justify-center items-center"
              onclick={openArchive}
            >
              <Icon icon="solar:history-linear" width="24" height="24" />
            </button>
          </ShadowTooltip>
        </div>
        <div class="size-10 absolute z-10 top-4 right-2">
          <ShadowTooltip content={$t('settings.open_settings')} side="left">
            <button
              class="size-10 cursor-pointer text-text-secondary hover:text-text-primary transition-colors flex justify-center items-center"
              onclick={openSettings}
            >
              <Icon width={24} icon="heroicons:cog-6-tooth" />
            </button>
          </ShadowTooltip>
        </div>
        {#if !needsApiKeySetup()()}
          <SummarizeButton
            isLoading={summarization.localSummaryState().isLoading}
            onStop={handleStopSummarization}
            onClick={handleSummarizeClick}
          />
        {/if}
        {#if summaryToDisplay || summarization.localSummaryState().error}
          <ActionButtonsMiniFP
            onActionClick={handleCustomAction}
            isYouTubeActive={isYouTubeActive()}
            isCourseActive={isCourseActive()}
          />
        {/if}
      </div>
      <div
        class="top-stripes border-t border-b border-border flex justify-center items-center w-full h-full"
      ></div>
    </div>
    <div class=" py-14">
      {#if needsApiKeySetup()()}
        <div class="px-4 pt-4">
          <ApiKeySetupPrompt />
        </div>
      {:else}
        <FloatingPanelContent
          status={statusToDisplay}
          summary={summaryToDisplay}
          error={summarization.localSummaryState().error}
          contentType={summarization.localSummaryState().contentType}
          courseConcepts={summarization.localSummaryState().courseConcepts}
          isCourseSummaryLoading={summarization.localSummaryState().isLoading}
          isCourseConceptsLoading={summarization.localSummaryState()
            .isCourseConceptsLoading}
          activeYouTubeTab={panelState.activeYouTubeTab()}
          activeCourseTab={panelState.activeCourseTab()}
          onSelectYouTubeTab={panelState.setActiveYouTubeTab}
          onSelectCourseTab={panelState.setActiveCourseTab}
          {summarization}
        />
      {/if}

      {#if !summaryToDisplay && !summarization.localSummaryState().isLoading && !needsApiKeySetup()()}
        <ActionButtonsFP
          onActionClick={handleCustomAction}
          isYouTubeActive={isYouTubeActive()}
          isCourseActive={isCourseActive()}
        />
      {/if}

      {#if children?.settingsMini}
        {@render children.settingsMini()}
      {/if}

      <!-- Deep Dive Panel -->
      {#if showDeepDive}
        <DeepDivePanelFP
          summaryContent={summaryToDisplay}
          pageTitle={summarization.localSummaryState().pageTitle || 'Summary'}
          pageUrl={summarization.localSummaryState().pageUrl ||
            window.location.href}
          summaryLang={settings.summaryLang || 'English'}
          isVisible={true}
        />
      {/if}

      <!-- Toast Notification -->
      <ShadowToast
        visible={toastVisible}
        title={toastProps.title}
        message={toastProps.message}
        icon={toastProps.icon}
        onClose={closeToast}
      />

      <!-- Notification Bar -->
      <NotiFP />
    </div>
  </div>
</div>

<style>
  /* Sidepanel Main Container */
  .floating-panel {
    position: fixed;
    top: 0;
    height: 100vh;
    width: 25em; /* Default width in em units */
    background-color: var(--color-surface-1);
    font-size: 16px;
    display: flex;
    flex-direction: column;
    z-index: 2147483641;
    color: var(--color-text-primary);
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    transition: transform 0.4s cubic-bezier(0.4, 0.71, 0.45, 1);
    box-sizing: border-box;
  }

  .floating-panel.right {
    right: 0;
    transform: translateX(100%);
  }

  .floating-panel.left {
    left: 0;
    transform: translateX(-100%);
  }

  /* Resize Handle */
  .resize-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0.5em;
    cursor: col-resize;
    flex-shrink: 0;
    z-index: 10000;
  }

  .resize-handle.right {
    left: 0;
    transform: translateX(-50%);
  }

  .resize-handle.left {
    right: 0;
    transform: translateX(50%);
  }

  /* Active state khi đang resize */
  .resize-handle.resizing {
    background-color: oklch(50% 0 0 / 0.175) !important;
  }

  /* Backdrop */
  .backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: transparent;
    z-index: 2147483640;
    pointer-events: none; /* Allow pass through when hidden */
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  .backdrop.visible {
    pointer-events: auto;
    opacity: 1;
  }
</style>
