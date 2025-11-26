<script>
  // @ts-nocheck
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
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import Icon from '@iconify/svelte'
  import { isFirefox } from '@/lib/utils/browserDetection.js'
  import { t } from 'svelte-i18n'

  // @ts-nocheck
  let {
    toggle,
    topButton,
    oneClickHandler,
    buttonState = 'idle',
    onBlacklistRequest,
  } = $props()
  let buttonElement
  let buttonElementBG
  let snapedge
  let dropZoneElement = $state(null)
  let isFirefoxBrowser = $state(false)
  let isHovered = $state(false)
  let isOverDropZone = $state(false)

  // Kiểm tra Firefox khi component mount
  $effect(() => {
    isFirefoxBrowser = isFirefox()
  })

  // Reactive state để quản lý button position - khởi tạo dựa trên settings để tránh nhảy khi re-render
  let buttonPosition = $state(
    settings?.floatButtonLeft !== false ? 'left' : 'right',
  )

  const config = {
    friction: 0.93,
    snapThresholdPercent: 0.49,
    snapLerpFactor: 0.13,
    bounceFactor: -0.6,
    dragThreshold: 10, // pixels
  }

  let isDragging = $state(false)

  const stateButton = {
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
    if (isDragging) {
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
        Math.min(newX, metrics.containerWidth - metrics.draggableWidth),
      )
    }
    if (newY < 0 || newY + metrics.draggableHeight > metrics.containerHeight) {
      stateButton.velocityY *= config.bounceFactor
      newY = Math.max(
        0,
        Math.min(newY, metrics.containerHeight - metrics.draggableHeight),
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
        metrics.containerHeight - metrics.draggableHeight,
      ),
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

  function checkCollision() {
    if (!dropZoneElement || !buttonElement) return false

    const buttonRect = buttonElement.getBoundingClientRect()
    const zoneRect = dropZoneElement.getBoundingClientRect()

    // Simple AABB collision detection
    return !(
      buttonRect.right < zoneRect.left ||
      buttonRect.left > zoneRect.right ||
      buttonRect.bottom < zoneRect.top ||
      buttonRect.top > zoneRect.bottom
    )
  }

  /**
   * Unified event handler for move (mousemove/touchmove)
   */
  function handleMove(e) {
    e.preventDefault()
    isHovered = false
    const pointer = e.type === 'touchmove' ? e.touches[0] : e
    const now = performance.now()
    const deltaTime = (now - stateButton.lastTimestamp) / 1000

    // Kiểm tra drag threshold nếu chưa được kích hoạt
    if (!stateButton.isDragThresholdMet) {
      const distanceFromStart = Math.sqrt(
        Math.pow(pointer.clientX - stateButton.startX, 2) +
          Math.pow(pointer.clientY - stateButton.startY, 2),
      )

      if (distanceFromStart >= config.dragThreshold) {
        // Đã đạt threshold, kích hoạt drag mode
        stateButton.isDragThresholdMet = true
        isDragging = true
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
    if (!isDragging) return

    const dx = pointer.clientX - stateButton.lastPointerX
    const dy = pointer.clientY - stateButton.lastPointerY

    const newX = Math.max(
      0,
      Math.min(
        stateButton.x + dx,
        metrics.containerWidth - metrics.draggableWidth,
      ),
    )
    const newY = Math.max(
      0,
      Math.min(
        stateButton.y + dy,
        metrics.containerHeight - metrics.draggableHeight,
      ),
    )
    setPosition(newX, newY)

    // Check collision with drop zone
    isOverDropZone = checkCollision()

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
  async function handleEnd(e) {
    const wasDragging = stateButton.isDragThresholdMet
    const hasMomentum =
      wasDragging &&
      (Math.abs(stateButton.velocityX) > 2 ||
        Math.abs(stateButton.velocityY) > 2)

    // Check if dropped in zone
    if (isDragging && isOverDropZone) {
      onBlacklistRequest?.()
      // Reset position to nearest edge immediately to avoid it staying in the zone
      const isLeft = stateButton.x < metrics.snapThreshold
      const targetX = isLeft
        ? 0
        : metrics.containerWidth - metrics.draggableWidth
      setPosition(targetX, stateButton.y)
    }

    // Reset drag states
    isDragging = false
    stateButton.isDragThresholdMet = false
    isOverDropZone = false
    if (buttonElement) buttonElement.style.cursor = 'pointer'

    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('mouseup', handleEnd)
    document.removeEventListener('touchend', handleEnd)

    if (wasDragging) {
      // It was a drag operation (moved more than threshold)
      // We do NOT trigger click here.
      stateButton.lastTimestamp = performance.now()

      // If it didn't have momentum, ensure velocity is low/zero so it just snaps
      if (!hasMomentum) {
        stateButton.velocityX = 0
        stateButton.velocityY = 0
      }

      stateButton.animationFrameId = requestAnimationFrame(animationLoop)
    } else {
      // It was a click (no threshold met)
      if (oneClickHandler) {
        // Handle one-click logic first
        try {
          const handled = await oneClickHandler()
          // If not handled by one-click, fall back to normal toggle
          if (!handled && toggle) {
            toggle()
          }
        } catch (error) {
          console.error('[FloatingButton] Error in oneClickHandler:', error)
          // Fall back to normal toggle on error
          if (toggle) {
            toggle()
          }
        }
      } else if (toggle) {
        toggle()
      }
      // Snap back if it wasn't a real drag (just in case)
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
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={buttonElement}
  class="floating-button-container"
  style="left: 0; top: 0;"
  onmousedown={handleStart}
  use:nonPassiveTouch={handleStart}
  onmouseenter={() => (isHovered = true)}
  onmouseleave={() => (isHovered = false)}
>
  <!-- Tooltip -->
  <!-- {#if isHovered && !isDragging}
    <div
      class="absolute top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-surface-1 text-text-primary text-xs font-medium shadow-lg border border-border z-50 pointer-events-none"
      class:right-full={buttonPosition === 'right'}
      class:mr-3={buttonPosition === 'right'}
      class:left-full={buttonPosition === 'left'}
      class:ml-3={buttonPosition === 'left'}
      transition:slideScaleFade={{
        duration: 200,
        startScale: 0.9,
        slideDistance: '5px',
      }}
    >
      {settings.oneClickSummarize ? 'Bắt đầu tóm tắt' : 'Summarizerrrr'}
    </div>
  {/if} -->

  <!-- Close Button -->
  {#if isHovered && !isDragging}
    <button
      class="absolute left-1/2 -translate-x-1/2 -bottom-10 size-6 flex items-center justify-center rounded-full bg-gray-400/50 backdrop-blur-md text-gray-500 hover:text-white hover:bg-red-500 hover:scale-110 transition-all z-50"
      onmousedown={(e) => e.stopPropagation()}
      onclick={(e) => {
        e.stopPropagation()
        onBlacklistRequest?.()
      }}
      transition:slideScaleFade={{
        duration: 300,
        startScale: 0.8,
        slideDistance: '0px',
        slideFrom: 'top',
      }}
      title={$t('fab.hide_on_site')}
    >
      <Icon icon="heroicons:x-mark-16-solid" width="16" height="16" />
    </button>
  {/if}

  <div class="floating-button group">
    {#if !isDragging}
      <div
        class="absolute group-hover:block hidden cursor-default left-1/2 -translate-x-1/2 w-10 h-28"
        onmousedown={(e) => e.stopPropagation()}
        ontouchstart={(e) => e.stopPropagation()}
        onclick={(e) => e.stopPropagation()}
        role="none"
      ></div>
    {/if}

    <div
      bind:this={buttonElementBG}
      class=" flex items-center justify-center h-10 w-10 text-gray-500/50 overflow-hidden rounded-4xl ease-out delay-150 duration-500 transition-all"
      class:round-l={buttonPosition === 'left'}
      class:round-r={buttonPosition === 'right'}
      class:error={buttonState === 'error'}
    >
      <div class="floating-button-bg">
        <div class="BG-cri border border-slate-500/20">
          {#if buttonState === 'loading'}
            <span
              transition:slideScaleFade={{
                duration: 300,
                delay: 0,
                slideFrom: 'left',
                slideDistance: '0',
                startScale: 0.8,
              }}
              class="blinking-cursor text-gray-400/70 absolute inset-0"
              class:firefox={isFirefoxBrowser}
            >
            </span>
          {:else}
            <!-- Normal icon -->
            <span
              class=" size-9 flex justify-center items-center"
              transition:slideScaleFade={{
                duration: 400,
                delay: 0,
                slideFrom: 'left',
                slideDistance: '0',
                startScale: 0.8,
              }}
            >
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
            </span>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

{#if isDragging}
  <div
    bind:this={dropZoneElement}
    class="fixed left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 px-8 py-5 rounded-full bg-red-500/80 text-white shadow-lg backdrop-blur-sm transition-all duration-200 z-[2147483646]"
    class:scale-125={isOverDropZone}
    class:bg-red-600={isOverDropZone}
    style="bottom: 10svh;"
    transition:slideScaleFade={{
      duration: 300,
      startScale: 0.8,
      slideFrom: 'bottom',
      slideDistance: '20px',
    }}
  >
    <Icon icon="heroicons:x-mark-20-solid" width="20" height="20" />
    <span class="font-medium text-sm">{$t('settings.fab.drop_to_hide')}</span>
  </div>
{/if}

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

  .floating-button-container:hover ~ .snapedge {
    pointer-events: visible;
  }

  .floating-button-container {
    position: fixed;
    z-index: 2147483647;
    touch-action: none;
    will-change: transform;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    width: 40px;
    height: 40px;
  }

  .floating-button-container:active {
    cursor: grabbing;
  }

  .floating-button {
    position: absolute;
    inset: 0;
    background: none !important;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: none !important;
    display: flex;
    padding: 0 !important;
    align-items: center;
    justify-content: center;
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
    position: relative;
    transition: all 0.3s ease-in-out;
  }

  .floating-button-bg:hover .BG-cri {
    background: #25345c;
  }

  /* Error state */
  .error .floating-button-bg {
    background: #ef4444 !important;
    animation: errorFlash 1.5s ease-in-out;
  }

  .error .floating-button-bg:hover {
    background: #dc2626 !important;
  }

  @keyframes errorFlash {
    0%,
    100% {
      background: #ef4444;
    }
    50% {
      background: #dc2626;
    }
  }

  /* CSS để tạo con trỏ nhấp nháy được tối ưu */
  .blinking-cursor::after {
    content: '✢';
    display: flex;
    margin: auto;
    font-size: var(--text-xl);
    text-align: center !important;
    /* Sử dụng transform thay vì thay đổi content để tối ưu hiệu năng */
    animation: cyberpunk-blink 1.6s linear infinite;
    /* GPU acceleration */
    will-change: transform;
    /* Đảm bảo con trỏ luôn ở cuối */
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translateX(-50%) translateY(-50%) translateZ(0);
  }

  /* Firefox-specific adjustment for better cursor positioning */
  .blinking-cursor.firefox::after {
    transform: translateX(-50%) translateY(-55%) translateZ(0);
  }

  /* Optimized keyframes - giảm số frame để tối ưu hiệu năng */
  @keyframes cyberpunk-blink {
    0%,
    10% {
      content: '×';
    }
    15% {
      content: '✢';
    }
    25% {
      content: '✣';
    }
    35% {
      content: '✥';
    }
    45% {
      content: '✶';
    }
    55% {
      content: '❉';
    }
    65% {
      content: '❆';
    }
    75% {
      content: '✺';
    }
    85% {
      content: '❃';
    }
    95%,
    100% {
      content: '✽';
    }
  }
</style>
