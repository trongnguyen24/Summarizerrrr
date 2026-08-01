// @ts-nocheck
/**
 * Reasoning Control — central provider/level policy and request-option mapper.
 *
 * Serves both Chat and one-shot tasks (Summary, Deep Dive).
 *
 * Chat exposes four choices: Auto (provider-default), Low, Medium, High.
 * Tasks expose three choices: Off, Low, Medium.
 *
 * This module is the single source of truth for:
 * - Which UI choices each provider supports.
 * - How a selected level maps to AI SDK request options (portable `reasoning`
 *   or provider-specific `providerOptions`).
 * - Normalizing and resolving the effective level from session state + settings.
 */

import { isOpenAICompatibleProfileId } from '@/lib/providers/openAICompatibleProfiles.js'
import { buildThinkingProviderOptions } from '@/lib/utils/geminiThinkingConfig.js'

// ---------------------------------------------------------------------------
// UI choices
// ---------------------------------------------------------------------------

/**
 * The four V1 reasoning choices exposed to the user in Chat.
 * `value` is persisted in user-message snapshots and in settings.
 * @type {ReadonlyArray<{value: string, label: string, description: string}>}
 */
export const REASONING_CHOICES = Object.freeze([
  {
    value: 'provider-default',
    label: 'Auto',
    description: 'Let the model decide',
  },
  {
    value: 'low',
    label: 'Low',
    description: 'Faster, lower cost',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Balanced speed and depth',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Deeper reasoning, slower',
  },
])

/**
 * Choice set for one-shot tasks (summary, deep dive). No Auto.
 * @type {ReadonlyArray<{value: string, label: string, description: string}>}
 */
export const TASK_REASONING_CHOICES = Object.freeze([
  { value: 'off', label: 'Off', description: 'Answer directly, fastest' },
  { value: 'low', label: 'Low', description: 'Light reasoning' },
  { value: 'medium', label: 'Medium', description: 'Balanced depth and speed' },
])

const VALID_LEVELS = new Set([
  ...REASONING_CHOICES.map((c) => c.value),
  'off',
])

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

/**
 * Sanitize an arbitrary value into one of the valid chat levels.
 * Missing, null, or unrecognized values become `'provider-default'`.
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeChatReasoningLevel(value) {
  if (typeof value === 'string' && VALID_LEVELS.has(value)) return value
  return 'provider-default'
}

/**
 * Sanitize an arbitrary value into one of the valid task levels.
 * Missing, null, or unrecognized values become `'off'` (the task default).
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeTaskReasoningLevel(value) {
  if (typeof value === 'string' && VALID_LEVELS.has(value)) return value
  return 'off'
}

// ---------------------------------------------------------------------------
// Provider → allowed UI choices
// ---------------------------------------------------------------------------

/**
 * Normalize a providerId to its canonical form for the reasoning table lookup.
 * - `geminiAdvanced` → `gemini`
 * - `openai` → `chatgpt`
 * - dynamic OpenAI-compatible profile ids → `openaiCompatible`
 * @param {string} providerId
 * @returns {string}
 */
function normalizeProviderForReasoning(providerId) {
  if (providerId === 'geminiAdvanced') return 'gemini'
  if (providerId === 'openai') return 'chatgpt'
  if (isOpenAICompatibleProfileId(providerId)) return 'openaiCompatible'
  return providerId
}

/** Providers that support the full Auto/Low/Medium/High selector in V1. */
const FULL_REASONING_PROVIDERS = new Set([
  'gemini',
  'chatgpt',
  'deepseek',
  'groq',
  'ollama',
  'openrouter',
  'cerebras',
])

/** Providers locked to Auto-only in V1 (no reasoning override sent). */
const AUTO_ONLY_PROVIDERS = new Set([
  'openaiCompatible',
  'lmstudio',
  // NVIDIA NIM fronts ~70 models from a dozen vendors; thinking is opted into
  // per-model (e.g. Nemotron's `chat_template_kwargs`), not by a portable
  // `reasoningEffort`. Sending one would 400 on most of the catalog.
  'nvidia',
])

/**
 * Return the list of UI choices available for a provider.
 * `modelId` is accepted for future per-model refinement but unused in V1.
 * @param {string} providerId
 * @param {string | null} [modelId]
 * @returns {ReadonlyArray<{value: string, label: string, description: string}>}
 */
export function getChatReasoningOptions(providerId, modelId = null) {
  const normalized = normalizeProviderForReasoning(providerId)

  if (FULL_REASONING_PROVIDERS.has(normalized)) {
    return REASONING_CHOICES
  }

  // Auto-only or unknown provider
  return REASONING_CHOICES.filter((c) => c.value === 'provider-default')
}

// ---------------------------------------------------------------------------
// Request options mapper
// ---------------------------------------------------------------------------

/**
 * Build the AI SDK request options object for a given provider and reasoning level.
 *
 * Returns one of:
 * - `{ reasoning: level }` for portable providers (non-Auto)
 * - `{ providerOptions: { openrouter: { reasoning: { effort: level } } } }` for OpenRouter
 * - `{ providerOptions: { cerebras: { reasoningEffort: level } } }` for Cerebras
 * - `{ providerOptions: { google: { thinkingConfig: ... } } }` for Gemini with 'off' or explicit levels
 * - `{}` for Auto on provider-specific paths, unsupported providers, or Auto-only providers
 *
 * The returned object is safe to spread/merge into any AI SDK call without
 * colliding with other keys.
 *
 * @param {string} providerId
 * @param {string} level — one of the V1 values (already normalized)
 * @param {string | null} [modelId] — required for Gemini 'off' branch (family detection)
 * @returns {object}
 */
export function buildReasoningRequestOptions(providerId, level, modelId = null) {
  const normalized = normalizeProviderForReasoning(providerId)
  const effectiveLevel = normalizeChatReasoningLevel(level)

  // Auto-only providers: never send a reasoning override
  if (AUTO_ONLY_PROVIDERS.has(normalized) || !FULL_REASONING_PROVIDERS.has(normalized)) {
    return {}
  }

  // Auto: let the provider handle it — no override
  if (effectiveLevel === 'provider-default') {
    return {}
  }

  // 'off' handling — provider-specific disable paths
  if (effectiveLevel === 'off') {
    switch (normalized) {
      case 'gemini': {
        // Route through geminiThinkingConfig to handle per-family quirks
        // (3 Pro → 'medium', Gemma 4 → 'minimal', 2.5 → budget 0).
        // Unknown families fall back to portable 'none' rather than sending
        // nothing — otherwise Off would silently leave thinking at the default.
        const providerOptions = buildThinkingProviderOptions(modelId, 'minimal')
        return Object.keys(providerOptions).length > 0
          ? { providerOptions }
          : { reasoning: 'none' }
      }
      case 'openrouter':
        return {
          providerOptions: {
            openrouter: {
              reasoning: { effort: 'none' },
            },
          },
        }
      case 'cerebras':
        return {
          providerOptions: {
            cerebras: {
              reasoningEffort: 'none',
            },
          },
        }
      default:
        // chatgpt, deepseek, groq, ollama — portable 'none'
        return { reasoning: 'none' }
    }
  }

  // Provider-specific paths for low/medium/high
  switch (normalized) {
    case 'gemini': {
      // Route through geminiThinkingConfig to avoid SDK mis-mapping
      // (Gemma 4, 3 Pro family quirks)
      const providerOptions = buildThinkingProviderOptions(modelId, effectiveLevel)
      return Object.keys(providerOptions).length > 0
        ? { providerOptions }
        : { reasoning: effectiveLevel }
    }

    case 'openrouter':
      return {
        providerOptions: {
          openrouter: {
            reasoning: { effort: effectiveLevel },
          },
        },
      }

    case 'cerebras':
      return {
        providerOptions: {
          cerebras: {
            reasoningEffort: effectiveLevel,
          },
        },
      }

    default:
      // Portable AI SDK reasoning for chatgpt, deepseek, groq, ollama
      return { reasoning: effectiveLevel }
  }
}

// ---------------------------------------------------------------------------
// Effective level resolution (null-sentinel → settings default)
// ---------------------------------------------------------------------------

/**
 * Resolve the effective reasoning level from a session's value (which may be
 * `null` — the sentinel meaning "use the global default") and the user's
 * settings. This function is called at read time, not at session-creation time,
 * so that a user whose saved default is `'high'` sees it even if the chat store
 * module was imported before `loadSettings()` completed.
 *
 * @param {string | null | undefined} sessionLevel
 * @param {object | null | undefined} settings
 * @returns {string}
 */
export function effectiveReasoningLevel(sessionLevel, settings) {
  if (sessionLevel != null) return normalizeChatReasoningLevel(sessionLevel)
  return normalizeChatReasoningLevel(settings?.chat?.defaultReasoningLevel)
}
