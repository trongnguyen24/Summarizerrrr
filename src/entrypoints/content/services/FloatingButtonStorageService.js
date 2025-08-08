// @ts-nocheck
/**
 * Service quản lý localStorage cho FloatingButton
 */
export class FloatingButtonStorageService {
  static POSITION_KEY = 'floatingButtonPosition'
  static SIDE_KEY = 'floatingButtonSide'

  /**
   * Lưu vị trí và cạnh của button
   * @param {number} x
   * @param {number} y
   * @param {'left' | 'right'} side
   */
  static savePosition(x, y, side = 'right') {
    const position = { x, y, side }
    localStorage.setItem(this.POSITION_KEY, JSON.stringify(position))
  }

  /**
   * Lấy vị trí đã lưu
   * @returns {{x: number, y: number, side: 'left' | 'right'} | null}
   */
  static getPosition() {
    try {
      const saved = localStorage.getItem(this.POSITION_KEY)
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.warn(
        '[FloatingButtonStorageService] Failed to parse position:',
        error
      )
      return null
    }
  }

  /**
   * Xóa vị trí đã lưu
   */
  static clearPosition() {
    localStorage.removeItem(this.POSITION_KEY)
  }

  /**
   * Lưu cạnh hiện tại
   * @param {'left' | 'right'} side
   */
  static saveSide(side) {
    localStorage.setItem(this.SIDE_KEY, side)
  }

  /**
   * Lấy cạnh đã lưu
   * @returns {'left' | 'right'}
   */
  static getSide() {
    return localStorage.getItem(this.SIDE_KEY) || 'right'
  }
}
