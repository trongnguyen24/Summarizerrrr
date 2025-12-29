// Store để quản lý chế độ hiển thị TOC (Archive hoặc Sidebar)
// 'archive' = TOCArchive (floating button style)
// 'sidebar' = TOCSidebar (pinned sidebar style)

const STORAGE_KEY = 'tocMode'

let tocMode = $state('sidebar') // Mặc định là sidebar trên desktop

// Khởi tạo: load giá trị từ storage
async function initTocMode() {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY)
    if (result[STORAGE_KEY]) {
      tocMode = result[STORAGE_KEY]
    }
  } catch (error) {
    console.warn('Failed to load tocMode from storage:', error)
  }
}

// Gọi hàm khởi tạo
initTocMode()

export function getTocMode() {
  return tocMode
}

export function setTocMode(mode) {
  tocMode = mode
  // Lưu vào storage
  browser.storage.local.set({ [STORAGE_KEY]: mode }).catch((error) => {
    console.warn('Failed to save tocMode to storage:', error)
  })
}

export function toggleTocMode() {
  const newMode = tocMode === 'sidebar' ? 'archive' : 'sidebar'
  setTocMode(newMode) // Sử dụng setTocMode để tự động lưu
}
