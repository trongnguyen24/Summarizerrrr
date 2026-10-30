/**
 * OpenRouter catalog cross-reference module.
 *
 * Turns an OpenRouter `/models` response into a lookup table keyed by
 * `"<vendor>:<normalizedSlug>"` → `contextWindowTokens`.  The resolver
 * (`providerCapabilities.js`) queries this table as a gap-filler between the
 * hand-curated static table and the blind 128K default.
 *
 * Also provides fetch/persist/hydrate helpers so the catalog survives reloads
 * and works even when the user never opens OpenRouter settings.
 *
 * NOTE: storage goes through `lib/config/storagePort.js` and the reactive
 * capability signal through `lib/chat/capabilitiesSignal.js` — both resolve
 * lazily, so the pure functions in this file stay importable in unit tests
 * without triggering `browser.runtime` side effects, and `lib/` never imports
 * `services/` or `stores/` (see the layering table in CLAUDE.md).
 */

import { getStorage } from '@/lib/config/storagePort.js'
import { notifyCapabilitiesChanged } from '@/lib/chat/capabilitiesSignal.js'

/** How long a cached catalog is considered fresh (7 days). */
const CATALOG_TTL_MS = 7 * 24 * 60 * 60 * 1000

/** The keyless OpenRouter models endpoint. */
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

/**
 * Allowlist mapping the app's `providerId` → the OpenRouter vendor prefix.
 * **Cloud, non-Groq/Cerebras, non-local only.**
 * Providers NOT in this map (ollama, lmstudio, openaiCompatible, groq,
 * cerebras, nvidia, openrouter) are never looked up in the catalog.
 *
 * Note `nvidia` is excluded structurally, not by oversight: like openrouter it
 * fronts many vendors, so a single vendor prefix can't represent it.
 */
export const PROVIDER_VENDOR_MAP = {
  chatgpt: 'openai',
  openai: 'openai',
  deepseek: 'deepseek',
  gemini: 'google',
  anthropic: 'anthropic', // reserved: not a selectable provider today, harmless
}

/**
 * Normalize a model identifier to a canonical slug for fuzzy matching.
 *
 * Steps:
 *  1. Lowercase.
 *  2. Strip a leading `vendor/` prefix (anything before the first `/`).
 *  3. Drop a trailing date suffix (`-YYYYMMDD` or `-YYMMDD`).
 *  4. Drop a trailing `-latest`.
 *  5. Replace `.` and `_` with `-`.
 *  6. Collapse repeated `-`.
 *
 * @param {string} id — raw model id (OpenRouter or app-local).
 * @returns {string} normalized slug.
 */
export function normalizeModelSlug(id) {
  let slug = id.toLowerCase()

  // Strip leading vendor prefix (e.g. "openai/gpt-4o" → "gpt-4o").
  const slashIdx = slug.indexOf('/')
  if (slashIdx !== -1) {
    slug = slug.slice(slashIdx + 1)
  }

  // Drop trailing date suffix: -YYYYMMDD or -YYMMDD (6–8 digits at the end).
  slug = slug.replace(/-\d{6,8}$/, '')

  // Drop trailing "-latest".
  slug = slug.replace(/-latest$/, '')

  // Unify separators: `.` and `_` become `-`.
  slug = slug.replace(/[._]/g, '-')

  // Collapse repeated `-`.
  slug = slug.replace(/-{2,}/g, '-')

  return slug
}

/**
 * Build a catalog lookup from an OpenRouter `/models` response body.
 *
 * @param {{ data?: Array<{ id: string, context_length?: number }> }} body
 *   The parsed JSON body from `GET https://openrouter.ai/api/v1/models`.
 * @returns {Record<string, number>}
 *   Plain object keyed `"<vendor>:<normalizedSlug>"` → `contextWindowTokens`.
 *   JSON-serializable for storage; callers wrap in a Map as needed.
 */
export function buildCatalog(body) {
  /** @type {Record<string, number>} */
  const catalog = {}

  const models = body?.data
  if (!Array.isArray(models)) return catalog

  for (const model of models) {
    const id = model?.id
    if (typeof id !== 'string') continue

    // Must be vendor-namespaced (contain a `/`).
    const slashIdx = id.indexOf('/')
    if (slashIdx === -1) continue

    const contextLength = Number(model.context_length)
    if (!Number.isFinite(contextLength) || contextLength <= 0) continue

    const vendor = id.slice(0, slashIdx).toLowerCase()
    const slug = normalizeModelSlug(id)
    const key = `${vendor}:${slug}`

    // First wins on duplicate keys.
    if (!(key in catalog)) {
      catalog[key] = contextLength
    }
  }

  return catalog
}

/**
 * Fail-safe catalog lookup.
 *
 * @param {Record<string, number>} catalog — as returned by `buildCatalog`.
 * @param {string} providerId — the app's provider id (`chatgpt`, `ollama`, …).
 * @param {string} modelId — the app's model id (`gpt-4o`, `deepseek-chat`, …).
 * @returns {number | null} context window tokens, or `null` if not found /
 *   provider excluded.
 */
export function lookupCatalogWindow(catalog, providerId, modelId) {
  if (!catalog || typeof catalog !== 'object') return null
  if (typeof modelId !== 'string' || !modelId) return null

  // OpenRouter model ids are already vendor-prefixed (e.g. 'openai/gpt-5.2',
  // 'x-ai/grok-2'), so extract the vendor directly from the id.
  let vendor
  if (providerId === 'openrouter') {
    const slashIdx = modelId.indexOf('/')
    if (slashIdx === -1) return null // bare id (rare) — can't resolve vendor
    vendor = modelId.slice(0, slashIdx).toLowerCase()
  } else {
    vendor = PROVIDER_VENDOR_MAP[providerId]
    if (!vendor) return null // provider not in the allowlist (e.g. ollama)
  }

  const key = `${vendor}:${normalizeModelSlug(modelId)}`
  const value = catalog[key]
  return typeof value === 'number' && value > 0 ? value : null
}

// ---------------------------------------------------------------------------
// Fetch / persist / hydrate helpers (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Fetch the OpenRouter `/models` catalog, persist it to storage, and push it
 * into the live resolver.  Keyless — no `Authorization` header.
 *
 * Storage and providerCapabilities are resolved lazily to avoid triggering
 * `browser.runtime` at module load time in unit tests.
 *
 * @param {typeof globalThis.fetch} [fetchFn=fetch] — injectable for testing.
 */
export async function fetchAndStoreCatalog(fetchFn = fetch) {
  try {
    const response = await fetchFn(OPENROUTER_MODELS_URL, { method: 'GET' })
    if (!response.ok) {
      console.warn(`[openrouterCatalog] fetch failed: HTTP ${response.status}`)
      return
    }

    const body = await response.json()
    const entries = buildCatalog(body)

    // Lazy resolution keeps pure functions free of browser-only side effects.
    const { openrouterCatalogStorage } = await getStorage()
    const { setOpenrouterCatalog } = await import('./providerCapabilities.js')

    // Persist so the catalog survives reloads.
    await openrouterCatalogStorage.setValue({ fetchedAt: Date.now(), entries })

    // Push into the live resolver immediately.
    setOpenrouterCatalog(entries)

    // Bump so capability-derived UI (context donut) recomputes.
    await notifyCapabilitiesChanged()
  } catch (error) {
    // Offline / network error must never break chat.
    console.warn('[openrouterCatalog] fetch failed:', error)
  }
}

/**
 * Read the persisted catalog from storage and push it into the live resolver.
 * If the catalog is empty or stale (older than `CATALOG_TTL_MS`), kick off a
 * background fetch to refresh it.  Does not block — safe to call at startup.
 */
export async function hydrateCatalogFromStorage() {
  try {
    // Lazy resolution keeps pure functions free of browser-only side effects.
    const { openrouterCatalogStorage } = await getStorage()
    const { setOpenrouterCatalog } = await import('./providerCapabilities.js')

    const stored = await openrouterCatalogStorage.getValue()
    const entries = stored?.entries
    const fetchedAt = stored?.fetchedAt ?? 0

    // Push whatever we have into the resolver (even if empty — harmless).
    if (entries && typeof entries === 'object' && Object.keys(entries).length > 0) {
      setOpenrouterCatalog(entries)
      await notifyCapabilitiesChanged()
    }

    // Refresh in the background if stale or empty.
    const isStale = Date.now() - fetchedAt > CATALOG_TTL_MS
    const isEmpty = !entries || Object.keys(entries).length === 0
    if (isStale || isEmpty) {
      // Fire-and-forget — do not await.
      fetchAndStoreCatalog()
    }
  } catch (error) {
    console.warn('[openrouterCatalog] hydrate failed:', error)
  }
}

