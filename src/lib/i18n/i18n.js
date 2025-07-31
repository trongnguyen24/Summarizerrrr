// @ts-nocheck
import { register } from 'svelte-i18n'

// Register locales so they can be imported dynamically
register('en', () => import('../locales/en.json'))
register('vi', () => import('../locales/vi.json'))
register('es', () => import('../locales/es.json'))
register('zh-CN', () => import('../locales/zh-CN.json'))
register('de', () => import('../locales/de.json'))
register('fr', () => import('../locales/fr.json'))
register('ja', () => import('../locales/ja.json'))
register('ko', () => import('../locales/ko.json'))
