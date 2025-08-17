<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'

  // Import composables
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import { useFloatingPanelState } from '../composables/useFloatingPanelState.svelte.js'

  // Import components
  import FloatingPanelHeader from '@/components/displays/floating-panel/FloatingPanelHeader.svelte'
  import FloatingPanelContent from '@/components/displays/floating-panel/FloatingPanelContent.svelte'

  let { visible, summary, status, onclose, children } = $props()

  let panelElement = $state()
  let isResizing = $state(false)
  let currentWidth = $state(400) // Default width
  let showElement = $state(false) // Internal state để control DOM rendering

  const MIN_WIDTH = 280
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
      const newWidth = window.innerWidth - e.clientX
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
        }, 300) // Match CSS transition duration
      } else {
        showElement = false
      }
    }
  })

  onMount(() => {
    loadWidth()
    window.addEventListener('keydown', handleKeyDown)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
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
    <div
      class="resize-handle"
      onmousedown={handleResizeStart}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      title="Drag to resize panel width"
    ></div>

    <FloatingPanelHeader
      onSummarize={summarization.summarizePageContent}
      isLoading={summarization.localSummaryState().isLoading}
      onClose={() => onclose?.()}
      {children}
    />

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
{/if}
