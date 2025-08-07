// @ts-nocheck
/**
 * Service quản lý localStorage cho FloatingPanel
 */
export class FloatingPanelStorageService {
  static STORAGE_KEY = 'floatingPanelPosition'

  /**
   * Lưu vị trí panel
   * @param {number} x
   * @param {number} y
   */
  static savePosition(x, y) {
    const position = { x, y }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(position))
  }

  /**
   * Lấy vị trí đã lưu
   * @returns {{x: number, y: number} | null}
   */
  static getPosition() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.warn(
        '[FloatingPanelStorageService] Failed to parse position:',
        error
      )
      return null
    }
  }

  /**
   * Xóa vị trí đã lưu
   */
  static clearPosition() {
    localStorage.removeItem(this.STORAGE_KEY)
  }
}
