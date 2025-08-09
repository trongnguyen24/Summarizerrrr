// @ts-nocheck
import { createDraggable, utils } from 'animejs'

/**
 * Composable to handle drag & drop functionality for the FloatingButton.
 * @param {HTMLElement} buttonElement - The button element to make draggable.
 */
export function useFloatingButtonDraggable(buttonElement) {
  let draggableInstance = null

  /**
   * Gets the current window width for dynamic snap points.
   * @returns {number} The current window width in pixels
   */
  function getWindowWidth() {
    return (
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth
    )
  }

  /**
   * Initializes draggable with onResize callback.
   */
  function initializeDraggable() {
    if (!buttonElement) return

    const draggables = createDraggable(buttonElement, {
      container: '.snapedge',
      x: { snap: [0, getWindowWidth()] },
      onGrab: () => {
        buttonElement.style.cursor = 'grabbing'
      },
      onRelease: () => {
        buttonElement.style.cursor = 'pointer'
      },
      onResize: (self) => {},
    })

    if (draggables && draggables.length > 0) {
      draggableInstance = draggables[0]
    }
  }

  /**
   * Cleanup function to prevent memory leaks.
   */
  function destroy() {
    if (draggableInstance) {
      draggableInstance.destroy()
    }
  }

  return {
    initializeDraggable,
    destroy,
  }
}
