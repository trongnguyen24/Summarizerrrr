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

  // Reactive state để quản lý button position - khởi tạo dựa trên settings để tránh nhảy khi re-render
  let buttonPosition = $state(
    settings?.floatButtonLeft !== false ? 'left' : 'right'
  )

  const config = {
    friction: 0.93,
    snapThresholdPercent: 0.49,
    snapLerpFactor: 0.13,
    bounceFactor: -0.6,
    dragThreshold: 10, // pixels
  }

  const stateButton = {
    isDragging: false,
    isDragThresholdMet: false,
    startX: 0,
    startY: 0,
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
    stateButton.x = x
    stateButton.y = y
    if (buttonElement) {
      buttonElement.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }
  }

  function animationLoop(timestamp) {
    if (stateButton.isDragging) {
      stateButton.animationFrameId = null
      return
    }

    if (!stateButton.lastTimestamp) stateButton.lastTimestamp = timestamp
    const deltaTime = (timestamp - stateButton.lastTimestamp) / 1000
    stateButton.lastTimestamp = timestamp
    const clampedDeltaTime = Math.min(deltaTime, 0.1)

    let targetSnapX = null
    const isInLeftZone = stateButton.x < metrics.snapThreshold
    const isInRightZone =
      stateButton.x + metrics.draggableWidth >
      metrics.containerWidth - metrics.snapThreshold

    const isAlmostStationaryX = Math.abs(stateButton.velocityX) < 0.5
    if (isInLeftZone && (stateButton.velocityX < 0 || isAlmostStationaryX)) {
      targetSnapX = 0
    } else if (
      isInRightZone &&
      (stateButton.velocityX > 0 || isAlmostStationaryX)
    ) {
      targetSnapX = metrics.containerWidth - metrics.draggableWidth
    }

    const frictionFactor = Math.pow(config.friction, clampedDeltaTime * 60)
    stateButton.velocityY *= frictionFactor

    let newX = stateButton.x
    if (targetSnapX !== null) {
      const dx = targetSnapX - stateButton.x
      const lerpFactor =
        1 - Math.pow(1 - config.snapLerpFactor, clampedDeltaTime * 60)
      newX += dx * lerpFactor
      stateButton.velocityX = 0
    } else {
      newX += stateButton.velocityX * 16.67 * clampedDeltaTime
      stateButton.velocityX *= frictionFactor
    }

    let newY = stateButton.y + stateButton.velocityY * 16.67 * clampedDeltaTime

    if (newX < 0 || newX + metrics.draggableWidth > metrics.containerWidth) {
      if (targetSnapX === null) stateButton.velocityX *= config.bounceFactor
      newX = Math.max(
        0,
        Math.min(newX, metrics.containerWidth - metrics.draggableWidth)
      )
    }
    if (newY < 0 || newY + metrics.draggableHeight > metrics.containerHeight) {
      stateButton.velocityY *= config.bounceFactor
      newY = Math.max(
        0,
        Math.min(newY, metrics.containerHeight - metrics.draggableHeight)
      )
    }

    setPosition(newX, newY)

    const isSettledX =
      targetSnapX !== null
        ? Math.abs(targetSnapX - stateButton.x) < 0.1
        : Math.abs(stateButton.velocityX) < 0.01
    const isSettledY = Math.abs(stateButton.velocityY) < 0.01

    if (isSettledX && isSettledY) {
      const finalX = targetSnapX !== null ? targetSnapX : stateButton.x
      setPosition(finalX, stateButton.y)
      stateButton.animationFrameId = null

      const isLeft = finalX < metrics.snapThreshold
      updateButtonStyle(isLeft)

      // Clear any existing timeout
      if (stateButton.settingsUpdateTimeoutId) {
        clearTimeout(stateButton.settingsUpdateTimeoutId)
      }

      // Delay settings update để đảm bảo button đã ngừng hoàn toàn
      stateButton.settingsUpdateTimeoutId = setTimeout(() => {
        updateSettings({
          floatButton: stateButton.y,
          floatButtonLeft: isLeft,
        })
        stateButton.settingsUpdateTimeoutId = null
      }, 50) // 100ms delay sau khi animation kết thúc
    } else {
      // Dự đoán trước trạng thái cuối ngay khi có targetSnapX
      if (targetSnapX !== null) {
        const predictedIsLeft = targetSnapX < metrics.snapThreshold
        buttonPosition = predictedIsLeft ? 'left' : 'right'
      }
      stateButton.animationFrameId = requestAnimationFrame(animationLoop)
    }
  }

  /**
   * Snaps button to the nearest edge with smooth custom animation
   */

  /**
   * Updates button visual style based on position
   */
  function updateButtonStyle(isLeft) {
    // Chỉ update state khi animation kết thúc hoàn toàn
    buttonPosition = isLeft ? 'left' : 'right'
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

    // Reset drag threshold state
    stateButton.isDragThresholdMet = false

    if (stateButton.animationFrameId) {
      cancelAnimationFrame(stateButton.animationFrameId)
      stateButton.animationFrameId = null
    }

    const pointer = e.type === 'touchstart' ? e.touches[0] : e
    stateButton.startX = pointer.clientX
    stateButton.startY = pointer.clientY
    stateButton.lastPointerX = pointer.clientX
    stateButton.lastPointerY = pointer.clientY
    stateButton.lastTimestamp = performance.now()
    stateButton.velocityX = 0
    stateButton.velocityY = 0

    document.addEventListener('mousemove', handleMove, { passive: false })
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchend', handleEnd)
  }

  /**
   * Unified event handler for move (mousemove/touchmove)
   */
  function handleMove(e) {
    e.preventDefault()

    const pointer = e.type === 'touchmove' ? e.touches[0] : e
    const now = performance.now()
    const deltaTime = (now - stateButton.lastTimestamp) / 1000

    // Kiểm tra drag threshold nếu chưa được kích hoạt
    if (!stateButton.isDragThresholdMet) {
      const distanceFromStart = Math.sqrt(
        Math.pow(pointer.clientX - stateButton.startX, 2) +
          Math.pow(pointer.clientY - stateButton.startY, 2)
      )

      if (distanceFromStart >= config.dragThreshold) {
        // Đã đạt threshold, kích hoạt drag mode
        stateButton.isDragThresholdMet = true
        stateButton.isDragging = true
        if (buttonElement) buttonElement.style.cursor = 'grabbing'
        buttonPosition = 'dragging'
      } else {
        // Chưa đạt threshold, chỉ update pointer position để track movement
        stateButton.lastPointerX = pointer.clientX
        stateButton.lastPointerY = pointer.clientY
        stateButton.lastTimestamp = now
        return
      }
    }

    // Đã trong drag mode, xử lý movement bình thường
    if (!stateButton.isDragging) return

    const dx = pointer.clientX - stateButton.lastPointerX
    const dy = pointer.clientY - stateButton.lastPointerY

    const newX = Math.max(
      0,
      Math.min(
        stateButton.x + dx,
        metrics.containerWidth - metrics.draggableWidth
      )
    )
    const newY = Math.max(
      0,
      Math.min(
        stateButton.y + dy,
        metrics.containerHeight - metrics.draggableHeight
      )
    )
    setPosition(newX, newY)

    if (deltaTime > 0) {
      const scaleFactor = 1 / (deltaTime * 16.67)
      stateButton.velocityX = dx * scaleFactor
      stateButton.velocityY = dy * scaleFactor
    }

    stateButton.lastPointerX = pointer.clientX
    stateButton.lastPointerY = pointer.clientY
    stateButton.lastTimestamp = now
  }

  /**
   * Unified event handler for end (mouseup/touchend)
   */
  function handleEnd(e) {
    const wasDragging =
      stateButton.isDragThresholdMet &&
      (Math.abs(stateButton.velocityX) > 2 ||
        Math.abs(stateButton.velocityY) > 2)

    // Reset drag states
    stateButton.isDragging = false
    stateButton.isDragThresholdMet = false
    if (buttonElement) buttonElement.style.cursor = 'grab'

    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchend', handleEnd)

    if (wasDragging) {
      stateButton.lastTimestamp = performance.now()
      stateButton.animationFrameId = requestAnimationFrame(animationLoop)
    } else {
      // It was a click, not a drag (either no threshold met or low velocity)
      if (toggle) {
        toggle()
      }
      // Snap back if it wasn't a real drag
      stateButton.lastTimestamp = performance.now()
      stateButton.velocityX = 0 // Ensure no sliding after a click
      stateButton.velocityY = 0
      stateButton.animationFrameId = requestAnimationFrame(animationLoop)
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
    if (stateButton.debounceTimeoutId) {
      clearTimeout(stateButton.debounceTimeoutId)
    }

    stateButton.debounceTimeoutId = setTimeout(() => {
      if (buttonElement && settings && snapedge) {
        initializePosition()
      }
      stateButton.debounceTimeoutId = null
    }, 100) // 100ms debounce
  }

  // Handle snapedge resize with ResizeObserver instead of window resize
  $effect(() => {
    if (snapedge) {
      stateButton.resizeObserver = new ResizeObserver((entries) => {
        debouncedResize()
      })

      stateButton.resizeObserver.observe(snapedge)

      return () => {
        if (stateButton.resizeObserver) {
          stateButton.resizeObserver.disconnect()
          stateButton.resizeObserver = null
        }
        if (stateButton.debounceTimeoutId) {
          clearTimeout(stateButton.debounceTimeoutId)
          stateButton.debounceTimeoutId = null
        }
      }
    }
  })

  // Cleanup function
  $effect(() => {
    return () => {
      if (stateButton.animationFrameId) {
        cancelAnimationFrame(stateButton.animationFrameId)
      }
      if (stateButton.settingsUpdateTimeoutId) {
        clearTimeout(stateButton.settingsUpdateTimeoutId)
      }
      if (stateButton.debounceTimeoutId) {
        clearTimeout(stateButton.debounceTimeoutId)
      }
      if (stateButton.resizeObserver) {
        stateButton.resizeObserver.disconnect()
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
  <div
    bind:this={buttonElementBG}
    class=" flex items-center justify-center h-10 w-10 text-gray-500/50 overflow-hidden rounded-4xl ease-out delay-150 duration-500 transition-all"
    class:round-l={buttonPosition === 'left'}
    class:round-r={buttonPosition === 'right'}
  >
    <div class="floating-button-bg">
      <div class="BG-cri border border-slate-500/10">
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
    min-width: 80px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease-in-out;
  }

  .round-l {
    border-radius: 0 50px 50px 0;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .round-r {
    border-radius: 50px 0 0 50px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
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
