/**
 * Model context budgets are intentionally kept separate from prompt assembly.
 * Resolution order (see {@link getProviderCapabilities}):
 *   1. Runtime registry — real limits discovered from a provider's models API.
 *   2. Static table below — providers whose API does NOT expose context length
 *      (OpenAI, DeepSeek, Anthropic) or well-known families.
 *   3. OpenRouter catalog cross-reference — vendor-scoped, fail-safe lookup
 *      from the OpenRouter /models catalog (cloud providers only).
 *   4. Default fallback — most modern chat models are ≥128K, so an unknown
 *      model is assumed to be 128K rather than the old ultra-conservative 16K.
 */
import { lookupCatalogWindow } from './openrouterCatalog.js'
export const DEFAULT_CONTEXT_WINDOW_TOKENS = 128_000
export const DEFAULT_OUTPUT_TOKENS = 4_000

/**
 * Runtime map of `${providerId}:${modelId}` → `{ contextWindowTokens,
 * defaultOutputTokens }`, populated by model discovery when the provider's API
 * carries context length (e.g. Groq `context_window`, OpenRouter
 * `context_length`). Empty until discovery runs; entries are exact, so they take
 * precedence over the static table and the fallback.
 * @type {Map<string, {contextWindowTokens: number, defaultOutputTokens?: number}>}
 */
const discoveredCapabilities = new Map()

/**
 * Record a model's real limits, discovered from a provider's models endpoint.
 * @param {string} providerId
 * @param {string} modelId
 * @param {{contextWindowTokens?: number, defaultOutputTokens?: number}} caps
 */
export function registerModelCapability(providerId, modelId, caps = {}) {
  if (!providerId || !modelId) return
  const contextWindowTokens = Number(caps.contextWindowTokens)
  if (!Number.isFinite(contextWindowTokens) || contextWindowTokens <= 0) return
  discoveredCapabilities.set(`${providerId}:${modelId}`, {
    contextWindowTokens,
    ...(Number.isFinite(Number(caps.defaultOutputTokens))
      ? { defaultOutputTokens: Number(caps.defaultOutputTokens) }
      : {}),
  })
}

/** Test/reset hook: forget all discovered capabilities. */
export function clearDiscoveredCapabilities() {
  discoveredCapabilities.clear()
}

/**
 * Snapshot the discovered registry as a JSON-serializable object, keyed
 * `${providerId}:${modelId}`. Used to persist limits across reloads.
 * @returns {Record<string, {contextWindowTokens: number, defaultOutputTokens?: number}>}
 */
export function getDiscoveredCapabilitiesSnapshot() {
  /** @type {Record<string, {contextWindowTokens: number, defaultOutputTokens?: number}>} */
  const snapshot = {}
  for (const [key, value] of discoveredCapabilities) {
    snapshot[key] = { ...value }
  }
  return snapshot
}

/**
 * Merge persisted capabilities back into the runtime registry (e.g. at startup).
 * Entries already present win, so a stale cache never clobbers a limit
 * discovered live this session. Keys are `${providerId}:${modelId}`.
 * @param {Record<string, {contextWindowTokens?: number, defaultOutputTokens?: number}>} entries
 */
export function mergeDiscoveredCapabilities(entries) {
  if (!entries || typeof entries !== 'object') return
  for (const [key, value] of Object.entries(entries)) {
    if (discoveredCapabilities.has(key)) continue
    const contextWindowTokens = Number(value?.contextWindowTokens)
    if (!Number.isFinite(contextWindowTokens) || contextWindowTokens <= 0) continue
    discoveredCapabilities.set(key, {
      contextWindowTokens,
      ...(Number.isFinite(Number(value?.defaultOutputTokens))
        ? { defaultOutputTokens: Number(value.defaultOutputTokens) }
        : {}),
    })
  }
}

/**
 * OpenRouter catalog cross-reference — a plain object keyed
 * `"<vendor>:<normalizedSlug>"` → `contextWindowTokens`, or `null` when not
 * hydrated yet.  Set by Phase 3's hydration / fetch helpers.
 * @type {Record<string, number> | null}
 */
let openrouterCatalog = null

/**
 * Store the OpenRouter catalog so the resolver can use it as layer 3.
 * @param {Record<string, number>} catalogObject
 */
export function setOpenrouterCatalog(catalogObject) {
  if (catalogObject && typeof catalogObject === 'object') {
    openrouterCatalog = catalogObject
  }
}

/** Test/reset hook: clear the OpenRouter catalog. */
export function clearOpenrouterCatalog() {
  openrouterCatalog = null
}

const KNOWN_MODEL_CAPABILITIES = [
  {
    providerId: 'gemini',
    // 2.5 and every later generation, plus the `-latest` aliases.
    modelPattern: /^gemini-(?:2\.5|[3-9](?:\.\d+)?|\d{2,}(?:\.\d+)?)-|^gemini-(?:flash|flash-lite|pro)-latest$/,
    contextWindowTokens: 1_000_000,
    defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
  },
  {
    providerId: 'gemini',
    modelPattern: /^gemma-(?:[4-9]|\d{2,})-/,
    contextWindowTokens: 128_000,
    defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
  },
  {
    providerId: 'openai',
    modelPattern: /^gpt-5\.(?:4(?:-pro)?|5(?:-pro)?|6(?:-(?:sol|terra|luna))?)(?:-\d{4}-\d{2}-\d{2})?$/,
    contextWindowTokens: 1_050_000,
    defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
  },
  {
    providerId: 'chatgpt',
    modelPattern: /^gpt-5\.(?:4(?:-pro)?|5(?:-pro)?|6(?:-(?:sol|terra|luna))?)(?:-\d{4}-\d{2}-\d{2})?$/,
    contextWindowTokens: 1_050_000,
    defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
  },
  {
    providerId: 'openai',
    modelPattern: /^gpt-5|^o[134]/,
    contextWindowTokens: 128_000,
    defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
  },
  {
    providerId: 'chatgpt',
    modelPattern: /^gpt-5|^o[134]/,
    contextWindowTokens: 128_000,
    defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
  },
  {
    // DeepSeek V4 Flash and Pro both expose a 1M context window. The models API
    // does not include this limit, so keep it in the static capability table.
    providerId: 'deepseek',
    modelPattern: /^deepseek-v4-(flash|pro)$/,
    contextWindowTokens: 1_000_000,
    defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
  },
]

/**
 * Resolve model limits without coupling the pipeline to a provider SDK.
 * @param {string} providerId
 * @param {string | null | undefined} modelId
 */
export function getProviderCapabilities(providerId, modelId) {
  // 1. Exact limits discovered from the provider's models API win.
  const discovered = typeof modelId === 'string' ? discoveredCapabilities.get(`${providerId}:${modelId}`) : null
  if (discovered) {
    return {
      providerId,
      modelId,
      contextWindowTokens: discovered.contextWindowTokens,
      defaultOutputTokens: discovered.defaultOutputTokens ?? DEFAULT_OUTPUT_TOKENS,
      source: 'discovered',
    }
  }

  // 2. Static table for providers whose API omits context length.
  const knownCapability = KNOWN_MODEL_CAPABILITIES.find(
    (capability) =>
      capability.providerId === providerId &&
      typeof modelId === 'string' &&
      capability.modelPattern.test(modelId)
  )

  if (knownCapability) {
    return {
      providerId,
      modelId,
      contextWindowTokens: knownCapability.contextWindowTokens,
      defaultOutputTokens: knownCapability.defaultOutputTokens,
      source: 'known-model',
    }
  }

  // 3. OpenRouter catalog cross-reference (cloud providers only, fail-safe).
  if (openrouterCatalog && typeof modelId === 'string') {
    const catalogWindow = lookupCatalogWindow(openrouterCatalog, providerId, modelId)
    if (catalogWindow) {
      return {
        providerId,
        modelId,
        contextWindowTokens: catalogWindow,
        defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
        source: 'openrouter-catalog',
      }
    }
  }

  // 4. Modern default (most current chat models are ≥128K).
  return {
    providerId,
    modelId: modelId || null,
    contextWindowTokens: DEFAULT_CONTEXT_WINDOW_TOKENS,
    defaultOutputTokens: DEFAULT_OUTPUT_TOKENS,
    source: 'default-fallback',
  }
}
