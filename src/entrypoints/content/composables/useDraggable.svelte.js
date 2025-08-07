// @ts-nocheck
import { FloatingPanelStorageService } from '../services/FloatingPanelStorageService.js'

/**
 * Composable xử lý drag & drop functionality cho FloatingPanel
 * @param {Object} panelElement - Svelte binding element
 */
export function useDraggable(panelElement) {
  let isDragging = $state(false)
  let startX, startY, initialX, initialY

  /**
   * Load position từ localStorage
   */
  function loadPosition() {
    const savedPosition = FloatingPanelStorageService.getPosition()
    if (savedPosition && panelElement) {
      panelElement.style.left = `${savedPosition.x}px`
      panelElement.style.top = `${savedPosition.y}px`
    }
  }

  /**
   * Save position vào localStorage
   */
  function savePosition() {
    if (panelElement) {
      FloatingPanelStorageService.savePosition(
        panelElement.offsetLeft,
        panelElement.offsetTop
      )
    }
  }

  /**
   * Handle mouse down event
   */
  function handleMouseDown(event) {
    isDragging = true
    startX = event.clientX
    startY = event.clientY
    initialX = panelElement.offsetLeft
    initialY = panelElement.offsetTop
    panelElement.style.transition = 'none' // Disable transition during drag
  }

  /**
   * Handle mouse move event
   */
  function handleMouseMove(event) {
    if (!isDragging) return
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    panelElement.style.left = `${initialX + dx}px`
    panelElement.style.top = `${initialY + dy}px`
  }

  /**
   * Handle mouse up event
   */
  function handleMouseUp() {
    isDragging = false
    panelElement.style.transition = '' // Re-enable transition
    savePosition()
  }

  return {
    isDragging: () => isDragging,
    loadPosition,
    savePosition,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}
