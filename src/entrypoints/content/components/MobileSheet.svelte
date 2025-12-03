<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import Icon from '@iconify/svelte'
  import SummarizeButton from '@/components/buttons/SummarizeButton.svelte'
  import { useNavigationManager } from '../composables/useNavigationManager.svelte.js'
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import { useFloatingPanelState } from '../composables/useFloatingPanelState.svelte.js'
  import {
    lockBodyScroll,
    unlockBodyScroll,
  } from '../composables/scroll-freezer.js'
  import FloatingPanelContent from '@/components/displays/floating-panel/FloatingPanelContent.svelte'
  import ApiKeySetupPrompt from '@/components/ui/ApiKeySetupPrompt.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import { useApiKeyValidation } from '../composables/useApiKeyValidation.svelte.js'
  import { fade } from 'svelte/transition'
  import ActionButtonsFP from '@/components/buttons/ActionButtonsFP.svelte'
  import ActionButtonsMiniFP from '@/components/buttons/ActionButtonsMiniFP.svelte'
  import ShadowToast from '@/components/feedback/ShadowToast.svelte'
  // Deep Dive imports
  import DeepDivePanelMobile from './DeepDivePanelMobile.svelte'
  import {
    deepDiveState,
    shouldShowDeepDive,
  } from '@/stores/deepDiveStore.svelte.js'

  let { visible, onclose, summarization } = $props()
  const panelState = useFloatingPanelState()
  const { needsApiKeySetup } = useApiKeyValidation()

  // Toast state
  let toastVisible = $state(false)
  let toastProps = $state({
    title: '',
    message: '',
    icon: '',
  })
  let toastTimeout

  // Delayed visibility for animation
  let delayedVisible = $state(visible)
  let visibleTimer
  let safariHackVisible = $state(false)

  $effect(() => {
    if (visible) {
      if (visibleTimer) clearTimeout(visibleTimer)
      delayedVisible = true
    } else {
      visibleTimer = setTimeout(() => {
        delayedVisible = false
      }, 600)
    }
  })

  function handleToastEvent(event) {
    const { title, message, icon } = event.detail
    toastProps = { title, message, icon }
    toastVisible = true

    if (toastTimeout) clearTimeout(toastTimeout)

    toastTimeout = setTimeout(() => {
      toastVisible = false
    }, 3000)
  }

  function closeToast() {
    toastVisible = false
    if (toastTimeout) clearTimeout(toastTimeout)
  }

  // Detect if current page is YouTube
  let isYouTubeActive = $derived(() => {
    const url = window.location.href
    return /youtube\.com\/watch/i.test(url)
  })

  let summaryToDisplay = $derived(summarization.summaryToDisplay())
  let statusToDisplay = $derived(summarization.statusToDisplay())

  // Deep Dive visibility
  let showDeepDive = $derived(
    shouldShowDeepDive() &&
      summaryToDisplay &&
      summaryToDisplay.trim() !== '' &&
      !summarization.localSummaryState().isLoading,
  )

  // --- Drag & Animation Logic ---
  let isDragging = $state(false)
  let translateY = $state(120) // % of viewport height (120 = hidden, 0 = full open)
  let dragOpacity = $state(1)
  let dragSource = 'header' // 'header' | 'content'
  let contentPadding = $state(0) // vh
  let startY = 0
  let startTranslateY = 0
  let startTime = 0
  let drawerPanel
  let drawerContent
  let drawerHeader
  let previousOnboardingState = $state(settings.hasCompletedOnboarding)

  // Constants
  const MIN_OPEN_PERCENT = 40 // Minimum height % (so max translateY is 60vh)
  const VELOCITY_THRESHOLD = 0.5 // px/ms

  function openDrawer() {
    lockBodyScroll()
    // If onboarding not completed, open full screen
    if (!settings.hasCompletedOnboarding) {
      translateY = 0 // Full open (100% height)
      contentPadding = 0
      dragOpacity = 1
      return
    }

    // Calculate initial position based on settings
    // settings.mobileSheetHeight is likely a percentage (e.g. 50, 60, 90)
    // If it's not set, default to 50%
    const targetHeight = settings.mobileSheetHeight || 50
    // translateY = 100 - height
    translateY = 100 - targetHeight
    contentPadding = translateY
    dragOpacity = 1
  }

  function closeDrawer() {
    unlockBodyScroll()
    translateY = 120 // Slide down out of view
    dragOpacity = 0

    // Safari Hack: Toggle a dummy element to force repaint/clear transparent bar background
    safariHackVisible = true
    setTimeout(() => {
      safariHackVisible = false
    }, 800)

    setTimeout(() => {
      onclose?.()
    }, 600) // Match transition duration
  }

  $effect(() => {
    if (visible) {
      // Use requestAnimationFrame to ensure DOM is ready and transition triggers
      requestAnimationFrame(() => {
        openDrawer()
      })
    } else {
      // If visible becomes false externally
      if (translateY < 120) {
        closeDrawer()
      }
    }
  })

  // Watch for onboarding completion to animate sheet to default position
  $effect(() => {
    // Only trigger when transitioning from not completed -> completed
    // AND sheet is currently at full position (from onboarding)
    if (
      !previousOnboardingState &&
      settings.hasCompletedOnboarding &&
      visible &&
      translateY < 5 // Only if sheet is near full position (allowing small variance)
    ) {
      // User just completed onboarding, animate to default position
      const targetHeight = settings.mobileSheetHeight || 50
      translateY = 100 - targetHeight
      contentPadding = translateY
      previousOnboardingState = true // Update tracker to prevent retriggering
    } else if (previousOnboardingState !== settings.hasCompletedOnboarding) {
      // Sync tracker if settings changed externally
      previousOnboardingState = settings.hasCompletedOnboarding
    }
  })

  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      closeDrawer()
    }
  }

  // Drag Handlers
  function onDragStart(e) {
    const target = e.target
    // Allow drag if touching header OR content at top
    const isHeader = drawerHeader?.contains(target)
    const isContentTop =
      drawerContent?.contains(target) && drawerContent.scrollTop === 0

    if (isHeader || isContentTop) {
      isDragging = true
      dragSource = isHeader ? 'header' : 'content'
      startY = e.touches ? e.touches[0].pageY : e.pageY
      startTranslateY = translateY
      startTime = Date.now()
    }
  }

  function onDragMove(e) {
    if (!isDragging) return

    const currentY = e.touches ? e.touches[0].pageY : e.pageY
    const deltaY = currentY - startY
    // Convert delta pixels to vh percentage
    const viewportHeight = window.innerHeight
    const deltaVh = (deltaY / viewportHeight) * 100

    let newTranslateY = startTranslateY + deltaVh

    // Constraint: Don't pull up past 0 (100% height)
    // Add some resistance if pulling past 0? For now just clamp.
    if (newTranslateY < 0) newTranslateY = 0

    // Constraint: If dragging content, cannot pull UP (expand) beyond start position
    if (dragSource === 'content' && newTranslateY < startTranslateY) {
      newTranslateY = startTranslateY
    }

    translateY = newTranslateY

    // Opacity logic: Fade out when height < 40% (translateY > 60)
    const maxTranslate = 100 - MIN_OPEN_PERCENT
    if (translateY > maxTranslate) {
      const progress = (translateY - maxTranslate) / (100 - maxTranslate)
      dragOpacity = 1 - Math.max(0, Math.min(1, progress))
    } else {
      dragOpacity = 1
    }
  }

  function onDragEnd(e) {
    if (!isDragging) return
    isDragging = false

    const endTime = Date.now()
    const currentY = e.changedTouches ? e.changedTouches[0].pageY : e.pageY
    const deltaY = currentY - startY
    const timeDiff = endTime - startTime
    const velocity = deltaY / timeDiff // px/ms

    // 1. Velocity Check
    if (velocity > VELOCITY_THRESHOLD) {
      // Fast swipe down -> Close
      closeDrawer()
      return
    } else if (velocity < -VELOCITY_THRESHOLD && dragSource === 'header') {
      // Fast swipe up -> Open 100% (Only allowed via header)
      translateY = 0
      contentPadding = 0
      dragOpacity = 1
      return
    }

    // 2. Position Check
    // Convert current translateY to height %
    const currentHeight = 100 - translateY

    if (currentHeight < MIN_OPEN_PERCENT) {
      // If dragged below 40% height, close it
      closeDrawer()
    } else {
      // Not closing
      if (dragSource === 'content') {
        // If dragging content, snap back to original position (cancel pull-to-close)
        translateY = startTranslateY
      } else {
        // If dragging header, stay at current position (Arbitrary height 40-100%)
        if (translateY < 0) translateY = 0
        contentPadding = translateY
      }
      dragOpacity = 1 // Snap back to open opacity
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('summarizeClick', handleSummarizeClick)
    window.addEventListener('gemini-toast', handleToastEvent)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('summarizeClick', handleSummarizeClick)
    window.removeEventListener('gemini-toast', handleToastEvent)
    unlockBodyScroll()
    if (toastTimeout) clearTimeout(toastTimeout)
    if (visibleTimer) clearTimeout(visibleTimer)
  })

  function openArchive() {
    browser.runtime.sendMessage({ type: 'OPEN_ARCHIVE' })
  }
  function openSettings() {
    browser.runtime.sendMessage({ type: 'OPEN_SETTINGS' })
  }

  function handleSummarizeClick() {
    summarization.summarizePageContent()
  }

  function handleCustomAction(actionType) {
    console.log(`[MobileSheet] Executing custom action: ${actionType}`)
    summarization.summarizePageContent(actionType)
  }

  function handleStopSummarization() {
    console.log('[MobileSheet] Stopping summarization...')
    summarization.stopSummarization()
  }
</script>

<!-- Drawer Container -->
<div
  class="fixed inset-0 z-[10000] pointer-events-none"
  role="dialog"
  aria-modal="true"
>
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="drawer-backdrop absolute inset-0 bg-black/40 transition-opacity duration-400 ease-out pointer-events-auto"
    class:opacity-0={!visible}
    class:opacity-100={visible}
    class:invisible={!delayedVisible}
    class:transition-none={isDragging}
    style:opacity={visible && settings.mobileSheetBackdropOpacity
      ? dragOpacity
      : 0}
    onclick={closeDrawer}
  ></div>

  <!-- Drawer Panel -->
  <div
    bind:this={drawerPanel}
    class="drawer-panel fixed bottom-0 left-0 right-0 border-t border-surface-2 bg-surface-1 text-black rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto"
    class:sheet-transition={!isDragging}
    class:invisible={!delayedVisible}
    style:transform={`translateY(${visible ? translateY : 120}%)`}
    style:height="100dvh"
  >
    <!-- Drawer Header (Drag Handle) -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={drawerHeader}
      class="p-4 cursor-grab active:cursor-grabbing drag-handle relative flex-shrink-0"
      ontouchstart={onDragStart}
      onmousedown={onDragStart}
    >
      <div
        class="mx-auto w-12 h-1.5 flex-shrink-0 drag-handle rounded-full bg-blackwhite/10"
      ></div>
    </div>

    <!-- Drawer Content -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={drawerContent}
      id="shadow-scroll"
      class="pb-4 flex-grow overflow-y-auto drawer-content relative"
      style:padding-bottom="{contentPadding}vh"
      ontouchstart={onDragStart}
      onmousedown={onDragStart}
      style:--toc-bottom-offset="{contentPadding}vh"
    >
      {#if !settings.hasCompletedOnboarding}
        <div
          class="absolute z-[10001] inset-0"
          in:fade={{ duration: 300 }}
          out:fade={{ duration: 300 }}
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
      <div class="grid grid-rows-[10px_200px_10px_1fr] relative">
        <div
          class="top-stripes border-t border-b drag-handle border-border flex justify-center items-center w-full h-full"
        ></div>
        <div
          class="w-full no-pull-to-refresh flex items-center justify-center my-8"
        >
          <button
            class="size-10 absolute z-10 top-4 text-text-secondary transition-colors left-2 flex justify-center items-center"
            onclick={openArchive}
            title="Open Archive"
          >
            <Icon icon="solar:history-linear" width="28" />
          </button>
          <button
            class="size-10 absolute z-10 top-4 text-text-secondary right-2 flex justify-center items-center"
            onclick={openSettings}
          >
            <Icon width={28} icon="heroicons:cog-6-tooth" />
          </button>
          {#if !needsApiKeySetup()()}
            <SummarizeButton
              isLoading={statusToDisplay === 'loading'}
              isChapterLoading={false}
              onStop={handleStopSummarization}
              onClick={handleSummarizeClick}
            />
          {/if}
          {#if summaryToDisplay || summarization.localSummaryState().error}
            <ActionButtonsMiniFP
              onActionClick={handleCustomAction}
              isYouTubeActive={isYouTubeActive()}
            />
          {/if}
        </div>
        <div
          class="top-stripes border-t border-b drag-handle border-border flex justify-center items-center w-full h-full"
        ></div>
      </div>
      <div class="pt-8 relative">
        {#if needsApiKeySetup()()}
          <ApiKeySetupPrompt />
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
          <div
            class="no-pull-to-refresh w-full flex justify-center items-center inset-0"
          >
            <ActionButtonsFP
              onActionClick={handleCustomAction}
              isYouTubeActive={isYouTubeActive()}
            />
          </div>
        {/if}

        <!-- Deep Dive Panel -->
        {#if showDeepDive}
          <DeepDivePanelMobile
            summaryContent={summaryToDisplay}
            pageTitle={summarization.localSummaryState().pageTitle || 'Summary'}
            pageUrl={summarization.localSummaryState().pageUrl ||
              window.location.href}
            summaryLang={settings.summaryLang || 'English'}
            isVisible={true}
          />
        {/if}
      </div>
    </div>
    <div
      class="absolute bottom-px left-0 right-0 h-15 bg-surface-1 translate-y-15"
    ></div>

    <!-- Toast Notification -->
    <ShadowToast
      visible={toastVisible}
      title={toastProps.title}
      message={toastProps.message}
      icon={toastProps.icon}
      onClose={closeToast}
    />
  </div>

  {#if safariHackVisible}
    <div class="fixed inset-0 z-[100000] pointer-events-none bg-black/0"></div>
  {/if}
</div>

<svelte:body
  onmousemove={onDragMove}
  onmouseup={onDragEnd}
  ontouchmove={onDragMove}
  ontouchend={onDragEnd}
/>

<style>
  .sheet-transition {
    transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  }

  /* Ngăn chặn touch actions mặc định trên drag handle */
  .drag-handle {
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Ngăn chặn pull-to-refresh cho drawer content */
  .drawer-content {
    touch-action: pan-y;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }
  .no-pull-to-refresh {
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  /* Remove tap highlight on mobile */
  * {
    -webkit-tap-highlight-color: transparent;
  }
</style>
