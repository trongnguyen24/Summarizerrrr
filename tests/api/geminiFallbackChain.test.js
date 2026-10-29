import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setStorageProvider } from '../../src/lib/config/storagePort.js'
import {
  SEED_CHAIN,
  buildGeminiFallbackChain,
  ensureGeminiModelList,
  getGeminiFallbackChain,
  getNextGeminiFallbackModel,
  pickNextFallbackModel,
  rememberGeminiModels,
  resetGeminiModelCache,
} from '../../src/lib/providers/geminiFallbackChain.js'

// Shaped like a real /models listing, plus a release this code has never seen.
const DISCOVERED = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-preview-09-2025',
  'gemini-2.5-flash-preview-tts',
  'gemini-2.5-flash-image',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-4-flash-preview',
  'gemini-4-flash-lite-preview',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-exp-1206',
  'gemma-3-27b-it',
  'gemma-4-31b-it',
  'gemma-4-26b-a4b-it',
]

function fakeStorage(initial = { updatedAt: 0, ids: [] }) {
  let value = initial
  const item = {
    getValue: vi.fn(async () => value),
    setValue: vi.fn(async (next) => {
      value = next
    }),
  }
  setStorageProvider(async () => ({ geminiModelListStorage: item }))
  return item
}

beforeEach(() => {
  resetGeminiModelCache()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('buildGeminiFallbackChain', () => {
  it('orders lite before flash, newest first, Gemma last — new releases included', () => {
    expect(buildGeminiFallbackChain(DISCOVERED)).toEqual([
      'gemini-4-flash-lite-preview',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-4-flash-preview',
      'gemini-3.5-flash',
      'gemini-3-flash-preview',
      'gemma-4-26b-a4b-it',
    ])
  })

  it('keeps pro, TTS, image, exp and dated snapshots out', () => {
    const chain = buildGeminiFallbackChain(DISCOVERED)
    for (const excluded of [
      'gemini-2.5-pro',
      'gemini-3.1-pro-preview',
      'gemini-2.5-flash-preview-tts',
      'gemini-2.5-flash-image',
      'gemini-2.5-flash-preview-09-2025',
      'gemini-exp-1206',
    ]) {
      expect(chain).not.toContain(excluded)
    }
  })

  it('prefers a stable release over its preview', () => {
    expect(
      buildGeminiFallbackChain(['gemini-3.1-flash-lite-preview', 'gemini-3.1-flash-lite']),
    ).toEqual(['gemini-3.1-flash-lite'])
  })

  it('falls back to the self-updating aliases when nothing usable was discovered', () => {
    expect(buildGeminiFallbackChain(undefined)).toEqual(SEED_CHAIN)
    expect(buildGeminiFallbackChain([])).toEqual(SEED_CHAIN)
    expect(buildGeminiFallbackChain(['gemini-2.5-pro'])).toEqual(SEED_CHAIN)
  })
})

describe('pickNextFallbackModel', () => {
  it('terminates and never revisits, whatever the starting model', () => {
    const chain = buildGeminiFallbackChain(DISCOVERED)
    for (const start of ['gemini-2.5-pro', 'gemini-3.5-flash', chain.at(-1)]) {
      const tried = new Set([start])
      let next
      while ((next = pickNextFallbackModel(chain, tried))) {
        expect(tried.has(next), `revisited ${next}`).toBe(false)
        tried.add(next)
      }
      expect(chain.every((model) => tried.has(model))).toBe(true)
    }
  })
})

describe('model list cache', () => {
  it('uses the seed chain until something is discovered', async () => {
    fakeStorage()
    await ensureGeminiModelList(undefined)
    expect(getGeminiFallbackChain()).toEqual(SEED_CHAIN)
    expect(getNextGeminiFallbackModel(new Set([SEED_CHAIN[0]]))).toBe(SEED_CHAIN[1])
  })

  it('persists discovered models and hydrates them back after a reload', async () => {
    const item = fakeStorage()
    await rememberGeminiModels(DISCOVERED)
    expect(item.setValue).toHaveBeenCalledWith(
      expect.objectContaining({ ids: DISCOVERED }),
    )

    resetGeminiModelCache()
    const refresh = vi.fn()
    await ensureGeminiModelList(refresh)
    expect(refresh).not.toHaveBeenCalled() // still fresh
    expect(getGeminiFallbackChain()[0]).toBe('gemini-4-flash-lite-preview')
  })

  it('refreshes a stale list once, then backs off', async () => {
    fakeStorage({ updatedAt: 1, ids: ['gemini-2.5-flash'] })
    const refresh = vi.fn(async () => {
      await rememberGeminiModels(['gemini-9-flash-lite'])
    })

    await ensureGeminiModelList(refresh)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(getGeminiFallbackChain()).toEqual(['gemini-9-flash-lite'])

    // Fresh now — no second request.
    await ensureGeminiModelList(refresh)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('swallows a failing refresh and does not retry it immediately', async () => {
    fakeStorage()
    const refresh = vi.fn(async () => {
      throw new Error('offline')
    })

    await expect(ensureGeminiModelList(refresh)).resolves.toBeUndefined()
    await ensureGeminiModelList(refresh)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(getGeminiFallbackChain()).toEqual(SEED_CHAIN)
  })
})
