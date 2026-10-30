// @vitest-environment jsdom
/**
 * Side panel → tab title status sync (issue #78).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushSync } from 'svelte'

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(() => Promise.resolve()),
  currentTabId: 1,
  tabStates: [],
}))

vi.mock('wxt/browser', () => ({
  browser: { tabs: { sendMessage: mocks.sendMessage } },
}))

vi.mock(
  '@/stores/summaryStore.svelte.js',
  async () => await import('../stubs/summaryStoreStub.svelte.js'),
)

vi.mock('@/services/tabCacheService.js', () => ({
  getCurrentTabId: () => mocks.currentTabId,
  getTabSummaryStates: () => mocks.tabStates,
}))

import {
  summaryState,
  globalStoreUpdate,
} from '@/stores/summaryStore.svelte.js'
import { syncTabTitleStatus } from '@/entrypoints/sidepanel/tabTitleStatus.svelte.js'

const sent = () => mocks.sendMessage.mock.calls.map(([tabId, msg]) => [tabId, msg.status])

describe('syncTabTitleStatus', () => {
  let stop

  beforeEach(() => {
    mocks.sendMessage.mockClear()
    summaryState.isLoading = false
    summaryState.summaryError = null
    mocks.currentTabId = 1
    mocks.tabStates = [[1, { isLoading: false, summaryError: null }]]
    stop = $effect.root(() => syncTabTitleStatus())
    flushSync()
  })

  afterEach(() => stop())

  it('sends loading, then done for the active tab', () => {
    summaryState.isLoading = true
    flushSync()
    summaryState.isLoading = false
    flushSync()
    expect(sent()).toEqual([
      [1, 'loading'],
      [1, 'done'],
    ])
  })

  it('sends error when the run produced a new error', () => {
    summaryState.isLoading = true
    flushSync()
    summaryState.summaryError = { message: '429' }
    summaryState.isLoading = false
    flushSync()
    expect(sent().at(-1)).toEqual([1, 'error'])
  })

  it('ignores an error left over from an earlier run', () => {
    summaryState.summaryError = { message: 'old' }
    summaryState.isLoading = true
    flushSync()
    summaryState.isLoading = false
    flushSync()
    expect(sent().at(-1)).toEqual([1, 'done'])
  })

  it('tracks a background tab through the version bump', () => {
    const background = { isLoading: true, summaryError: null }
    mocks.tabStates.push([2, background])
    globalStoreUpdate.version++
    flushSync()
    background.isLoading = false
    globalStoreUpdate.version++
    flushSync()
    expect(sent()).toEqual([
      [2, 'loading'],
      [2, 'done'],
    ])
  })

  it('says nothing for tabs that never ran', () => {
    globalStoreUpdate.version++
    flushSync()
    expect(sent()).toEqual([])
  })
})
