// @ts-nocheck
import { register, init, getLocaleFromNavigator } from 'svelte-i18n'

// Register locales
register('en', () => import('./locales/en.json'))
register('vi', () => import('./locales/vi.json'))
register('es', () => import('./locales/es.json'))
register('zh-CN', () => import('./locales/zh-CN.json'))
register('de', () => import('./locales/de.json'))
register('fr', () => import('./locales/fr.json'))
register('ja', () => import('./locales/ja.json'))

// Initialize svelte-i18n.
// The initial locale will be set in App.svelte to ensure it's in a reactive context.
init({
  fallbackLocale: 'en',
  initialLocale: getLocaleFromNavigator(), // This will be the initial value before the store syncs
})
