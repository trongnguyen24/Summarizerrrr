<script>
  // @ts-nocheck
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
  import { createDraggable, utils } from 'animejs' // Import animejs

  let { toggle, topButton } = $props()
  let buttonElement
  let floatingButtonElement // Thêm biến này để tham chiếu đến nút floating-button
  let draggableInstance = null // Khởi tạo draggableInstance
  let releaseTimeout = null // Để lưu trữ timeout ID

  // Initialize stores
  $effect(() => {
    loadSettings()
    subscribeToSettingsChanges()
    loadThemeSettings()
    subscribeToThemeChanges()
  })

  // Cập nhật vị trí top của floating-button khi settings.floatbutton thay đổi
  // $effect(() => {
  //   settings.floatbutton
  //   draggables.setY(settings.floatbutton)
  // })

  let startX, startY, isDragging

  const DRAG_THRESHOLD = 10 // pixels

  /**
   * Gets the current window width for dynamic snap points.
   * @returns {number} The current window width in pixels
   */
  function getWindowWidth() {
    return document.body.clientWidth
  }

  /**
   * Initializes draggable with onResize callback.
   */
  function initializeDraggable() {
    if (!buttonElement) return

    const draggables = createDraggable(buttonElement, {
      container: '.snapedge',
      x: { snap: [0, getWindowWidth()] },

      cursor: {
        onHover: 'pointer',
        onGrab: 'grabbing',
      },
      onResize: (self) => {},
      onRelease: (self) => {
        // Xóa timeout cũ nếu có
        if (releaseTimeout) {
          clearTimeout(releaseTimeout)
        }
        // Đặt timeout mới để lấy giá trị top sau 500ms
        releaseTimeout = setTimeout(() => {
          if (
            buttonElement.getBoundingClientRect().left >
            getWindowWidth() / 2
          ) {
            updateSettings({ floatButtonLeft: false })
          } else {
            updateSettings({ floatButtonLeft: true })
          }
          const currentTop = buttonElement.getBoundingClientRect().top
          updateSettings({ floatButton: currentTop })

          console.log('Floating button top after 500ms:', currentTop)
        }, 800)
      },
    })
    if (settings.floatButtonLeft === false) {
      draggables.setX(getWindowWidth() - 36)
    }
  }

  /**
   * Cleanup function to prevent memory leaks.
   */
  function destroyDraggable() {
    if (draggableInstance) {
      draggableInstance.destroy()
    }
  }

  $effect(() => {
    if (buttonElement) {
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
        destroyDraggable()
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
  style="top: {topButton}px;"
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
    z-index: 10000000000000000000000000;
    left: 0;
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
    bottom: 0;
    top: 0;
    left: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 100000;
  }

  .floating-button:hover ~ .snapedge {
    pointer-events: visible;
  }
</style>
