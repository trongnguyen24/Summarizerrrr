/**
 * Per-conversation single-writer lock, built on the Web Locks API.
 *
 * Extension pages of the same origin (side panel, archive tab) share one lock
 * namespace, so at most one page can write to a conversation at a time. The
 * browser releases a page's locks automatically when that page closes.
 *
 * Where `navigator.locks` is unavailable, every acquire succeeds and nothing
 * is serialised, which is the behaviour before this lock existed.
 */

const LOCK_PREFIX = 'chat-conv:'
const NOOP = () => {}

function getLockManager() {
  if (typeof navigator === 'undefined') return null
  return navigator.locks && typeof navigator.locks.request === 'function'
    ? navigator.locks
    : null
}

function lockName(conversationId) {
  return LOCK_PREFIX + conversationId
}

/**
 * Try to take the conversation lock without waiting.
 *
 * Resolves `{ held: true, release }` when this page now owns the conversation
 * (call `release()` to give it up), or `{ held: false, release: NOOP }` when
 * another page already holds it.
 *
 * @param {string} conversationId
 * @returns {Promise<{ held: boolean, release: () => void }>}
 */
export function acquire(conversationId) {
  const locks = getLockManager()
  if (!locks) return Promise.resolve({ held: true, release: NOOP })

  return new Promise((resolve, reject) => {
    locks
      .request(lockName(conversationId), { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve({ held: false, release: NOOP })
          return undefined
        }
        // Returning a promise keeps the lock until it settles, i.e. until
        // `release()` is called.
        return new Promise((releaseLock) => {
          resolve({ held: true, release: () => releaseLock() })
        })
      })
      .catch(reject)
  })
}

/**
 * Queue for the conversation lock (blocking request). When it is granted,
 * `onAcquired(release)` runs and the lock stays held until `release()` is
 * called.
 *
 * Returns a cancel function. Cancelling aborts a request that is still
 * queued. It does not release a lock that was already granted; the caller
 * must call the `release` it received in `onAcquired`.
 *
 * @param {string} conversationId
 * @param {(release: () => void) => void} onAcquired
 * @returns {() => void} cancel
 */
export function waitFor(conversationId, onAcquired) {
  const locks = getLockManager()
  if (!locks) {
    queueMicrotask(() => onAcquired(NOOP))
    return NOOP
  }

  const controller = new AbortController()
  locks
    .request(lockName(conversationId), { signal: controller.signal }, () => {
      return new Promise((releaseLock) => {
        let released = false
        onAcquired(() => {
          if (released) return
          released = true
          releaseLock()
        })
      })
    })
    .catch((error) => {
      // An abort is the expected result of cancelling a queued wait.
      if (error?.name !== 'AbortError') {
        console.error('[conversationLockService] Lock request failed:', error)
      }
    })

  return () => controller.abort()
}
