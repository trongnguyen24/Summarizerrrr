import { mount } from 'svelte'
import App from './App.svelte'
import '../sidepanel/app.css' // Import CSS for prompt entrypoint
import { init, getLocaleFromNavigator } from 'svelte-i18n'
import {
  loadSettings,
  settings,
  subscribeToSettingsChanges,
} from '../../stores/settingsStore.svelte.js'
import '../../lib/i18n.js' // Ensure locales are registered

async function startup() {
  await loadSettings()
  subscribeToSettingsChanges()

  const initialLocale = settings.uiLang || getLocaleFromNavigator()

  await init({
    fallbackLocale: 'en',
    initialLocale,
  })

  const app = mount(App, {
    target: document.getElementById('app'),
  })

  return app
}

export default startup()
