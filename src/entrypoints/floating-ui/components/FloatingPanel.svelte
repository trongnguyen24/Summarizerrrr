<script>
  // @ts-nocheck
  import { createEventDispatcher, onMount, onDestroy } from 'svelte'
  export let visible = false
  export let summary = ''
  export let status = 'idle'

  const dispatch = createEventDispatcher()

  let panelElement
  let isDragging = false
  let startX, startY, initialX, initialY

  // Load position from local storage
  onMount(() => {
    const savedPosition = localStorage.getItem('floatingPanelPosition')
    if (savedPosition) {
      const { x, y } = JSON.parse(savedPosition)
      if (panelElement) {
        panelElement.style.left = `${x}px`
        panelElement.style.top = `${y}px`
      }
    }

    // Add keyboard escape listener
    window.addEventListener('keydown', handleKeyDown)
  })

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  function handleMouseDown(event) {
    isDragging = true
    startX = event.clientX
    startY = event.clientY
    initialX = panelElement.offsetLeft
    initialY = panelElement.offsetTop
    panelElement.style.transition = 'none' // Disable transition during drag
  }

  function handleMouseMove(event) {
    if (!isDragging) return
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    panelElement.style.left = `${initialX + dx}px`
    panelElement.style.top = `${initialY + dy}px`
  }

  function handleMouseUp() {
    isDragging = false
    panelElement.style.transition = '' // Re-enable transition
    // Save position to local storage
    if (panelElement) {
      const position = { x: panelElement.offsetLeft, y: panelElement.offsetTop }
      localStorage.setItem('floatingPanelPosition', JSON.stringify(position))
    }
  }

  function handleKeyDown(event) {
    if (visible && event.key === 'Escape') {
      dispatch('close')
    }
  }
</script>

{#if visible}
  <div
    class="floating-panel"
    bind:this={panelElement}
    on:mousedown={handleMouseDown}
    on:mousemove={handleMouseMove}
    on:mouseup={handleMouseUp}
    on:mouseleave={handleMouseUp}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="panel-header">
      <span>Summary</span>
      <slot name="action-button"></slot>
      <button
        on:click={() => dispatch('close')}
        class="close-button"
        aria-label="Close">&times;</button
      >
    </div>
    <div class="panel-content">
      {#if status === 'loading'}
        <p>Loading...</p>
      {:else if status === 'error'}
        <p>An error occurred.</p>
      {:else if summary}
        <div>{@html summary}</div>
      {:else}
        <p>No summary available.</p>
      {/if}
    </div>
    <slot name="settings-mini"></slot>
  </div>
{/if}

<style>
  .floating-panel {
    position: fixed;
    /* Default position if not saved */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);

    width: 360px;
    height: 500px;
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    display: flex;
    flex-direction: column;
    z-index: 9999;
    color: black;
    border: 1px solid #ddd;
    /* Allow dragging only on header, not whole panel */
    cursor: default;
  }
  .panel-header {
    padding: 12px 16px;
    border-bottom: 1px solid #eee;
    cursor: grab; /* Make header draggable */
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #f7f7f7;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
  }
  .panel-header span {
    font-weight: 600;
  }
  .close-button {
    border: none;
    background: none;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    line-height: 1;
  }
  .panel-content {
    padding: 16px;
    overflow-y: auto;
    flex-grow: 1;
  }
</style>
