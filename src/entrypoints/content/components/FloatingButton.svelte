<script>
  // @ts-nocheck
  import { useFloatingButtonDraggable } from '../composables/useFloatingButtonDraggable.svelte.js'
  import Logdev from '@/components/settings/Logdev.svelte'
  import {
    settings,
    loadSettings,
    updateSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import {
    loadThemeSettings,
    subscribeToThemeChanges,
  } from '@/stores/themeStore.svelte.js'

  let { toggle } = $props()
  let buttonElement

  // Initialize stores
  $effect(() => {
    loadSettings()
    subscribeToSettingsChanges()
    loadThemeSettings()
    subscribeToThemeChanges()
  })

  let startX, startY, isDragging

  const DRAG_THRESHOLD = 10 // pixels

  $effect(() => {
    if (buttonElement) {
      const { initializeDraggable, destroy } =
        useFloatingButtonDraggable(buttonElement)
      initializeDraggable()

      function handleStart(e) {
        // e.preventDefault() // Let's not prevent default on start, might interfere with other things
        isDragging = false
        const touch = e.type === 'touchstart' ? e.touches[0] : e
        startX = touch.clientX
        startY = touch.clientY
        window.addEventListener('mousemove', handleMove, { passive: false })
        window.addEventListener('touchmove', handleMove, { passive: false })
        window.addEventListener('mouseup', handleEnd)
        window.addEventListener('touchend', handleEnd)
      }

      function handleMove(e) {
        // e.preventDefault() // Prevent scroll while dragging
        const touch = e.type === 'touchmove' ? e.touches[0] : e
        const deltaX = Math.abs(touch.clientX - startX)
        const deltaY = Math.abs(touch.clientY - startY)
        if (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD) {
          isDragging = true
        }
      }

      function handleEnd(e) {
        // This is the key fix: prevent the browser from firing a "ghost" click event
        // after a touchend event.
        if (e.type === 'touchend') {
          e.preventDefault()
        }

        if (!isDragging) {
          toggle?.()
        }

        // Cleanup listeners
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchend', handleEnd)
      }

      buttonElement.addEventListener('mousedown', handleStart)
      buttonElement.addEventListener('touchstart', handleStart, {
        passive: true,
      })

      return () => {
        destroy()
        buttonElement.removeEventListener('mousedown', handleStart)
        buttonElement.removeEventListener('touchstart', handleStart)
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('touchmove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchend', handleEnd)
      }
    }
  })

  let settingsLog = $state('')

  $effect(() => {
    // Đảm bảo cả settings và themeSettings.theme đều được truy cập để $effect phản ứng
    settingsLog = JSON.stringify(settings, null, 2)
    // Truy cập themeSettings.theme để $effect theo dõi sự thay đổi của nó
  })
</script>

<!-- <Logdev></Logdev> -->

<details
  class=" fixed z-[99999999] text-text-secondary border border-border bg-surface-2/80 backdrop-blur-lg top-0 left-0"
>
  <summary class="p-1">Log</summary>
  <pre
    class=" border-t w-2xl pt-4 border-border px-4 wrap-normal overflow-hidden">
Settings: {settingsLog}
  </pre>
</details>
<!-- svelte-ignore a11y_consider_explicit_label -->
<button
  bind:this={buttonElement}
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

<div class="snapedge"></div>

<style>
  .floating-button {
    position: fixed;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #1a73e8;
    color: white;
    border: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000000;
    top: 300px;
    left: 100%;
  }

  .floating-button:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .floating-button:active {
    transform: scale(0.95);
  }
  .snapedge {
    position: fixed;
    right: 0;
    bottom: 2rem;
    top: 6rem;
    left: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 100000;
  }

  .floating-button:hover ~ .snapedge {
    pointer-events: visible;
  }
</style>
