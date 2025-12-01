// @ts-nocheck
import { createShadowRootUi } from '#imports'
import { init, getLocaleFromNavigator } from 'svelte-i18n'
import { loadSettings, settings } from '@/stores/settingsStore.svelte.js'
import { subscribeToLocaleChanges } from '@/stores/i18nShadowStore.svelte.js'
import { shouldShowFab } from '@/services/fabPermissionService.js'
import '@/lib/i18n/i18n.js' // Ensure locales are registered

import cssContent from './styles/floating-ui.css?inline'
import App from './App.svelte'
import { mount, unmount } from 'svelte'

export async function main(ctx) {
  // Initialize i18n before mounting Shadow DOM
  await loadSettings()

  // Check Firefox permissions trước khi kiểm tra shouldShowFab
  if (import.meta.env.BROWSER === 'firefox') {
    try {
      // Gửi message đến background script để kiểm tra permission
      const response = await browser.runtime.sendMessage({
        type: 'CHECK_FIREFOX_PERMISSION',
        url: window.location.href,
      })

      if (!response.success || !response.hasPermission) {
        return // Return sớm, không mount UI
      }
    } catch (error) {
      console.error('[Content/Main] ❌ Error checking Firefox permissions:', error)
      return // Lỗi thì không mount UI
    }
  }

  const shouldShow = shouldShowFab(window.location.href, settings.fabDomainControl)
  
  if (!shouldShow) {
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
    css: cssContent,
    onMount(container) {
      // Fix layout issues by taking the host out of flow
      // This prevents the host element from affecting the page layout (e.g. flex containers)
      const host = container.getRootNode()?.host
      if (host) {
        host.style.position = 'fixed'
        host.style.top = '0'
        host.style.left = '0'
        host.style.width = '0'
        host.style.height = '0'
        host.style.overflow = 'visible'
        host.style.zIndex = '2147483647' // Max z-index
      }

      const app = mount(App, { target: container, props: { name: 'Svelte' } })

      return app
    },
    onRemove(app) {
      unmount(app)
    },
  })

  // Use mutex lock with Promise to prevent race conditions
  if (window.__SUMMARIZERRRR_MOUNT_LOCK__) {
    await window.__SUMMARIZERRRR_MOUNT_LOCK__
    
    // CRITICAL FIX: Check if UI actually exists after waiting
    // If UI was unmounted (e.g. SPA navigation), we must proceed to mount
    if (document.querySelector('wxt-svelte-integrated-ui')) {
      return
    }
  }

  // Create new lock
  window.__SUMMARIZERRRR_MOUNT_LOCK__ = new Promise(async (resolve) => {
    ui.mount()
    resolve()
  })
}
