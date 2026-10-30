// @vitest-environment jsdom
/**
 * Tab-title status prefix (issue #78).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createTitleStatus,
  stripTitleStatus,
} from '@/lib/utils/titleStatus.js'
import { cleanTitle } from '@/lib/utils/titleExtractor.js'

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('createTitleStatus', () => {
  let titleStatus

  beforeEach(() => {
    vi.useFakeTimers()
    document.head.innerHTML = '<title>Video</title>'
    setVisibility('hidden')
    titleStatus = createTitleStatus(document)
  })

  afterEach(() => {
    titleStatus.destroy()
    vi.useRealTimers()
  })

  it('prefixes the title for each state, replacing the previous mark', () => {
    titleStatus.set('loading')
    expect(document.title).toBe('⏳ Video')
    titleStatus.set('done')
    expect(document.title).toBe('✅ Video')
    titleStatus.set('error')
    expect(document.title).toBe('🟥 Video')
    titleStatus.set(null)
    expect(document.title).toBe('Video')
  })

  it('re-applies the mark when the page rewrites its title', () => {
    titleStatus.set('loading')
    document.title = 'Next video'
    vi.advanceTimersByTime(1000)
    expect(document.title).toBe('⏳ Next video')
  })

  it('keeps a final mark until the tab is seen, then clears it', () => {
    titleStatus.set('done')
    vi.advanceTimersByTime(60_000)
    expect(document.title).toBe('✅ Video')

    setVisibility('visible')
    vi.advanceTimersByTime(3000)
    expect(document.title).toBe('Video')
    expect(titleStatus.get()).toBeNull()
  })

  it('never clears a running summary', () => {
    setVisibility('visible')
    titleStatus.set('loading')
    vi.advanceTimersByTime(60_000)
    expect(document.title).toBe('⏳ Video')
  })

  it('replaces the pre-#78 Quick Summary emoji instead of stacking', () => {
    document.title = '🎉 Video'
    titleStatus.set('error')
    expect(document.title).toBe('🟥 Video')
  })
})

describe('stripping the status from titles', () => {
  it('stripTitleStatus removes one leading mark', () => {
    expect(stripTitleStatus('✅ Video')).toBe('Video')
    expect(stripTitleStatus('🤯 Video')).toBe('Video')
    expect(stripTitleStatus('Video ✅')).toBe('Video ✅')
  })

  it('cleanTitle drops the new marks so history titles stay clean', () => {
    expect(cleanTitle('⏳ (3) Video - YouTube')).toBe('Video')
    expect(cleanTitle('✅ Video')).toBe('Video')
    expect(cleanTitle('🟥 Video')).toBe('Video')
  })
})
