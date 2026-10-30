/**
 * Gemini auto-fallback chain, derived at runtime from the models the user's
 * key can actually see — so a new Gemini release joins the chain and a retired
 * one leaves it without anyone editing a table.
 *
 * Source of truth is the `/models` list `fetchProviderModels('gemini', …)`
 * already pulls for the settings picker; every successful fetch lands here via
 * `rememberGeminiModels()`, and `ensureGeminiModelList()` refreshes it on the
 * error path when it's missing or stale. Until anything was discovered the
 * chain is Google's own "-latest" aliases, which track the newest flash models
 * by themselves.
 *
 * Storage goes through `lib/config/storagePort.js` (see the layering table in
 * CLAUDE.md), so the pure helpers stay unit-testable.
 */

import { getStorage } from '@/lib/config/storagePort.js'

/** Used until a model list has been discovered. Never needs updating. */
export const SEED_CHAIN = ['gemini-flash-lite-latest', 'gemini-flash-latest']

const MAX_PER_TIER = 3
const MAX_AGE_MS = 24 * 60 * 60 * 1000
// After a failed refresh, don't hit /models again on every retry.
const RETRY_BACKOFF_MS = 5 * 60 * 1000
const REFRESH_TIMEOUT_MS = 5000

// Exact shapes only: `-exp`, dated snapshots (`-preview-09-2025`), pro, TTS,
// image and Live variants all fall through the `$`.
const FLASH_PATTERN = /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?(-preview)?$/
const GEMMA_PATTERN = /^gemma-(\d+)-(\d+)b(?:-[a-z0-9]+)*-it$/

function compareVersionsDesc(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0)
    if (diff) return diff
  }
  return 0
}

/**
 * Order (same spirit as the old hand-kept chain): flash-lite first — it has by
 * far the most free daily quota — then flash, newest version first inside each
 * tier, then one Gemma last since its low TPM can't swallow a long page.
 *
 * @param {string[]} ids discovered model ids
 * @returns {string[]}
 */
export function buildGeminiFallbackChain(ids) {
  if (!Array.isArray(ids)) return [...SEED_CHAIN]

  // One id per (tier, version); a stable release beats its `-preview`.
  const flash = new Map()
  const lite = new Map()
  let gemma = null

  for (const raw of ids) {
    const id = typeof raw === 'string' ? raw.trim().toLowerCase() : ''

    const flashMatch = FLASH_PATTERN.exec(id)
    if (flashMatch) {
      const [, version, isLite, isPreview] = flashMatch
      const tier = isLite ? lite : flash
      const existing = tier.get(version)
      if (!existing || (existing.preview && !isPreview)) {
        tier.set(version, { id, preview: Boolean(isPreview) })
      }
      continue
    }

    const gemmaMatch = GEMMA_PATTERN.exec(id)
    if (gemmaMatch) {
      // Newest generation, then the smallest (fastest) size inside it.
      const candidate = {
        id,
        major: Number(gemmaMatch[1]),
        size: Number(gemmaMatch[2]),
      }
      if (
        !gemma ||
        candidate.major > gemma.major ||
        (candidate.major === gemma.major && candidate.size < gemma.size)
      ) {
        gemma = candidate
      }
    }
  }

  const byVersion = (tier) =>
    [...tier.entries()]
      .sort(([a], [b]) => compareVersionsDesc(a, b))
      .slice(0, MAX_PER_TIER)
      .map(([, entry]) => entry.id)

  const chain = [...byVersion(lite), ...byVersion(flash)]
  if (!chain.length) return [...SEED_CHAIN]
  if (gemma) chain.push(gemma.id)
  return chain
}

/**
 * Next model to try: the first chain entry this request hasn't tried yet.
 * Walking a `tried` set instead of an index means the walk always ends, even if
 * the chain is rebuilt mid-request, and a model that just 404'd is never
 * retried.
 *
 * @param {string[]} chain
 * @param {Set<string>} tried
 * @returns {string|null}
 */
export function pickNextFallbackModel(chain, tried) {
  return chain.find((model) => !tried.has(model)) || null
}

// --- runtime cache ---------------------------------------------------------

let cache = null // { updatedAt, ids }
let hydrated = false
let lastRefreshAttempt = 0

async function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const { geminiModelListStorage } = await getStorage()
    const stored = await geminiModelListStorage.getValue()
    if (Array.isArray(stored?.ids) && stored.ids.length && !cache) {
      cache = { updatedAt: stored.updatedAt || 0, ids: stored.ids }
    }
  } catch (error) {
    console.warn('[geminiFallbackChain] hydrate failed:', error)
  }
}

/**
 * Record a freshly discovered Gemini model list. Fire-and-forget safe.
 * @param {string[]} ids
 */
export async function rememberGeminiModels(ids) {
  if (!Array.isArray(ids) || !ids.length) return
  cache = { updatedAt: Date.now(), ids: [...ids] }
  hydrated = true
  try {
    const { geminiModelListStorage } = await getStorage()
    await geminiModelListStorage.setValue(cache)
  } catch (error) {
    console.warn('[geminiFallbackChain] persist failed:', error)
  }
}

/**
 * Make sure a reasonably fresh model list is cached before picking a fallback.
 * Only runs on the error path. Never throws: on any failure the chain just
 * uses what's cached, or the seed aliases.
 *
 * @param {() => Promise<unknown>} refresh fetches `/models`; expected to call
 *   `rememberGeminiModels` itself on success (`fetchProviderModels` does)
 */
export async function ensureGeminiModelList(refresh) {
  await hydrate()

  const now = Date.now()
  const fresh = cache && now - cache.updatedAt < MAX_AGE_MS
  if (fresh || typeof refresh !== 'function') return
  if (now - lastRefreshAttempt < RETRY_BACKOFF_MS) return

  lastRefreshAttempt = now
  let timer
  try {
    await Promise.race([
      refresh(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('model list refresh timed out')),
          REFRESH_TIMEOUT_MS,
        )
      }),
    ])
  } catch (error) {
    console.warn('[geminiFallbackChain] refresh failed:', error)
  } finally {
    clearTimeout(timer)
  }
}

/** The chain for the current cache (seed aliases when nothing is cached). */
export function getGeminiFallbackChain() {
  return buildGeminiFallbackChain(cache?.ids)
}

/**
 * @param {Set<string>} tried models this request already used
 * @returns {string|null}
 */
export function getNextGeminiFallbackModel(tried) {
  return pickNextFallbackModel(getGeminiFallbackChain(), tried)
}

/** Test-only: forget the in-memory cache. */
export function resetGeminiModelCache() {
  cache = null
  hydrated = false
  lastRefreshAttempt = 0
}
