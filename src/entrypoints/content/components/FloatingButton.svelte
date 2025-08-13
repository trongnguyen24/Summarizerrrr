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

  // @ts-nocheck
  let { toggle, topButton } = $props()
  let buttonElement
  let buttonElementBG
  let snapedge

  const config = {
    friction: 0.95,
    snapThresholdPercent: 0.49,
    snapLerpFactor: 0.11,
    bounceFactor: -0.6,
  }

  const state = {
    isDragging: false,
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    lastPointerX: 0,
    lastPointerY: 0,
    lastTimestamp: 0,
    animationFrameId: null,
    settingsUpdateTimeoutId: null,
    resizeObserver: null,
    debounceTimeoutId: null,
  }

  const metrics = {
    containerWidth: 0,
    containerHeight: 0,
    draggableWidth: 0,
    draggableHeight: 0,
    snapThreshold: 0,
  }

  $effect(() => {
    loadSettings()
    subscribeToSettingsChanges()
  })

  function updateMetrics() {
    if (!snapedge) return
    metrics.containerWidth = snapedge.clientWidth
    metrics.containerHeight = snapedge.clientHeight
    metrics.draggableWidth = buttonElement.offsetWidth
    metrics.draggableHeight = buttonElement.offsetHeight
    metrics.snapThreshold = metrics.containerWidth * config.snapThresholdPercent
  }

  function setPosition(x, y) {
    state.x = x
    state.y = y
    if (buttonElement) {
      buttonElement.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
  }

  function animationLoop(timestamp) {
    if (state.isDragging) {
      state.animationFrameId = null
      return
    }

    if (!state.lastTimestamp) state.lastTimestamp = timestamp
    const deltaTime = (timestamp - state.lastTimestamp) / 1000
    state.lastTimestamp = timestamp
    const clampedDeltaTime = Math.min(deltaTime, 0.1)

    let targetSnapX = null
    const isInLeftZone = state.x < metrics.snapThreshold
    const isInRightZone =
      state.x + metrics.draggableWidth >
      metrics.containerWidth - metrics.snapThreshold

    const isAlmostStationaryX = Math.abs(state.velocityX) < 0.5
    if (isInLeftZone && (state.velocityX < 0 || isAlmostStationaryX)) {
      targetSnapX = 0
    } else if (isInRightZone && (state.velocityX > 0 || isAlmostStationaryX)) {
      targetSnapX = metrics.containerWidth - metrics.draggableWidth
    }

    const frictionFactor = Math.pow(config.friction, clampedDeltaTime * 60)
    state.velocityY *= frictionFactor

    let newX = state.x
    if (targetSnapX !== null) {
      const dx = targetSnapX - state.x
      const lerpFactor =
        1 - Math.pow(1 - config.snapLerpFactor, clampedDeltaTime * 60)
      newX += dx * lerpFactor
      state.velocityX = 0
    } else {
      newX += state.velocityX * 16.67 * clampedDeltaTime
      state.velocityX *= frictionFactor
    }

    let newY = state.y + state.velocityY * 16.67 * clampedDeltaTime

    if (newX < 0 || newX + metrics.draggableWidth > metrics.containerWidth) {
      if (targetSnapX === null) state.velocityX *= config.bounceFactor
      newX = Math.max(
        0,
        Math.min(newX, metrics.containerWidth - metrics.draggableWidth)
      )
    }
    if (newY < 0 || newY + metrics.draggableHeight > metrics.containerHeight) {
      state.velocityY *= config.bounceFactor
      newY = Math.max(
        0,
        Math.min(newY, metrics.containerHeight - metrics.draggableHeight)
      )
    }

    setPosition(newX, newY)

    const isSettledX =
      targetSnapX !== null
        ? Math.abs(targetSnapX - state.x) < 0.1
        : Math.abs(state.velocityX) < 0.01
    const isSettledY = Math.abs(state.velocityY) < 0.01

    if (isSettledX && isSettledY) {
      const finalX = targetSnapX !== null ? targetSnapX : state.x
      setPosition(finalX, state.y)
      state.animationFrameId = null

      const isLeft = finalX < metrics.snapThreshold
      updateButtonStyle(isLeft)

      // Clear any existing timeout
      if (state.settingsUpdateTimeoutId) {
        clearTimeout(state.settingsUpdateTimeoutId)
      }

      // Delay settings update để đảm bảo button đã ngừng hoàn toàn
      state.settingsUpdateTimeoutId = setTimeout(() => {
        updateSettings({
          floatButton: state.y,
          floatButtonLeft: isLeft,
        })
        state.settingsUpdateTimeoutId = null
      }, 50) // 100ms delay sau khi animation kết thúc
    } else {
      state.animationFrameId = requestAnimationFrame(animationLoop)
    }
  }

  /**
   * Snaps button to the nearest edge with smooth custom animation
   */

  /**
   * Updates button visual style based on position
   */
  function updateButtonStyle(isLeft) {
    if (!buttonElementBG) return

    if (isLeft) {
      buttonElementBG.classList.remove('round-r')
      buttonElementBG.classList.add('round-l')
    } else {
      buttonElementBG.classList.remove('round-l')
      buttonElementBG.classList.add('round-r')
    }
  }

  /**
   * Initializes button position from settings
   */
  function initializePosition() {
    if (!buttonElement || !settings || !snapedge) return

    updateMetrics()

    const isLeft = settings.floatButtonLeft !== false
    const initialX = isLeft
      ? 0
      : metrics.containerWidth - metrics.draggableWidth
    const initialY = Math.max(
      0,
      Math.min(
        settings.floatButton || topButton || 100,
        metrics.containerHeight - metrics.draggableHeight
      )
    )

    setPosition(initialX, initialY)
    updateButtonStyle(isLeft)
  }

  /**
   * Unified event handler for start (mousedown/touchstart)
   */
  function handleStart(e) {
    e.preventDefault()
    state.isDragging = true
    if (buttonElement) buttonElement.style.cursor = 'grabbing'
    if (state.animationFrameId) {
      cancelAnimationFrame(state.animationFrameId)
      state.animationFrameId = null
    }

    if (buttonElementBG) {
      buttonElementBG.classList.remove('round-l', 'round-r')
    }

    const pointer = e.type === 'touchstart' ? e.touches[0] : e
    state.lastPointerX = pointer.clientX
    state.lastPointerY = pointer.clientY
    state.lastTimestamp = performance.now()
    state.velocityX = 0
    state.velocityY = 0

    document.addEventListener('mousemove', handleMove, { passive: false })
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchend', handleEnd)
  }

  /**
   * Unified event handler for move (mousemove/touchmove)
   */
  function handleMove(e) {
    if (!state.isDragging) return
    e.preventDefault()

    const pointer = e.type === 'touchmove' ? e.touches[0] : e
    const now = performance.now()
    const deltaTime = (now - state.lastTimestamp) / 1000

    const dx = pointer.clientX - state.lastPointerX
    const dy = pointer.clientY - state.lastPointerY

    const newX = Math.max(
      0,
      Math.min(state.x + dx, metrics.containerWidth - metrics.draggableWidth)
    )
    const newY = Math.max(
      0,
      Math.min(state.y + dy, metrics.containerHeight - metrics.draggableHeight)
    )
    setPosition(newX, newY)

    if (deltaTime > 0) {
      const scaleFactor = 1 / (deltaTime * 16.67)
      state.velocityX = dx * scaleFactor
      state.velocityY = dy * scaleFactor
    }

    state.lastPointerX = pointer.clientX
    state.lastPointerY = pointer.clientY
    state.lastTimestamp = now
  }

  /**
   * Unified event handler for end (mouseup/touchend)
   */
  function handleEnd(e) {
    if (!state.isDragging) return

    const wasDragging =
      Math.abs(state.velocityX) > 2 || Math.abs(state.velocityY) > 2

    state.isDragging = false
    if (buttonElement) buttonElement.style.cursor = 'grab'

    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchend', handleEnd)

    if (wasDragging) {
      state.lastTimestamp = performance.now()
      state.animationFrameId = requestAnimationFrame(animationLoop)
    } else {
      // It was a click, not a drag
      if (toggle) {
        toggle()
      }
      // Snap back if it wasn't a real drag
      state.lastTimestamp = performance.now()
      state.velocityX = 0 // Ensure no sliding after a click
      state.velocityY = 0
      state.animationFrameId = requestAnimationFrame(animationLoop)
    }
  }

  function nonPassiveTouch(node, handler) {
    const options = { passive: false }
    node.addEventListener('touchstart', handler, options)

    return {
      destroy() {
        node.removeEventListener('touchstart', handler, options)
      },
    }
  }

  // Initialize position when component mounts and settings are loaded
  $effect(() => {
    if (buttonElement && settings && snapedge) {
      initializePosition()
    }
  })

  // Debounced resize function
  function debouncedResize() {
    if (state.debounceTimeoutId) {
      clearTimeout(state.debounceTimeoutId)
    }

    state.debounceTimeoutId = setTimeout(() => {
      if (buttonElement && settings && snapedge) {
        initializePosition()
      }
      state.debounceTimeoutId = null
    }, 100) // 100ms debounce
  }

  // Handle snapedge resize with ResizeObserver instead of window resize
  $effect(() => {
    if (snapedge) {
      state.resizeObserver = new ResizeObserver((entries) => {
        debouncedResize()
      })

      state.resizeObserver.observe(snapedge)

      return () => {
        if (state.resizeObserver) {
          state.resizeObserver.disconnect()
          state.resizeObserver = null
        }
        if (state.debounceTimeoutId) {
          clearTimeout(state.debounceTimeoutId)
          state.debounceTimeoutId = null
        }
      }
    }
  })

  // Cleanup function
  $effect(() => {
    return () => {
      if (state.animationFrameId) {
        cancelAnimationFrame(state.animationFrameId)
      }
      if (state.settingsUpdateTimeoutId) {
        clearTimeout(state.settingsUpdateTimeoutId)
      }
      if (state.debounceTimeoutId) {
        clearTimeout(state.debounceTimeoutId)
      }
      if (state.resizeObserver) {
        state.resizeObserver.disconnect()
      }
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchend', handleEnd)
    }
  })
</script>

<!-- svelte-ignore a11y_consider_explicit_label -->
<button
  bind:this={buttonElement}
  class="floating-button"
  title="Toggle Summarizer"
  style="left: 0; top: 0;"
  onmousedown={handleStart}
  use:nonPassiveTouch={handleStart}
>
  <div bind:this={buttonElementBG} class="floating-button-bg round-l round-r">
    <div class="BG-cri">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 16 16"
      >
        <path
          fill="currentColor"
          d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.5 7.5 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.5 7.5 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.5 7.5 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.5 7.5 0 0 0 4.464-4.464Z"
        />
      </svg>
    </div>
  </div>
</button>

<div bind:this={snapedge} class="snapedge"></div>

<style>
  .snapedge {
    position: fixed;
    right: 0;
    left: 0;
    top: 0;
    height: 100svh;
    overflow: hidden;
    pointer-events: none;
    z-index: 100000;
  }

  .floating-button:hover ~ .snapedge {
    pointer-events: visible;
  }
  .floating-button {
    position: fixed;
    background: none !important;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none !important;
    display: flex;
    padding: 0 !important;
    align-items: center;
    justify-content: center;
    z-index: 10000000000000000000000000;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    will-change: transform;
  }

  .floating-button:active {
    cursor: grabbing;
  }

  .floating-button-bg {
    border-radius: 50px;
    background: #94a3c53c;
    width: 40px;
    height: 40px;
    color: rgb(167, 167, 167);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease-in-out;
  }

  .round-l {
    border-radius: 0 50px 50px 0 !important;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .round-r {
    border-radius: 50px 0 0 50px !important;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .floating-button-bg:hover {
    background: #ff8711;
    color: rgb(119, 196, 255);
  }

  .BG-cri {
    background: #00000000;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease-in-out;
  }

  .floating-button-bg:hover .BG-cri {
    background: #25345c;
  }
</style>
