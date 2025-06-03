import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: ({ browser }) => {
    if (browser === 'chrome') {
      return {
        host_permissions: ['<all_urls>'],
        permissions: [
          'sidePanel',
          'storage',
          'activeTab',
          'scripting',
          'tabs',
          'contextMenus',
        ],
        action: {
          default_title: 'Click to Open Summarizerrrr',
        },
      }
    } else if (browser === 'firefox') {
      return {
        permissions: ['storage', 'tabs', '<all_urls>', 'contextMenus'],
        browser_action: {
          default_icon: 'icon/48.png',
          default_title: 'Open Summarizerrrr',
        },
        sidebar_action: {
          default_panel: 'sidepanel.html',
          default_title: 'Open Summarizerrrr',
        },
        browser_specific_settings: {
          gecko: {
            id: 'trongnguyen24@gmail.com',
            strict_min_version: '109.0',
          },
        },
      }
    }
  },
})
