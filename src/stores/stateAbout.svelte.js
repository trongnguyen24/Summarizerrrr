// @ts-nocheck
// Khởi tạo một trạng thái `isReleaseNoteVisible` với giá trị ban đầu là `false`.
let isReleaseNoteVisible = $state(false)

// Xuất ra một đối tượng để các component khác có thể sử dụng.
// Việc này giúp quản lý code gọn gàng hơn.
export const domVisibility = {
  get value() {
    return isReleaseNoteVisible
  },
  set value(v) {
    isReleaseNoteVisible = v
  },
  toggle: () => {
    isReleaseNoteVisible = !isReleaseNoteVisible
  },

  // Hàm chỉ để bật
  show: () => {
    isReleaseNoteVisible = true
  },

  // Hàm chỉ để tắt
  hide: () => {
    isReleaseNoteVisible = false
  },
}
