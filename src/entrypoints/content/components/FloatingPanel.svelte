<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'

  // Import composables
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import { useFloatingPanelState } from '../composables/useFloatingPanelState.svelte.js'
  import { useDraggable } from '../composables/useDraggable.svelte.js'

  // Import components
  import FloatingPanelHeader from './FloatingPanelHeader.svelte'
  import FloatingPanelContent from './FloatingPanelContent.svelte'

  let { visible, summary, status, onclose, children } = $props()

  let panelElement = $state()

  // Initialize composables
  const summarization = useSummarization()
  const panelState = useFloatingPanelState()
  const draggable = $derived(panelElement ? useDraggable(panelElement) : null)

  // Computed properties để determine what to display
  let summaryToDisplay = $derived(summarization.summaryToDisplay() || summary)
  let statusToDisplay = $derived(
    summarization.localSummaryState().isLoading
      ? 'loading'
      : summarization.localSummaryState().error
        ? 'error'
        : status
  )

  // Load position và setup event listeners
  onMount(() => {
    if (draggable) {
      draggable.loadPosition()
    }

    // Add keyboard escape listener
    window.addEventListener('keydown', handleKeyDown)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      onclose?.()
    }
  }
</script>

{#if visible}
  <div
    class="floating-panel"
    bind:this={panelElement}
    onmousedown={draggable?.handleMouseDown}
    onmousemove={draggable?.handleMouseMove}
    onmouseup={draggable?.handleMouseUp}
    onmouseleave={draggable?.handleMouseUp}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
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
