import './app.css'
import App from './App.svelte'
import { mount } from 'svelte'
import { initializeTheme } from './stores/themeStore.svelte'

const target = document.getElementById('app')
if (!target) {
  throw new Error('Could not find app container')
}

mount(App, { target })

// Khởi tạo theme khi ứng dụng mount
initializeTheme()
