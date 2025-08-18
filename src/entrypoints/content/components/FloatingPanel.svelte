<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'

  // Import composables
  import Icon from '@iconify/svelte'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import SummarizeButton from '@/components/buttons/SummarizeButton.svelte'
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import { useFloatingPanelState } from '../composables/useFloatingPanelState.svelte.js'

  // Import components
  import FloatingPanelContent from '@/components/displays/floating-panel/FloatingPanelContent.svelte'

  // Import CSS injection utility
  import { injectOverlayScrollbarsStyles } from '@/lib/utils/shadowDomStylesInjector.js'

  let { visible, summary, status, onclose, children } = $props()

  let panelElement = $state()
  let isResizing = $state(false)
  let currentWidth = $state(400) // Default width
  let showElement = $state(false) // Internal state để control DOM rendering

  const options = {
    scrollbars: {
      theme: 'os-theme-custom-app',
    },
  }
  let overlayScroll = $state()
  let overlayScrollInitialized = $state(false)

  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  // Initialize OverlayScrollbars với proper timing và CSS injection
  async function initializeOverlayScrollbars() {
    if (!overlayScroll || overlayScrollInitialized || isTouchDevice()) {
      return
    }

    try {
      // Tìm shadow DOM container
      const shadowContainer =
        overlayScroll.closest('.floating-ui-root') ||
        document.querySelector('.floating-ui-root')

      if (shadowContainer) {
        // Inject OverlayScrollbars CSS vào shadow DOM
        const cssInjected = await injectOverlayScrollbarsStyles(shadowContainer)

        if (cssInjected) {
          // Wait một tick để CSS được apply
          setTimeout(() => {
            if (overlayScroll && !overlayScrollInitialized) {
              initialize(overlayScroll)
              overlayScrollInitialized = true
              console.log(
                '[FloatingPanel] OverlayScrollbars initialized successfully'
              )
            }
          }, 0)
        } else {
          console.warn('[FloatingPanel] Failed to inject OverlayScrollbars CSS')
        }
      }
    } catch (error) {
      console.error(
        '[FloatingPanel] Failed to initialize OverlayScrollbars:',
        error
      )
    }
  }

  // Cleanup OverlayScrollbars khi panel đóng
  function cleanupOverlayScrollbars() {
    if (instance && instance()) {
      try {
        instance().destroy()
        overlayScrollInitialized = false
        console.log('[FloatingPanel] OverlayScrollbars destroyed and reset')
      } catch (error) {
        console.warn(
          '[FloatingPanel] Error destroying OverlayScrollbars:',
          error
        )
      }
    } else {
      // Reset state ngay cả khi không có instance
      overlayScrollInitialized = false
    }
  }

  // $effect để handle OverlayScrollbars initialization và cleanup
  $effect(() => {
    if (showElement && overlayScroll && !overlayScrollInitialized) {
      // Initialize khi panel mở
      initializeOverlayScrollbars()
    } else if (!showElement && overlayScrollInitialized) {
      // Cleanup khi panel đóng
      cleanupOverlayScrollbars()
    }
  })

  // Clean up OverlayScrollbars instance khi component unmount
  $effect(() => {
    return () => {
      cleanupOverlayScrollbars()
    }
  })

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

  function handleSummarizeClick() {
    summarization.summarizePageContent()
  }
  const MIN_WIDTH = 340
  const MAX_WIDTH = 800

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
      const data = await browser.storage.local.get('sidePanelWidth')
      const savedWidth = data.sidePanelWidth
      if (savedWidth && savedWidth >= MIN_WIDTH && savedWidth <= MAX_WIDTH) {
        currentWidth = savedWidth
        if (panelElement) {
          panelElement.style.width = `${savedWidth}px`
        }
      }
    } catch (error) {
      console.warn('Failed to load width:', error)
    }
  }

  // Save current width
  async function saveWidth() {
    try {
      await browser.storage.local.set({ sidePanelWidth: currentWidth })
    } catch (error) {
      console.warn('Failed to save width:', error)
    }
  }

  // Resize logic
  function handleResizeStart(event) {
    if (!panelElement) return

    isResizing = true
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e) => {
      if (!isResizing) return
      // Sử dụng visualViewport nếu có (modern browsers),
      // fallback về clientWidth (tất cả browsers)
      const viewportWidth =
        window.visualViewport?.width || document.documentElement.clientWidth
      const newWidth = viewportWidth - e.clientX
      if (newWidth > MIN_WIDTH && newWidth < MAX_WIDTH) {
        currentWidth = newWidth
        panelElement.style.width = newWidth + 'px'
      }
    }

    const handleMouseUp = () => {
      isResizing = false
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      saveWidth()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    event.preventDefault()
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
          panelElement.style.width = `${currentWidth}px`
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
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('summarizeClick', handleSummarizeClick)
    document.body.style.userSelect = ''
  })
</script>

{#if showElement}
  <!-- Sidepanel container -->
  <div
    class="floating-panel"
    bind:this={panelElement}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    style="width: {currentWidth}px"
  >
    <!-- Resize handle -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="resize-handle bg-transparent transition-colors flex justify-center items-center"
      class:resizing={isResizing}
      onmousedown={handleResizeStart}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      title="Drag to resize panel width"
    >
      <span class="w-1.5 h-8 bg-surface-2 border border-border rounded-2xl">
      </span>
    </div>
    <div bind:this={overlayScroll} class="w-full h-full py-8">
      <div class="grid grid-rows-[10px_180px_10px_1fr] relative">
        <div
          class="top-stripes border-t border-b border-border flex justify-center items-center w-full h-full"
        ></div>
        <div class="w-full flex items-center justify-center my-8">
          <button
            class="size-10 absolute cursor-pointer z-10 top-4 text-text-secondary hover:text-text-primary transition-colors right-2 flex justify-center items-center"
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
      <!-- <div class="panel-header">
      <span>Summary</span>
      <div class="header-buttons">
        <button
          onclick={summarization.summarizePageContent}
          disabled={summarization.localSummaryState().isLoading}
          class="summarize-button"
          title="Summarize current page independently"
        >
          {summarization.localSummaryState().isLoading
            ? 'Summarizing...'
            : 'Summarize (FP)'}
        </button>
        <button onclick={requestSummary}>Summarize (Global)</button>
        <button
          onclick={() => onclose?.()}
          class="close-button"
          aria-label="Close">&times;</button
        >
      </div>
    </div> -->

      <FloatingPanelContent
        status={statusToDisplay}
        summary={summaryToDisplay}
        error={summarization.localSummaryState().error}
        contentType={summarization.localSummaryState().contentType}
        chapterSummary={summarization.localSummaryState().chapterSummary}
        isChapterLoading={summarization.localSummaryState().isChapterLoading}
        courseConcepts={summarization.localSummaryState().courseConcepts}
        isCourseConceptsLoading={summarization.localSummaryState()
          .isCourseConceptsLoading}
        activeYouTubeTab={panelState.activeYouTubeTab()}
        activeCourseTab={panelState.activeCourseTab()}
        onSelectYouTubeTab={panelState.setActiveYouTubeTab}
        onSelectCourseTab={panelState.setActiveCourseTab}
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
    right: 0;
    height: 100vh;
    width: 400px;
    background-color: var(--color-surface-1);
    font-size: 16px;
    display: flex;
    flex-direction: column;
    z-index: 2147483647;
    color: var(--color-text-primary);
    border-left: 1px solid var(--color-border);
    border-right: 1px solid var(--color-border);
    transform: translateX(100%);
    transition: transform 0.4s ease-out;
    box-sizing: border-box;
  }

  /* Resize Handle */
  .resize-handle {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;

    width: 0.75em;
    transform: translateX(-50%);

    cursor: col-resize;
    flex-shrink: 0;
    z-index: 10000;
  }

  /* Active state khi đang resize */
  .resize-handle.resizing {
    background-color: oklch(50% 0 0 / 0.125) !important;
  }
</style>
