/**
 * Tab-title status prefix (issue #78): ⏳ while a summary runs, ✅ / 🟥 once it
 * finishes, so a tab in the background still shows the outcome in the tab
 * strip. The final mark clears itself a few seconds after the tab is seen.
 */

export const TITLE_STATUS_EMOJI = {
  loading: '⏳',
  done: '✅',
  error: '🟥',
}

// 🎉 / 🤯 are what Quick Summary used before #78 — still stripped so a tab
// left open across the update doesn't keep a stale prefix.
export const TITLE_STATUS_PREFIX = /^(?:⏳|✅|🟥|🎉|🤯)\s*/

const CLEAR_AFTER_SEEN_MS = 3000

/**
 * @param {string} title
 * @returns {string}
 */
export function stripTitleStatus(title) {
  return (title || '').replace(TITLE_STATUS_PREFIX, '')
}

/**
 * Keeps a status emoji at the front of `doc.title`, re-applying it when the
 * page rewrites its own title (SPAs such as YouTube do this on every
 * navigation, some without mutating the <title> node, hence the interval).
 *
 * @param {Document} [doc]
 */
export function createTitleStatus(doc = document) {
  /** @type {'loading' | 'done' | 'error' | null} */
  let status = null
  let observer = null
  let interval = null
  let clearTimer = null

  function apply() {
    const base = stripTitleStatus(doc.title)
    const emoji = status ? TITLE_STATUS_EMOJI[status] : null
    const next = emoji ? `${emoji} ${base}` : base
    if (doc.title !== next) doc.title = next
  }

  function watch() {
    if (interval) return
    const titleEl = doc.querySelector('title')
    if (titleEl && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(apply)
      observer.observe(titleEl, {
        childList: true,
        characterData: true,
        subtree: true,
      })
    }
    interval = setInterval(apply, 1000)
  }

  function unwatch() {
    observer?.disconnect()
    observer = null
    clearInterval(interval)
    interval = null
  }

  function cancelClear() {
    clearTimeout(clearTimer)
    clearTimer = null
    doc.removeEventListener('visibilitychange', onVisibilityChange)
  }

  function onVisibilityChange() {
    if (doc.visibilityState !== 'visible') return
    doc.removeEventListener('visibilitychange', onVisibilityChange)
    clearTimer = setTimeout(() => set(null), CLEAR_AFTER_SEEN_MS)
  }

  // A final mark only has to survive until the user has looked at the tab.
  function scheduleClear() {
    if (doc.visibilityState === 'visible') {
      clearTimer = setTimeout(() => set(null), CLEAR_AFTER_SEEN_MS)
    } else {
      doc.addEventListener('visibilitychange', onVisibilityChange)
    }
  }

  /**
   * @param {'loading' | 'done' | 'error' | null} next
   */
  function set(next) {
    cancelClear()
    status = TITLE_STATUS_EMOJI[next] ? next : null
    apply()
    if (!status) {
      unwatch()
      return
    }
    watch()
    if (status !== 'loading') scheduleClear()
  }

  return {
    set,
    get: () => status,
    destroy() {
      cancelClear()
      unwatch()
    },
  }
}
