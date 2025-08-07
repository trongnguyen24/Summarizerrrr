<script>
  // @ts-nocheck
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  export let visible = false
  export let summary = ''
  export let status = 'idle'

  const dispatch = createEventDispatcher()

  let touchStartY = 0
  let touchMoveY = 0
  let translateY = 0
  let isDragging = false

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
      dispatch('close')
    }
    translateY = 0 // Reset position
  }

  function closeSheet() {
    dispatch('close')
  }

  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      dispatch('close')
    }
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button class="mobile-sheet-backdrop" onclick={closeSheet}></button>
  <div
    class="mobile-sheet"
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    style="transform: translateY({translateY}px);"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="sheet-header">
      <div class="handle"></div>
      <slot name="action-button"></slot>
    </div>
    <div class="sheet-content">
      {#if status === 'loading'}
        <p>Loading...</p>
      {:else if status === 'error'}
        <p>An error occurred.</p>
      {:else if summary}
        <div>{@html summary}</div>
      {:else}
        <p>No summary available.</p>
      {/if}
      <slot name="settings-mini"></slot>
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
    justify-content: center;
    touch-action: none;
  }

  .handle {
    width: 40px;
    height: 4px;
    background-color: #ccc;
    border-radius: 2px;
  }

  .sheet-content {
    padding: 0 16px 16px;
    overflow-y: auto;
    flex-grow: 1;
  }
</style>
