// @ts-nocheck
import { createShadowRootUi, defineContentScript } from '#imports'
import './content/styles/floating-ui.css'
import App from './content/app.svelte'
import { mount, unmount } from 'svelte'

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'wxt-svelte-shadow-ui',
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
