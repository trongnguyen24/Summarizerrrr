import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'
import '../../lib/i18n.js' // Import to ensure i18n is initialized early

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
