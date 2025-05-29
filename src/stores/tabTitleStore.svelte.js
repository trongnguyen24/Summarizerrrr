let _tabTitle = $state('') // Biến nội bộ, không export let

export function getTabTitle() {
  return _tabTitle
}

export function setTabTitle(newTitle) {
  _tabTitle = newTitle // Cập nhật biến nội bộ
}
