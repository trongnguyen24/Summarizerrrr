// @ts-nocheck
import { defineContentScript, createShadowRootUi } from '#imports'
import { init, getLocaleFromNavigator } from 'svelte-i18n'
import { loadSettings, settings } from '@/stores/settingsStore.svelte.js'
import { subscribeToLocaleChanges } from '@/stores/i18nShadowStore.svelte.js'
import { shouldShowFab } from '@/services/fabPermissionService.js'
import { checkPermission } from '@/services/firefoxPermissionService.js'
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

    // Check Firefox permissions trước khi kiểm tra shouldShowFab
    if (import.meta.env.BROWSER === 'firefox') {
      try {
        const hasPermission = await checkPermission(window.location.href)
        console.log(
          `[Content] Firefox permission check for ${window.location.href}:`,
          hasPermission
        )

        if (!hasPermission) {
          console.log(
            '[Content] No optional permission for this site - UI not mounted'
          )
          return // Return sớm, không mount UI
        }
      } catch (error) {
        console.error('[Content] Error checking Firefox permissions:', error)
        return // Lỗi thì không mount UI
      }
    }

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
