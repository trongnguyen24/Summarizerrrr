<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import YouTubeSummaryDisplayFP from '@/components/displays/YouTubeSummaryDisplayFP.svelte'
  import CourseSummaryDisplayFP from '@/components/displays/CourseSummaryDisplayFP.svelte'
  import GenericSummaryDisplayFP from '@/components/displays/GenericSummaryDisplayFP.svelte'
  import SettingsMini from './SettingsMini.svelte'

  // Import composables
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import { useFloatingPanelState } from '../composables/useFloatingPanelState.svelte.js'

  let { visible, onclose } = $props()

  // Initialize composables
  const summarization = useSummarization()
  const panelState = useFloatingPanelState()

  // Computed properties
  let summaryToDisplay = $derived(summarization.summaryToDisplay())
  let statusToDisplay = $derived(
    summarization.localSummaryState().isLoading
      ? 'loading'
      : summarization.localSummaryState().error
        ? 'error'
        : 'idle'
  )

  let touchStartY = 0
  let touchMoveY = 0
  let translateY = $state(0)
  let isDragging = $state(false)

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  function handleTouchStart(event) {
    if (event.touches.length === 1) {
      touchStartY = event.touches[0].clientY
      isDragging = true
      document.body.style.overflow = 'hidden' // Prevent body scroll
    }
  }

  function handleTouchMove(event) {
    if (isDragging && event.touches.length === 1) {
      touchMoveY = event.touches[0].clientY
      translateY = Math.max(0, touchMoveY - touchStartY) // Only allow dragging downwards
    }
  }

  function handleTouchEnd() {
    isDragging = false
    document.body.style.overflow = '' // Restore body scroll
    if (translateY > 100) {
      // If dragged more than 100px, close the sheet
      onclose?.()
    }
    translateY = 0 // Reset position
  }

  function closeSheet() {
    onclose?.()
  }

  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      onclose?.()
    }
  }

  /**
   * Chọn display component dựa trên contentType
   */
  function selectDisplay(type) {
    const t = (type || '').toLowerCase()
    if (t === 'youtube') {
      console.log('[MobileSheet] Display selected: YouTubeSummaryDisplayFP')
      return YouTubeSummaryDisplayFP
    }
    if (t === 'course') {
      console.log('[MobileSheet] Display selected: CourseSummaryDisplayFP')
      return CourseSummaryDisplayFP
    }
    console.log(
      '[MobileSheet] Display selected: GenericSummaryDisplayFP (fallback)'
    )
    return GenericSummaryDisplayFP
  }

  // Derived component để render
  let DisplayComponent = $derived(
    selectDisplay(summarization.localSummaryState().contentType || 'general')
  )
</script>

{#if visible}
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button class="mobile-sheet-backdrop" onclick={closeSheet}></button>
  <div
    class="mobile-sheet"
    style="transform: translateY({translateY}px);"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="sheet-header"
      ontouchstart={handleTouchStart}
      ontouchmove={handleTouchMove}
      ontouchend={handleTouchEnd}
    >
      <div class="handle"></div>
      <div class="action-button-container">
        <button onclick={summarization.summarizePageContent}>
          Summarize Mobile
        </button>
      </div>
    </div>
    <div class="sheet-content">
      <div class="prose">
        {#if statusToDisplay === 'loading'}
          <p>Loading... (MobileSheet)</p>
        {:else if statusToDisplay === 'error'}
          <p>
            Error: {summarization.localSummaryState().error?.message ||
              'An error occurred.'}
          </p>
        {:else if summaryToDisplay}
          {#if summarization.localSummaryState().contentType === 'youtube'}
            <DisplayComponent
              summary={summaryToDisplay}
              chapterSummary={summarization.localSummaryState().chapterSummary}
              isLoading={statusToDisplay === 'loading'}
              isChapterLoading={summarization.localSummaryState()
                .isChapterLoading}
              activeYouTubeTab={panelState.activeYouTubeTab()}
              onSelectTab={panelState.setActiveYouTubeTab}
            />
          {:else if summarization.localSummaryState().contentType === 'course'}
            <DisplayComponent
              courseSummary={summaryToDisplay}
              courseConcepts={summarization.localSummaryState().courseConcepts}
              isCourseSummaryLoading={statusToDisplay === 'loading'}
              isCourseConceptsLoading={summarization.localSummaryState()
                .isCourseConceptsLoading}
              activeCourseTab={panelState.activeCourseTab()}
              onSelectTab={panelState.setActiveCourseTab}
            />
          {:else}
            <DisplayComponent
              summary={summaryToDisplay}
              isLoading={statusToDisplay === 'loading'}
              loadingText="Processing summary..."
              targetId="ms-generic-summary"
            />
          {/if}
        {:else}
          <p>No summary available.</p>
        {/if}
      </div>
      <!-- <SettingsMini /> -->
    </div>
  </div>
{/if}

<style>
  .mobile-sheet-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10001;
  }

  .mobile-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: white;
    color: black;
    border-top-left-radius: 16px;
    border-top-right-radius: 16px;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.2);
    z-index: 10002;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    transition: transform 0.3s ease-out;
  }

  .sheet-header {
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    touch-action: none;
    position: relative;
  }

  .handle {
    width: 40px;
    height: 4px;
    background-color: #ccc;
    border-radius: 2px;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
  }

  .action-button-container {
    display: flex;
    align-items: center;
    margin-left: auto;
  }

  .action-button-container button {
    background: #007bff;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    font-weight: 500;
  }

  .action-button-container button:hover {
    background: #0056b3;
  }

  .sheet-content {
    padding: 0 16px 16px;
    overflow-y: auto;
    flex-grow: 1;
  }

  .prose {
    max-width: none;
  }
</style>
