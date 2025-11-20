// @ts-nocheck
import { defineContentScript } from '#imports'
import { main } from './content/main.js'

export default defineContentScript({
  // Global matches for Chrome/Edge
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  main,
})
