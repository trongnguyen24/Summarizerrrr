<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'

  // Import composables
  import Icon from '@iconify/svelte'
  import SummarizeButton from '@/components/buttons/SummarizeButton.svelte'
  import { useNavigationManager } from '../composables/useNavigationManager.svelte.js'
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import { useFloatingPanelState } from '../composables/useFloatingPanelState.svelte.js'
  import { settings } from '@/stores/settingsStore.svelte.js'

  // Reactive variable for panel position
  let panelPosition = $derived(settings.floatingPanelLeft ? 'left' : 'right')

  // Import components
  import FloatingPanelContent from '@/components/displays/floating-panel/FloatingPanelContent.svelte'

  let { visible, summary, status, onclose, children } = $props()

  let panelElement = $state()
  let isResizing = $state(false)
  let currentWidthPx = $state(emToPx(settings.sidePanelDefaultWidth)) // Default width in px
  let showElement = $state(false) // Internal state để control DOM rendering
  const navigationManager = useNavigationManager()
  let unsubscribeNavigation = null

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
  // Constants in px units
  const MIN_WIDTH_PX = 380 // 380px
  const MAX_WIDTH_PX = 860 // 860px

  // Helper functions to convert between em and px
  function emToPx(em) {
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    return em * rootFontSize
  }

  function pxToEm(px) {
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    return px / rootFontSize
  }

  // Initialize composables
  const summarization = useSummarization()
  const panelState = useFloatingPanelState()

  // Computed properties để determine what to display
  let summaryToDisplay = $derived(summarization.summaryToDisplay() || summary)
  let statusToDisplay = $derived(
    summarization.localSummaryState().isLoading
      ? 'loading'
      : summarization.localSummaryState().error
        ? 'error'
        : status
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
        if (panelElement) {
          panelElement.style.width = `${savedWidthPx}px`
        }
      }
    } catch (error) {
      console.warn('Failed to load width:', error)
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

  // Effect để handle visible state changes với smooth animation
  $effect(() => {
    if (visible) {
      // Show element first, then animate in
      showElement = true
      setTimeout(() => {
        if (panelElement) {
          panelElement.style.width = `${currentWidthPx}px`
          panelElement.classList.add('visible')
        }
      }, 10)
    } else {
      // Animate out first, then hide element
      if (panelElement) {
        panelElement.classList.remove('visible')
        // Wait for animation to complete before hiding DOM
        setTimeout(() => {
          showElement = false
        }, 410) // Match CSS transition duration
      } else {
        showElement = false
      }
    }
  })

  onMount(() => {
    loadWidth()
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('summarizeClick', handleSummarizeClick)

    // Subscribe vào navigation changes
    unsubscribeNavigation = navigationManager.subscribe(handleUrlChange)
  })

  function handleUrlChange(newUrl) {
    // Khi URL thay đổi, reset state của component
    console.log('FloatingPanel: URL changed to', newUrl)
    // Có thể thêm logic để reset state cụ thể ở đây nếu cần
  }

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('summarizeClick', handleSummarizeClick)
    document.body.style.userSelect = ''

    // Cleanup navigation subscription
    if (unsubscribeNavigation) {
      unsubscribeNavigation()
    }
  })
</script>

{#if showElement}
  <!-- Sidepanel container -->
  <div
    class="floating-panel"
    class:left={panelPosition === 'left'}
    class:right={panelPosition === 'right'}
    bind:this={panelElement}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    style="width: {currentWidthPx}px"
  >
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
    <button
      onclick={() => onclose?.()}
      class="close-button absolute text-muted hover:text-text-primary transition-colors duration-200 cursor-pointer z-10 h-8 top-0 right-0 left-0 flex justify-center items-center"
      aria-label="Close"
      ><Icon icon="heroicons:arrow-long-right" width="24" height="24" /></button
    >
    <div class="w-full h-full py-8 overflow-y-auto">
      <div class="grid grid-rows-[10px_180px_10px_1fr] relative">
        <div
          class="top-stripes border-t border-b border-border flex justify-center items-center w-full h-full"
        ></div>
        <div class="w-full flex items-center justify-center my-8">
          <button
            class="size-10 absolute cursor-pointer z-10 top-3 text-text-secondary hover:text-text-primary transition-colors left-2 flex justify-center items-center"
            onclick={openArchive}
            title="Open Archive"
          >
            <Icon icon="solar:history-linear" width="24" height="24" />
          </button>
          <button
            class="size-10 absolute cursor-pointer z-10 top-3 text-text-secondary hover:text-text-primary transition-colors right-2 flex justify-center items-center"
            onclick={openSettings}
          >
            <Icon width={24} icon="heroicons:cog-6-tooth" />
          </button>
          <SummarizeButton
            isLoading={summarization.localSummaryState().isLoading}
            isChapterLoading={summarization.localSummaryState()
              .isChapterLoading}
          />
        </div>
        <div
          class="top-stripes border-t border-b border-border flex justify-center items-center w-full h-full"
        ></div>
      </div>

      <FloatingPanelContent
        status={statusToDisplay}
        summary={summaryToDisplay}
        error={summarization.localSummaryState().error}
        contentType={summarization.localSummaryState().contentType}
        chapterSummary={summarization.localSummaryState().chapterSummary}
        isChapterLoading={summarization.localSummaryState().isChapterLoading}
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

      {#if children?.settingsMini}
        {@render children.settingsMini()}
      {/if}
    </div>
  </div>
{/if}

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
    z-index: 2147483640;
    color: var(--color-text-primary);
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    transition: transform 0.4s ease-out;
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

  .floating-panel.right.visible {
    transform: translateX(0);
  }

  .floating-panel.left.visible {
    transform: translateX(0);
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
</style>
