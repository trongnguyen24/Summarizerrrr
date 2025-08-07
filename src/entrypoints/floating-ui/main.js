// @ts-nocheck
import './styles/floating-ui.css'
import FloatingUI from './FloatingUI.svelte'
import { mount, unmount } from 'svelte'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  main: async (ctx) => {
    const ui = await createShadowRootUi(ctx, {
      name: 'summarizerrrr-floating-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        // Create the Svelte app inside the UI container
        const app = mount(FloatingUI, {
          target: container,
        })
        return app
      },
      onRemove: (app) => {
        // Destroy the app when the UI is removed
        if (app) {
          unmount(app)
        }
      },
    })

    // 4. Mount the UI
    ui.mount()
  },
})
