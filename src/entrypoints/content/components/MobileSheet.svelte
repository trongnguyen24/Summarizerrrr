<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import MobileSummaryDisplay from '@/components/displays/mobile/MobileSummaryDisplay.svelte'

  // Import composables
  import { useSummarization } from '../composables/useSummarization.svelte.js'
  import { useFloatingPanelState } from '../composables/useFloatingPanelState.svelte.js'

  let { visible, onclose } = $props()

  // Initialize composables
  const summarization = useSummarization()
  const panelState = useFloatingPanelState()

  // Computed properties
  let summaryToDisplay = $derived(summarization.summaryToDisplay())
  // Use the status from the composable directly to avoid state sync issues
  let statusToDisplay = $derived(summarization.statusToDisplay())

  // Animation state
  let touchStartY = 0
  let touchMoveY = 0
  let translateY = $state(0)
  let isDragging = $state(false)
  let animationFrameId = null
  let backdropOpacity = $state(0) // Start hidden
  let hasTransition = $state(true) // Control CSS transition
  let isAnimating = $state(false)
  let shouldRender = $state(false) // Control DOM rendering

  // Sheet element reference for height calculation
  let sheetElement = null

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
    // Cancel any pending animation frame on cleanup
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
    // Restore body scroll if needed
    document.body.style.overflow = ''
  })

  // Handle opening/closing animation
  $effect(() => {
    if (visible && !shouldRender) {
      // Opening animation
      shouldRender = true
      isAnimating = true

      // Start from closed position (use fixed height for initial animation)
      translateY = 400 // Use fixed height initially
      backdropOpacity = 0
      hasTransition = false

      // Wait for DOM to render, then start animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Get actual height if available, otherwise use default
          const actualHeight = sheetElement ? sheetElement.offsetHeight : 400
          translateY = actualHeight

          // Start animation in next frame
          requestAnimationFrame(() => {
            hasTransition = true
            translateY = 0
            backdropOpacity = 1

            // Animation complete after transition duration
            setTimeout(() => {
              isAnimating = false
            }, 400)
          })
        })
      })
    } else if (!visible && shouldRender) {
      // Closing animation
      isAnimating = true
      hasTransition = true

      // Animate to closed position
      translateY = sheetElement ? sheetElement.offsetHeight || 400 : 400
      backdropOpacity = 0

      // Remove from DOM after animation
      setTimeout(() => {
        shouldRender = false
        isAnimating = false
        translateY = 0 // Reset for next opening
      }, 400)
    }
  })

  function handleTouchStart(event) {
    if (event.touches.length === 1) {
      touchStartY = event.touches[0].clientY
      isDragging = true
      hasTransition = false // Disable CSS transition while dragging
      document.body.style.overflow = 'hidden' // Prevent body scroll
    }
  }

  function handleTouchMove(event) {
    if (isDragging && event.touches.length === 1) {
      // Prevent page scroll on mobile
      event.preventDefault()

      touchMoveY = event.touches[0].clientY
      const deltaY = Math.max(0, touchMoveY - touchStartY) // Only allow dragging downwards
      translateY = deltaY

      // Use requestAnimationFrame for smooth updates
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(() => {
          // Calculate backdrop opacity based on drag distance
          if (sheetElement) {
            const sheetHeight = sheetElement.offsetHeight
            const opacity = 1 - (translateY / sheetHeight) * 0.8 // *0.8 to avoid complete transparency too early
            backdropOpacity = Math.max(0.2, opacity) // Minimum opacity 0.2
          }
          animationFrameId = null
        })
      }
    }
  }

  function handleTouchEnd() {
    if (!isDragging) return
    isDragging = false
    document.body.style.overflow = '' // Restore body scroll

    // Cancel any pending animation frame
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    // Re-enable CSS transition for snap animation
    hasTransition = true

    // Smart snap logic: close if dragged more than 1/4 of sheet height
    const threshold = sheetElement ? sheetElement.offsetHeight / 4 : 100

    if (translateY > threshold) {
      // Close the sheet
      onclose?.()
    } else {
      // Snap back to original position
      translateY = 0
      backdropOpacity = 1
    }
  }

  function closeSheet() {
    // Don't close if already animating
    if (isAnimating) return
    onclose?.()
  }

  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      onclose?.()
    }
  }
</script>

{#if shouldRender}
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    class="mobile-sheet-backdrop"
    class:has-transition={hasTransition}
    style="opacity: {backdropOpacity};"
    onclick={closeSheet}
  ></button>
  <div
    bind:this={sheetElement}
    class="mobile-sheet"
    class:has-transition={hasTransition}
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
        <button
          class=" sum:p-2 sum:bg-amber-600"
          onclick={summarization.summarizePageContent}
        >
          Summarize Mobile
        </button>
      </div>
    </div>
    <div class="sheet-content">
      <MobileSummaryDisplay
        summary={summaryToDisplay}
        isLoading={statusToDisplay === 'loading'}
        error={summarization.localSummaryState().error}
      />
      <!-- <SettingsMini /> -->
    </div>
  </div>
{/if}

<style>
  /* Custom transition for smooth animations */
  .mobile-sheet-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10001;
    /* Disable tap highlight on mobile */
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-sheet-backdrop.has-transition {
    transition: opacity 0.4s cubic-bezier(0.32, 0.72, 0, 1);
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
    /* Disable tap highlight on mobile */
    -webkit-tap-highlight-color: transparent;
  }

  .mobile-sheet.has-transition {
    transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
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
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch; /* For momentum-based scrolling on iOS */
  }
</style>
