// @ts-nocheck
import './style.css'
import { createShadowRootUi, defineContentScript } from '#imports'
import App from './app.svelte'
import { mount, unmount } from 'svelte'

console.log('Kilo Code: main.js loading...')

export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui',
  main(ctx) {
    console.log('Kilo Code: defineContentScript main function started.')
    const ui = createShadowRootUi(ctx, {
      name: 'wxt-svelte-shadow-ui',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        console.log(
          'Kilo Code: Svelte App onMount called, container:',
          container
        )
        const app = mount(App, { target: container, props: { name: 'Svelte' } })
        console.log('Kilo Code: Svelte App mounted, app instance:', app)
        return app
      },
      onRemove(app) {
        console.log('Kilo Code: Svelte App onRemove called, app instance:', app)
        unmount(app)
      },
    })
    console.log('Kilo Code: ShadowRootUi created, ui instance:', ui)
    ui.mount()
    console.log('Kilo Code: ui.mount() called.')
  },
})
