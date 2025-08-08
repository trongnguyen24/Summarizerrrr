// @ts-nocheck
import { createDraggable } from 'animejs'

/**
 * Composable to handle drag & drop functionality for the FloatingButton.
 * @param {HTMLElement} buttonElement - The button element to make draggable.
 */
export function useFloatingButtonDraggable(buttonElement) {
  let draggableInstance = null

  /**
   * Destroys and recreates the draggable instance to update its bounds.
   * This is necessary when the window is resized.
   */
  function update() {
    if (draggableInstance) {
      draggableInstance.destroy()
    }
    const draggables = createDraggable(buttonElement, {
      container: '.snapedge',
      onGrab: () => {
        buttonElement.style.cursor = 'grabbing'
      },
      onRelease: () => {
        buttonElement.style.cursor = 'pointer'
      },
    })
    if (draggables && draggables.length > 0) {
      draggableInstance = draggables[0]
    }
  }

  /**
   * Initializes draggable and sets up listeners.
   */
  function initializeDraggable() {
    if (!buttonElement) return

    update()
    window.addEventListener('resize', update)
  }

  /**
   * Cleanup function to prevent memory leaks.
   */
  function destroy() {
    window.removeEventListener('resize', update)
    if (draggableInstance) {
      draggableInstance.destroy()
    }
  }

  return {
    initializeDraggable,
    destroy,
  }
}
