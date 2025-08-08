// @ts-nocheck
/**
 * Service to manage extension storage for the FloatingPanel.
 * Uses `browser.storage.local` for cross-tab synchronization.
 */
export class FloatingPanelStorageService {
  static POSITION_KEY = 'floatingPanelPosition'

  /**
   * Saves the panel's position.
   * @param {number} x
   * @param {number} y
   * @returns {Promise<void>}
   */
  static async savePosition(x, y) {
    const position = { x, y }
    await browser.storage.local.set({ [this.POSITION_KEY]: position })
  }

  /**
   * Retrieves the saved position.
   * @returns {Promise<{x: number, y: number} | null>}
   */
  static async getPosition() {
    try {
      const data = await browser.storage.local.get(this.POSITION_KEY)
      return data[this.POSITION_KEY] || null
    } catch (error) {
      console.warn(
        '[FloatingPanelStorageService] Failed to get position:',
        error
      )
      return null
    }
  }

  /**
   * Clears the saved position.
   * @returns {Promise<void>}
   */
  static async clearPosition() {
    try {
      await browser.storage.local.remove(this.POSITION_KEY)
    } catch (error) {
      console.warn(
        '[FloatingPanelStorageService] Failed to clear position:',
        error
      )
    }
  }
}
