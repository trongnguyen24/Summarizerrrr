import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@wxt-dev/module-svelte'],
    },
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
        page_action: {
          default_popup: 'prompt.html',
          default_title: 'Summarizerrrr Prompt',
        },
        content_scripts: [
          {
            matches: ['*://m.youtube.com/*', '*://www.youtube.com/*'],
            js: [
              'libs/protobuf.min.js',
              'youtube_transcript.js',
              'content-script.js',
            ],
            run_at: 'document_end',
          },
        ],
        web_accessible_resources: [
          {
            resources: ['libs/protobuf.min.js', 'youtube_transcript.js'],
            matches: ['*://m.youtube.com/*', '*://www.youtube.com/*'],
          },
        ],
        commands: {
          _execute_action: {
            suggested_key: {
              default: 'Alt+A',
            },
          },
          'summarize-current-page': {
            suggested_key: {
              default: 'Alt+S',
            },
            description: 'Summarize current page',
          },
          'open-prompt-page': {
            suggested_key: {
              default: 'Alt+P',
            },
            description: 'Open prompt editer',
          },
          'open-archive-panel': {
            suggested_key: {
              default: 'Alt+X',
            },
            description: 'Open archive panel',
          },
        },
      }
    } else if (browser === 'firefox') {
      return {
        permissions: ['storage', 'tabs', '<all_urls>', 'contextMenus'],
        action: {
          default_icon: 'icon/48.png',
          default_title: 'Open Summarizerrrr',
        },
        sidebar_action: {
          default_icon: 'icon/48.png',
          default_panel: 'sidepanel.html',
          default_title: 'Open Summarizerrrr',
        },
        browser_specific_settings: {
          gecko: {
            id: 'trongnguyen24@gmail.com',
            strict_min_version: '109.0',
          },
        },
        commands: {
          _execute_sidebar_action: {
            suggested_key: {
              default: 'Alt+A',
            },
            description: 'Open Summarizerrrr',
          },
          'summarize-current-page': {
            suggested_key: {
              default: 'Alt+Z',
            },
            description: 'Summarize current page',
          },
          'open-prompt-page': {
            suggested_key: {
              default: 'Alt+P',
            },
            description: 'Open prompt page',
          },
          'open-archive-panel': {
            suggested_key: {
              default: 'Alt+X',
            },
            description: 'Open archive panel',
          },
        },
      }
    }
  },
})
