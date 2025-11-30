// @ts-nocheck
import { defineContentScript } from '#imports'
import { main } from './content/main.js'

export default defineContentScript({
  // Restricted matches for Firefox - only specific domains with host_permissions
  matches: [
    '*://*.youtube.com/*',
    '*://*.udemy.com/*',
    '*://*.coursera.org/*',
    '*://*.reddit.com/*',
    '*://*.wikipedia.org/*',
  ],
  cssInjectionMode: 'ui',
  main,
})
