import { mount } from 'svelte'
import App from './App.svelte'
import '../sidepanel/app.css' // Import CSS for prompt entrypoint

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
