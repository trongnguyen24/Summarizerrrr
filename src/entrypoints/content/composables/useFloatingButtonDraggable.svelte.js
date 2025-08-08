// @ts-nocheck
import { animate, createDraggable } from 'animejs'
import { FloatingButtonStorageService } from '../services/FloatingButtonStorageService.js'

/**
 * Composable xử lý drag & drop functionality cho FloatingButton với anime.js
 * @param {HTMLElement} buttonElement - Button element
 */
export function useFloatingButtonDraggable(buttonElement) {
  let isDragging = $state(false)
  let currentSide = $state('right') // 'left' | 'right'
  let draggableInstance = null
  let debugZoneElement = null

  // Constants
  const BUTTON_SIZE = 36
  const SIDE_MARGIN = 36

  /**
   * Initialize draggable với custom drag logic
   */
  function initializeDraggable() {
    if (!buttonElement) return

    // Create and append the debug zone for the snap area
    if (!debugZoneElement) {
      debugZoneElement = document.createElement('div')
      document.body.appendChild(debugZoneElement)
      updateDebugZoneStyle()
    }

    draggableInstance = createDraggable(buttonElement, {
      onGrab: () => {
        isDragging = true
        // Enhanced visual feedback
        buttonElement.style.transform = 'scale(1.1)'
        buttonElement.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
        buttonElement.style.opacity = '0.9'
        buttonElement.style.transition = 'none'
        buttonElement.style.cursor = 'grabbing'
      },
      onRelease: () => {
        isDragging = false
        // Let snapToEdge handle the transition
        snapToEdge()
      },
    })

    return draggableInstance
  }

  /**
   * Snap button to nearest edge based on user-defined snap zone
   */
  function snapToEdge() {
    const currentX = buttonElement.offsetLeft
    const currentY = buttonElement.offsetTop

    const snapZoneLeft = SIDE_MARGIN
    const snapZoneRight = window.innerWidth - SIDE_MARGIN

    let targetX
    let targetSide

    // Decide which side to snap to based on the button's center position
    const buttonCenter = currentX + BUTTON_SIZE / 2
    if (buttonCenter < window.innerWidth / 2) {
      // Snap to the left edge of the snap zone
      targetX = snapZoneLeft
      targetSide = 'left'
    } else {
      // Snap to the right edge of the snap zone
      targetX = snapZoneRight - BUTTON_SIZE
      targetSide = 'right'
    }

    currentSide = targetSide

    // Ensure Y is within the viewport height
    const targetY = Math.max(
      0,
      Math.min(currentY, window.innerHeight - BUTTON_SIZE)
    )

    // Animate with anime.js using smoother easing
    animate({
      targets: buttonElement,
      left: targetX,
      top: targetY,
      duration: 350,
      easing: 'easeOutCubic',
      complete: () => {
        // Reset all visual feedback
        buttonElement.style.transform = 'scale(1)'
        buttonElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
        buttonElement.style.opacity = '1'
        buttonElement.style.cursor = 'pointer'
        buttonElement.style.transition = 'all 0.2s ease-in-out'

        // Save position
        FloatingButtonStorageService.savePosition(targetX, targetY, currentSide)
      },
    })
  }

  /**
   * Load position từ localStorage
   */
  function loadPosition() {
    const savedPosition = FloatingButtonStorageService.getPosition()

    if (savedPosition && buttonElement) {
      // Set position without animation
      buttonElement.style.left = `${savedPosition.x}px`
      buttonElement.style.top = `${savedPosition.y}px`
      currentSide = savedPosition.side || 'right'
    } else {
      // Default position
      setDefaultPosition()
    }
  }

  /**
   * Set default position (bottom right)
   */
  function setDefaultPosition() {
    const defaultX = window.innerWidth - BUTTON_SIZE - SIDE_MARGIN
    const defaultY = window.innerHeight - BUTTON_SIZE - SIDE_MARGIN // Offset from bottom

    if (buttonElement) {
      buttonElement.style.left = `${defaultX}px`
      buttonElement.style.top = `${defaultY}px`
      currentSide = 'right'
      FloatingButtonStorageService.savePosition(defaultX, defaultY, 'right')
    }
  }

  /**
   * Animate entrance effect
   */
  function animateEntrance() {
    if (!buttonElement) return

    const savedPosition = FloatingButtonStorageService.getPosition()
    const side = savedPosition?.side || 'right'

    const defaultX = window.innerWidth - BUTTON_SIZE - SIDE_MARGIN
    const defaultY = window.innerHeight - BUTTON_SIZE - SIDE_MARGIN

    const targetX = savedPosition?.x || defaultX
    const targetY = savedPosition?.y || defaultY

    // Start from outside the screen
    const startX = side === 'left' ? -BUTTON_SIZE : window.innerWidth

    // Set initial position
    buttonElement.style.left = `${startX}px`
    buttonElement.style.top = `${targetY}px`

    // Animate to target position
    animate({
      targets: buttonElement,
      left: targetX,
      duration: 600,
      easing: 'easeOutBack(1.7)',
      delay: 300,
      complete: () => {
        buttonElement.style.left = `${targetX}px`
        buttonElement.style.top = `${targetY}px`
      },
    })
  }

  /**
   * Handle window resize
   */
  function handleResize() {
    if (!buttonElement) return
    updateDebugZoneStyle()
    // Simply snap to the edge again to recalculate position based on new window size
    snapToEdge()
  }

  /**
   * Cleanup function
   */
  function destroy() {
    if (draggableInstance && typeof draggableInstance.revert === 'function') {
      draggableInstance.revert()
    }
    if (debugZoneElement) {
      debugZoneElement.remove()
      debugZoneElement = null
    }
  }

  function updateDebugZoneStyle() {
    if (!debugZoneElement) return
    Object.assign(debugZoneElement.style, {
      position: 'fixed',
      top: '0px',
      left: `${SIDE_MARGIN}px`,
      width: `calc(100vw - ${SIDE_MARGIN * 2}px)`,
      height: '100vh',
      backgroundColor: 'rgba(255, 0, 0, 0.1)',
      zIndex: '9998',
      pointerEvents: 'none',
    })
  }

  return {
    initializeDraggable,
    loadPosition,
    animateEntrance,
    handleResize,
    destroy,
    isDragging: () => isDragging,
    currentSide: () => currentSide,
  }
}
