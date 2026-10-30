/**
 * Free-tier rate limits for Gemini models.
 *
 * Snapshot taken 2026-10-30 from the AI Studio rate-limit page
 * (https://aistudio.google.com/app/rate-limit) — re-check there when Google
 * ships a new model family, the numbers do drift.
 *
 * Keys are model-id PREFIXES and only cover models that still have quota > 0
 * on the Free tier. Families that read 0/0/0 there (`gemini-2.0-flash*`,
 * `gemini-2.5-pro`, `gemini-3-pro*`, `gemini-3.1-pro*`, `gemini-4-argon`,
 * `gemini-omni*`, `deep-research*`, `computer-use`) are deliberately absent,
 * so they resolve to `null` and get no badge — same as a model we've simply
 * never heard of.
 *
 * Only drives the "Free" badge in the model picker — a stale entry costs a
 * wrong badge, nothing more. The auto-fallback chain no longer reads this; it
 * is built from the live model list (`geminiFallbackChain.js`).
 */
const GEMINI_FREE_TIER = {
  'gemini-3.8-flash': { rpm: 5, tpm: 250_000, rpd: 20 },
  'gemini-3.6-flash': { rpm: 5, tpm: 250_000, rpd: 20 },
  'gemini-3.5-flash-lite': { rpm: 15, tpm: 250_000, rpd: 500 },
  'gemini-3.5-flash': { rpm: 5, tpm: 250_000, rpd: 20 },
  'gemini-3.1-flash-lite': { rpm: 15, tpm: 250_000, rpd: 500 },
  'gemini-3-flash': { rpm: 5, tpm: 250_000, rpd: 20 },
  'gemini-2.5-flash-lite': { rpm: 10, tpm: 250_000, rpd: 20 },
  'gemini-2.5-flash': { rpm: 5, tpm: 250_000, rpd: 20 },
  // Google's "-latest" aliases point at whichever flash is current, so quote
  // the conservative numbers of the family they alias.
  'gemini-flash-lite-latest': { rpm: 15, tpm: 250_000, rpd: 500 },
  'gemini-flash-latest': { rpm: 5, tpm: 250_000, rpd: 20 },
  'gemma-4': { rpm: 30, tpm: 16_000, rpd: 14_400 },
  'antigravity': { rpm: 60, tpm: 100_000, rpd: 100 },
}

// Longest prefix wins, otherwise `gemini-3.5-flash-lite` would match the
// `gemini-3.5-flash` entry and advertise the wrong daily quota.
const FREE_TIER_PREFIXES = Object.keys(GEMINI_FREE_TIER).sort(
  (a, b) => b.length - a.length,
)

/**
 * Gemini's `generateContent` filter still lets through models that can't do
 * text-in/text-out summarization: speech, image and video generation, the Live
 * audio-dialog variants, robotics and computer-use. Substring matching on the
 * id is the only signal the list endpoint gives us.
 */
const NON_TEXT_PATTERNS = [
  '-tts',
  '-image',
  'imagen-',
  'veo-',
  'lyria-',
  'embedding',
  'computer-use',
  'robotics',
  'native-audio',
  '-audio',
  '-live',
]

/**
 * @param {string} modelId
 * @returns {{rpm: number, tpm: number, rpd: number} | null}
 */
export function getGeminiFreeTierQuota(modelId) {
  const id = typeof modelId === 'string' ? modelId.trim().toLowerCase() : ''
  if (!id) return null

  const prefix = FREE_TIER_PREFIXES.find((key) => id.startsWith(key))
  if (!prefix) return null

  const { rpm, tpm, rpd } = GEMINI_FREE_TIER[prefix]
  return { rpm, tpm, rpd }
}

/**
 * @param {string} modelId
 * @returns {boolean}
 */
export function isNonTextGeminiModel(modelId) {
  const id = typeof modelId === 'string' ? modelId.trim().toLowerCase() : ''
  if (!id) return false

  return NON_TEXT_PATTERNS.some((pattern) => id.includes(pattern))
}

/**
 * Free-tier models first, everything else after, alphabetical order preserved
 * inside each group. No-op for non-Gemini providers.
 *
 * @param {string} providerId
 * @param {string[]} models
 * @returns {string[]}
 */
export function sortFreeTierFirst(providerId, models) {
  if (providerId !== 'gemini' || !Array.isArray(models)) return models

  const free = []
  const rest = []
  for (const model of models) {
    ;(getGeminiFreeTierQuota(model) ? free : rest).push(model)
  }
  return [...free, ...rest]
}

function formatTokens(value) {
  if (value >= 1000) {
    const thousands = value / 1000
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`
  }
  return String(value)
}

/**
 * Build a combobox item, attaching the free-tier badge when the model has one.
 *
 * @param {string} providerId
 * @param {string} modelId
 * @param {string} [badgeLabel] localized badge text
 * @returns {{value: string, label: string, badge?: string, badgeTitle?: string}}
 */
export function toModelItem(providerId, modelId, badgeLabel = 'Free') {
  const item = { value: modelId, label: modelId }
  if (providerId !== 'gemini') return item

  const quota = getGeminiFreeTierQuota(modelId)
  if (!quota) return item

  item.badge = badgeLabel
  item.badgeTitle = `${quota.rpm} RPM · ${formatTokens(quota.tpm)} TPM · ${formatTokens(quota.rpd)} RPD`
  return item
}
