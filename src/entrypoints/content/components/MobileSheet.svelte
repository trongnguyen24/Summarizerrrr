<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import Icon from '@iconify/svelte'
  import { animate, stagger } from 'animejs'
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

  let { visible, onclose, summarization } = $props()
  // const summarization = useSummarization() // No longer needed, passed as prop
  const panelState = useFloatingPanelState()
  const navigationManager = useNavigationManager()
  const { needsApiKeySetup } = useApiKeyValidation()
  let unsubscribeNavigation = null

  let summaryToDisplay = $derived(summarization.summaryToDisplay())
  let statusToDisplay = $derived(summarization.statusToDisplay())

  let isDragging = false
  let startY
  let currentTranslateY
  let animationFrameId
  let drawerContainer, drawerBackdrop, drawerPanel, drawerHeader, drawerContent

  function openDrawer() {
    if (!drawerContainer) return
    drawerContainer.classList.remove('pointer-events-none')
    lockBodyScroll() // Lock body scroll when opening

    // Backdrop fade in
    animate(drawerBackdrop, {
      opacity: settings.mobileSheetBackdropOpacity ? 1 : 0,
      duration: 300,
      ease: 'outCubic',
    })

    // Panel slide up with elastic effect
    animate(drawerPanel, {
      translateY: '0%',
      duration: 450,
      ease: 'outCubic',
    })

    // Content fade in with stagger
  }

  function closeDrawer() {
    if (!drawerContainer) return
    unlockBodyScroll() // Unlock body scroll when closing

    // Panel slide down
    const panelAnimation = animate(drawerPanel, {
      translateY: 'calc(100% + 10vh)',
      duration: 400,
      ease: 'inQuart',
    })

    // Backdrop fade out (overlapping)
    animate(drawerBackdrop, {
      opacity: settings.mobileSheetBackdropOpacity ? 0 : 0,
      duration: 250,
      ease: 'inCubic',
      delay: 50,
    })

    // Complete callback
    panelAnimation.then(() => {
      drawerContainer.classList.add('pointer-events-none')
      onclose?.()
    })
  }

  $effect(() => {
    if (visible) {
      openDrawer()
    } else {
      if (drawerContainer) {
        // Unlock scroll immediately when starting to close
        unlockBodyScroll()
        // Run closing animation
        closeDrawer()
      }
    }
  })

  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      closeDrawer()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('summarizeClick', handleSummarizeClick)

    // Subscribe vào navigation changes
    unsubscribeNavigation = navigationManager.subscribe(handleUrlChange)
  })

  function handleUrlChange(newUrl) {
    // Khi URL thay đổi, reset state của component
    console.log('MobileSheet: URL changed to', newUrl)
    // Có thể thêm logic để reset state cụ thể ở đây nếu cần
  }

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('summarizeClick', handleSummarizeClick)
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    // Ensure body scroll is unlocked on component unmount
    unlockBodyScroll()

    // Cleanup navigation subscription
    if (unsubscribeNavigation) {
      unsubscribeNavigation()
    }
  })

  // --- Drag/Swipe to close logic ---

  const onDragStart = (e) => {
    const target = e.target
    const isHeader = drawerHeader.contains(target)
    const isContent = drawerContent.contains(target)

    // Only start dragging if:
    // 1. Touched on the header.
    // OR
    // 2. Touched on the content area AND the content is scrolled to the top.
    if (isHeader || (isContent && drawerContent.scrollTop === 0)) {
      // Prevent default behavior (like scrolling) only when a valid drag starts.
      // e.preventDefault()
      isDragging = true
      startY = e.pageY || e.touches[0].pageY

      // Remove any existing transitions for real-time drag
      drawerPanel.style.transition = 'none'
      drawerBackdrop.style.transition = 'none'
    } else {
      // Otherwise, allow content to scroll normally.
      isDragging = false
    }
  }

  const onDragging = (e) => {
    if (!isDragging) {
      // If not dragging the drawer, allow default behavior (e.g., scrolling content)
      return
    }

    const currentY = e.pageY || e.touches[0].pageY
    // Only allow pulling down (positive deltaY)
    const deltaY = Math.max(0, currentY - startY)
    currentTranslateY = deltaY

    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(() => {
        // Update panel position directly for real-time response
        drawerPanel.style.transform = `translateY(${currentTranslateY}px)`

        // Update backdrop opacity
        const panelHeight = drawerPanel.offsetHeight
        const maxOpacity = settings.mobileSheetBackdropOpacity ? 1 : 0
        const opacity = maxOpacity - (currentTranslateY / panelHeight) * 0.8
        drawerBackdrop.style.opacity = Math.max(0, opacity).toString()

        animationFrameId = null
      })
    }
  }

  const onDragEnd = () => {
    if (!isDragging) return
    isDragging = false

    // Restore transitions for animations
    drawerPanel.style.transition = ''
    drawerBackdrop.style.transition = ''

    const panelHeight = drawerPanel.offsetHeight
    if (currentTranslateY > panelHeight / 4) {
      // Tạo animation mượt mà từ vị trí hiện tại thay vì gọi closeDrawer()
      unlockBodyScroll()

      // Tính toán vị trí đóng chính xác bằng pixel thay vì calc()
      // 100% = panelHeight, 10vh = window.innerHeight * 0.1
      const closePosition = panelHeight + window.innerHeight * 0.1

      // Animation panel từ vị trí hiện tại xuống vị trí đóng
      const panelAnimation = animate(drawerPanel, {
        translateY: `${closePosition}px`,
        duration: 200,
        ease: 'linear',
      })

      // Animation backdrop fade out
      animate(drawerBackdrop, {
        opacity: 0,
        duration: 250,
        ease: 'inCubic',
        delay: 50,
      })

      // Cleanup callback
      panelAnimation.then(() => {
        drawerContainer.classList.add('pointer-events-none')
        onclose?.()
      })
    } else {
      // Snap back to open position with elastic effect
      animate(drawerPanel, {
        translateY: '0px',
        duration: 400,
        ease: 'outCubic',
      })

      // Restore backdrop opacity
      animate(drawerBackdrop, {
        opacity: settings.mobileSheetBackdropOpacity ? 1 : 0,
        duration: 250,
        ease: 'outCubic',
      })
    }
  }

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
</script>

<!-- Drawer Container -->
<div
  bind:this={drawerContainer}
  class="fixed inset-0 z-[10000] pointer-events-none"
  role="dialog"
  aria-modal="true"
>
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={drawerBackdrop}
    class="drawer-backdrop absolute inset-0 {settings.mobileSheetBackdropOpacity
      ? 'bg-black/40'
      : 'bg-transparent'} opacity-0"
    onclick={closeDrawer}
  ></div>

  <!-- Drawer Panel -->
  <div
    bind:this={drawerPanel}
    class="drawer-panel fixed bottom-0 left-0 right-0 border-t border-surface-2 bg-surface-1 text-black rounded-t-3xl shadow-2xl flex flex-col"
    style="transform: translateY(calc(100% + 10vh)); height: {settings.mobileSheetHeight}svh;"
  >
    <!-- Drawer Header (Drag Handle)       onmousedown={onDragStart}
 -->
    <div
      bind:this={drawerHeader}
      class="p-4 cursor-grab active:cursor-grabbing drag-handle relative"
      ontouchstart={onDragStart}
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
      class=" pb-4 flex-grow overflow-y-auto drawer-content relative"
      onmousedown={onDragStart}
      ontouchstart={onDragStart}
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
            />
          {/if}
          {#if summaryToDisplay || summarization.localSummaryState().error}
            <ActionButtonsMiniFP onActionClick={handleCustomAction} />
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
            <ActionButtonsFP onActionClick={handleCustomAction} />
          </div>
        {/if}
      </div>
    </div>
    <div
      class="absolute bottom-px left-0 right-0 h-15 bg-surface-1 translate-y-15"
    ></div>
  </div>
</div>

<svelte:body
  onmousemove={onDragging}
  onmouseup={onDragEnd}
  ontouchmove={onDragging}
  ontouchend={onDragEnd}
/>

<style>
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
