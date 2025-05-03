import { writable } from 'svelte/store'

// Tạo writable store cho theme
export const theme = writable('system')

// Biến cục bộ để lưu giá trị theme hiện tại từ store
let currentThemeValue

// Subscribe vào store để cập nhật biến cục bộ
theme.subscribe((value) => {
  currentThemeValue = value
})

// Hàm áp dụng theme vào document.documentElement
function applyTheme(themeValue) {
  if (themeValue === 'system') {
    localStorage.removeItem('theme')
    // Áp dụng theme hệ thống
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
    }
  } else {
    localStorage.setItem('theme', themeValue)
    // Áp dụng theme light/dark
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
  // Nếu có giá trị hợp lệ ('light' hoặc 'dark'), dùng nó. Nếu không, mặc định là 'system'.
  const initialTheme =
    storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system'

  // Cập nhật store và áp dụng theme
  theme.set(initialTheme)
  applyTheme(initialTheme)
}

// Hàm để các component gọi khi muốn thay đổi theme
export function setTheme(themeValue) {
  theme.set(themeValue)
  applyTheme(themeValue) // Gọi applyTheme trực tiếp khi theme thay đổi
}
