import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  vite: () => ({
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@wxt-dev/module-svelte'],
    },
    // esbuild: {
    //   drop: ['console', 'debugger'],
    // },
  }),
  hooks: {
    'entrypoints:resolved': (wxt, entrypoints) => {
      if (wxt.config.browser === 'firefox') {
        // Remove global content script for Firefox
        const index = entrypoints.findIndex((e) => e.name === 'global')
        if (index !== -1) {
          entrypoints.splice(index, 1)
        }
      } else {
        // Remove firefox content script for other browsers (Chrome, etc.)
        const index = entrypoints.findIndex((e) => e.name === 'firefox')
        if (index !== -1) {
          entrypoints.splice(index, 1)
        }
      }
    },
  },
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: ({ browser }) => {
    if (browser === 'chrome') {
      return {
        name: '__MSG_extensionName__',
        description: '__MSG_extensionDescription__',
        default_locale: 'en',
        host_permissions: [
          'http://127.0.0.1:11434/*',
          'http://localhost:11434/*',
          'http://localhost:1234/*',
          '*://*.iconify.design/*',
          '*://api.openai.com/*',
          '*://api.groq.com/*',
          '*://generativelanguage.googleapis.com/*',
          '*://api.anthropic.com/*',
          '*://openrouter.ai/*',
          '*://api.cerebras.ai/*',
          '*://api.deepseek.com/*',
          '<all_urls>',
        ],
        permissions: [
          'sidePanel',
          'storage',
          'activeTab',
          'scripting',
          'tabs',
          'contextMenus',
          'declarativeNetRequest',
        ],
        action: {
          default_title: '__MSG_actionTitle__',
          default_popup: 'popop.html',
        },
        side_panel: {
          default_path: 'sidepanel.html',
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
            resources: [
              'libs/protobuf.min.js',
              'youtube_transcript.js',
              'youtube_comments.js',
              'youtube_player_control.js',
            ],
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
        default_locale: 'en',
        permissions: [
          'storage',
          'tabs',
          'activeTab',
          'scripting',
          'contextMenus',
        ],
        optional_permissions: ['<all_urls>'],
        host_permissions: [
          'http://127.0.0.1:11434/*',
          'http://localhost:11434/*',
          'http://localhost:1234/*',
          '*://*.youtube.com/*',
          '*://*.udemy.com/*',
          '*://*.coursera.org/*',
          '*://*.reddit.com/*',
          '*://*.iconify.design/*',
          '*://api.openai.com/*',
          '*://api.groq.com/*',
          '*://generativelanguage.googleapis.com/*',
          '*://api.anthropic.com/*',
          '*://openrouter.ai/*',
          '*://api.cerebras.ai/*',
          '*://api.deepseek.com/*',
        ],
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
            resources: [
              'libs/protobuf.min.js',
              'youtube_transcript.js',
              'youtube_comments.js',
              'youtube_player_control.js',
            ],
            matches: ['*://m.youtube.com/*', '*://www.youtube.com/*'],
          },
        ],
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
