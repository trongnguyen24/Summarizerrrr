// @ts-nocheck
import { FloatingPanelStorageService } from '../services/FloatingPanelStorageService'

/**
 * Composable for making a panel draggable.
 * @param {HTMLElement} panelElement - The panel element to make draggable.
 * @returns {object} - The composable object with methods.
 */
export function useDraggable(panelElement) {
  let isDragging = false
  let offsetX, offsetY

  /**
   * Loads the panel's position from storage and applies it.
   */
  async function loadPosition() {
    const savedPosition = await FloatingPanelStorageService.getPosition()
    if (savedPosition && panelElement) {
      panelElement.style.left = `${savedPosition.x}px`
      panelElement.style.top = `${savedPosition.y}px`
    }
  }

  /**
   * Saves the panel's current position to storage.
   */
  async function savePosition() {
    if (panelElement) {
      await FloatingPanelStorageService.savePosition(
        panelElement.offsetLeft,
        panelElement.offsetTop
      )
    }
  }

  function handleMouseDown(event) {
    if (
      event.target.closest('button, a, input, select, textarea, [data-nodrag]')
    ) {
      return // Don't drag if a button or interactive element was clicked
    }

    isDragging = true
    offsetX = event.clientX - panelElement.offsetLeft
    offsetY = event.clientY - panelElement.offsetTop
    panelElement.style.transition = 'none' // Disable transition during drag
  }

  function handleMouseMove(event) {
    if (!isDragging) return
    let newX = event.clientX - offsetX
    let newY = event.clientY - offsetY

    // Clamp position to be within the viewport
    const maxX = window.innerWidth - panelElement.offsetWidth
    const maxY = window.innerHeight - panelElement.offsetHeight
    newX = Math.max(0, Math.min(newX, maxX))
    newY = Math.max(0, Math.min(newY, maxY))

    panelElement.style.left = `${newX}px`
    panelElement.style.top = `${newY}px`
  }

  function handleMouseUp() {
    isDragging = false
    panelElement.style.transition = '' // Re-enable transition
    savePosition()
  }

  return {
    loadPosition,
    savePosition,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  }
}
