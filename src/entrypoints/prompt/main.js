import { mount } from 'svelte'
import '../../lib/i18n.js' // Import to initialize svelte-i18n
import App from './App.svelte'
import '../sidepanel/app.css' // Import CSS for prompt entrypoint

const app = mount(App, {
  target: document.getElementById('app'),
})
// Sync i18n locale with settings store

export default app
