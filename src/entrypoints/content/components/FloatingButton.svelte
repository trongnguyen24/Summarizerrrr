<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import { useFloatingButtonDraggable } from '../composables/useFloatingButtonDraggable.svelte.js'

  let { toggle } = $props()
  let buttonElement
  let buttonDraggable = $state()

  onMount(() => {
    if (buttonElement) {
      buttonDraggable = useFloatingButtonDraggable(buttonElement)
      buttonDraggable.initializeDraggable()
      buttonDraggable.loadPosition()

      // Add entrance animation after a short delay
      setTimeout(() => {
        buttonDraggable.animateEntrance()
      }, 100)

      // Handle window resize
      window.addEventListener('resize', buttonDraggable.handleResize)
    }
  })

  onDestroy(() => {
    if (buttonDraggable) {
      window.removeEventListener('resize', buttonDraggable.handleResize)
      buttonDraggable.destroy()
    }
  })

  function handleClick(event) {
    // Prevent click when dragging
    if (buttonDraggable?.isDragging()) {
      event.preventDefault()
      return
    }

    if (toggle) {
      toggle()
    }
  }
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button
  bind:this={buttonElement}
  onclick={handleClick}
  class="floating-button"
  title="Toggle Summarizer"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
  >
    <path
      fill="currentColor"
      d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.5 7.5 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.5 7.5 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.5 7.5 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.5 7.5 0 0 0 4.464-4.464Z"
    />
  </svg>
</button>

<style>
  .floating-button {
    position: absolute;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #1a73e8;
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    transition:
      transform 0.2s ease-in-out,
      box-shadow 0.2s ease-in-out;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  .floating-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .floating-button:active {
    transform: scale(0.95);
  }
</style>
