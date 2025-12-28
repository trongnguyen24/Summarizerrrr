// Store để quản lý chế độ hiển thị TOC (Archive hoặc Sidebar)
// 'archive' = TOCArchive (floating button style)
// 'sidebar' = TOCSidebar (pinned sidebar style)

let tocMode = $state('sidebar') // Mặc định là sidebar trên desktop

export function getTocMode() {
  return tocMode
}

export function setTocMode(mode) {
  tocMode = mode
}

export function toggleTocMode() {
  tocMode = tocMode === 'sidebar' ? 'archive' : 'sidebar'
}
