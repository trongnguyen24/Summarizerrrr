import { afterEach, describe, expect, it, vi } from 'vitest'
import { acquire, waitFor } from '@/services/chat/conversationLockService.js'

/**
 * Minimal in-memory stand-in for `navigator.locks` with the subset the service
 * uses: `request(name, options, callback)` with `ifAvailable` and `signal`.
 */
function createFakeLockManager() {
  const held = new Set()
  const waiting = new Map()

  const grant = (name, callback, resolve, reject) => {
    held.add(name)
    Promise.resolve()
      .then(() => callback({ name }))
      .then(
        (value) => {
          held.delete(name)
          resolve(value)
          drain(name)
        },
        (error) => {
          held.delete(name)
          reject(error)
          drain(name)
        },
      )
  }

  const drain = (name) => {
    if (held.has(name)) return
    const queue = waiting.get(name)
    if (!queue?.length) return
    const next = queue.shift()
    grant(name, next.callback, next.resolve, next.reject)
  }

  return {
    request(name, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }
      return new Promise((resolve, reject) => {
        if (!held.has(name)) {
          grant(name, callback, resolve, reject)
          return
        }
        if (options.ifAvailable) {
          resolve(callback(null))
          return
        }
        const entry = { callback, resolve, reject }
        if (!waiting.has(name)) waiting.set(name, [])
        waiting.get(name).push(entry)
        options.signal?.addEventListener('abort', () => {
          const queue = waiting.get(name) || []
          const index = queue.indexOf(entry)
          if (index >= 0) {
            queue.splice(index, 1)
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          }
        })
      })
    },
    isHeld: (name) => held.has(name),
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('conversationLockService with navigator.locks', () => {
  it('gives the first acquirer the lock and reports held:false to the second', async () => {
    vi.stubGlobal('navigator', { locks: createFakeLockManager() })

    const first = await acquire('conv-1')
    expect(first.held).toBe(true)

    const second = await acquire('conv-1')
    expect(second.held).toBe(false)

    first.release()
  })

  it('does not block a different conversation', async () => {
    vi.stubGlobal('navigator', { locks: createFakeLockManager() })

    const a = await acquire('conv-a')
    const b = await acquire('conv-b')
    expect(a.held).toBe(true)
    expect(b.held).toBe(true)

    a.release()
    b.release()
  })

  it('lets the lock be acquired again after release', async () => {
    vi.stubGlobal('navigator', { locks: createFakeLockManager() })

    const first = await acquire('conv-1')
    first.release()
    await flush()

    const again = await acquire('conv-1')
    expect(again.held).toBe(true)
    again.release()
  })

  it('runs waitFor only after the first holder releases', async () => {
    vi.stubGlobal('navigator', { locks: createFakeLockManager() })

    const first = await acquire('conv-1')
    const onAcquired = vi.fn()
    waitFor('conv-1', onAcquired)

    await flush()
    expect(onAcquired).not.toHaveBeenCalled()

    first.release()
    await flush()
    expect(onAcquired).toHaveBeenCalledTimes(1)

    const [release] = onAcquired.mock.calls[0]
    expect(typeof release).toBe('function')
    release()
  })

  it('cancelling a queued waitFor means onAcquired never runs', async () => {
    vi.stubGlobal('navigator', { locks: createFakeLockManager() })

    const first = await acquire('conv-1')
    const onAcquired = vi.fn()
    const cancel = waitFor('conv-1', onAcquired)
    cancel()

    first.release()
    await flush()
    expect(onAcquired).not.toHaveBeenCalled()
  })
})

describe('conversationLockService without navigator.locks', () => {
  it('always acquires, so behaviour matches the pre-lock code', async () => {
    vi.stubGlobal('navigator', {})

    const first = await acquire('conv-1')
    const second = await acquire('conv-1')
    expect(first.held).toBe(true)
    expect(second.held).toBe(true)
    expect(() => first.release()).not.toThrow()
  })

  it('waitFor runs onAcquired right away and cancel is a no-op', async () => {
    vi.stubGlobal('navigator', {})

    const onAcquired = vi.fn()
    const cancel = waitFor('conv-1', onAcquired)
    await flush()
    expect(onAcquired).toHaveBeenCalledTimes(1)
    expect(() => cancel()).not.toThrow()
  })
})
