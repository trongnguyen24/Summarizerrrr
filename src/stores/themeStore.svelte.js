let _theme = $state('dark') // Biến nội bộ, không export let

// Export theme dưới dạng hàm getter
export function getTheme() {
  return _theme
}

// Hàm áp dụng theme vào document.documentElement
function applyThemeToDocument(themeValue) {
  if (themeValue === 'system') {
    localStorage.removeItem('theme')
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  } else {
    localStorage.setItem('theme', themeValue)
    if (themeValue === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  }
  console.log(`Theme set to: ${themeValue}`)
}

// Hàm khởi tạo theme khi ứng dụng load
export function initializeTheme() {
  const storedTheme = localStorage.getItem('theme')
  const initialTheme =
    storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system'

  _theme = initialTheme // Cập nhật _theme
  applyThemeToDocument(_theme) // Gọi hàm áp dụng theme ngay lập tức
}

// Hàm để các component gọi khi muốn thay đổi theme
export function setTheme(themeValue) {
  _theme = themeValue // Cập nhật _theme, $effect sẽ tự động chạy
  applyThemeToDocument(_theme) // Gọi hàm áp dụng theme ngay lập tức
}

// THÊM HÀM NÀY ĐỂ EXPORT LOGIC LẮNG NGHE THAY ĐỔI HỆ THỐNG
export function subscribeToSystemThemeChanges() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const listener = () => {
    if (_theme === 'system') {
      applyThemeToDocument('system')
    }
  }
  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}
