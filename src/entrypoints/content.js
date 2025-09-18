// @ts-nocheck
import { defineContentScript, createShadowRootUi } from '#imports'
import { init, getLocaleFromNavigator } from 'svelte-i18n'
import { loadSettings, settings } from '@/stores/settingsStore.svelte.js'
import { subscribeToLocaleChanges } from '@/stores/i18nShadowStore.svelte.js'
import { shouldShowFab } from '@/services/fabPermissionService.js'
import '@/lib/i18n/i18n.js' // Ensure locales are registered

import './content/styles/floating-ui.css'
import App from './content/app.svelte'
import { mount, unmount } from 'svelte'

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    // Initialize i18n before mounting Shadow DOM
    await loadSettings()

    if (!shouldShowFab(window.location.href, settings.fabDomainControl)) {
      return // Do not mount the UI
    }

    const initialLocale = settings.uiLang || getLocaleFromNavigator()

    await init({
      fallbackLocale: 'en',
      initialLocale,
    })

    // Subscribe to locale changes
    subscribeToLocaleChanges()

    const ui = await createShadowRootUi(ctx, {
      name: 'wxt-svelte-integrated-ui',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        const app = mount(App, { target: container, props: { name: 'Svelte' } })

        return app
      },
      onRemove(app) {
        unmount(app)
      },
    })

    ui.mount()
  },
})
