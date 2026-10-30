// @ts-nocheck
import { browser } from 'wxt/browser'

/**
 * Opens one of the extension's own pages (archive / settings) in a new tab.
 *
 * Content scripts have no `tabs` API, so elsewhere this asks the background to
 * call `tabs.create`. Safari can't rely on that: iOS/iPadOS force a
 * non-persistent background (a persistent one is refused at load), and once it
 * is suspended it does not reliably wake for these messages — the History and
 * Settings buttons silently did nothing. So on Safari the page opens itself;
 * the target pages are listed in `web_accessible_resources` for that reason.
 *
 * @param {'archive.html' | 'settings.html'} page
 * @param {string} [tab] settings tab to open (`settings.html?tab=…`)
 */
export function openExtensionPage(page, tab) {
  if (import.meta.env.BROWSER === 'safari') {
    const path = tab ? `${page}?tab=${tab}` : page
    window.open(browser.runtime.getURL(path), '_blank')
    return
  }
  browser.runtime.sendMessage(
    page === 'archive.html'
      ? { type: 'OPEN_ARCHIVE' }
      : { type: 'OPEN_SETTINGS', ...(tab && { tab }) }
  )
}
