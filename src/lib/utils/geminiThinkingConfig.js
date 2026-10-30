// @ts-nocheck
/**
 * Gemini Thinking Configuration Utility
 *
 * Maps UI-level thinking preference ('off' | 'minimal' | 'low' | 'medium' | 'high')
 * to the correct API parameter for each Gemini model family:
 *
 * - Gemini 2.5 series  → thinkingBudget (integer)
 * - Gemini 3+ Flash & Flash-Lite → thinkingLevel ('minimal' | 'low' | 'medium' | 'high')
 * - Gemini 3+ Pro      → thinkingLevel ('medium' | 'high') — no 'minimal'/'low' support
 * - Gemma 4+           → thinkingLevel ('minimal' | 'high') — no 'low'/'medium' support
 * - Other models       → no thinkingConfig (ignored)
 *
 * 'off' is aliased to 'minimal' at the top of buildThinkingProviderOptions.
 *
 * UI mapping per model family:
 * ┌─────────┬──────────────────┬──────────────────────┬───────────────┬──────────┐
 * │ UI      │ Gemini 2.5       │ Gemini 3 Flash/Lite  │ Gemini 3 Pro  │ Gemma 4  │
 * ├─────────┼──────────────────┼──────────────────────┼───────────────┼──────────┤
 * │ Off     │ thinkingBudget:0 │ 'minimal'            │ 'medium' ↑    │ 'minimal'│
 * │ Minimal │ thinkingBudget:0 │ 'minimal'            │ 'medium' ↑    │ 'minimal'│
 * │ Low     │ thinkingBudget:  │ 'low'                │ 'medium' ↑    │ 'minimal'↓│
 * │         │   2048           │                      │               │          │
 * │ Medium  │ thinkingBudget:  │ 'medium'             │ 'medium'      │ 'minimal'↓│
 * │         │   8000           │                      │               │          │
 * │ High    │ thinkingBudget:  │ 'high'               │ 'high'        │ 'high'   │
 * │         │   -1 (dynamic)   │                      │               │          │
 * └─────────┴──────────────────┴──────────────────────┴───────────────┴──────────┘
 */

// `gemini-<version>-…` — the version is parsed, not listed, so a new Gemini
// generation lands in the right family without touching this file.
const GEMINI_VERSIONED = /^gemini-(\d+)(?:\.(\d+))?-(.*)$/
// Google's self-updating aliases always point at the current generation.
const GEMINI_ALIAS = /^gemini-(flash|flash-lite|pro)-latest$/
const GEMMA_VERSIONED = /^gemma-(\d+)/

/**
 * Detects the Gemini model family from a model name string.
 *
 * - 2.5                      → budget-based thinking
 * - 3 and newer, Pro         → level-based, Pro quirks ('medium'/'high' only)
 * - 3 and newer, anything else (Flash, Flash-Lite, …) → level-based, all levels
 * - `-latest` aliases        → same as the generation they alias
 * - Gemma 4 and newer        → Gemma quirks; older Gemma has no thinking
 * - anything else (2.0, 1.5, unknown) → no thinking config
 *
 * @param {string} modelName
 * @returns {'gemma4' | 'gemini25' | 'gemini3pro' | 'gemini3' | 'other'}
 */
function detectModelFamily(modelName) {
  if (!modelName) return 'other'
  const lower = modelName.toLowerCase().replace(/^models\//, '')

  const gemma = GEMMA_VERSIONED.exec(lower)
  if (gemma) return Number(gemma[1]) >= 4 ? 'gemma4' : 'other'

  const alias = GEMINI_ALIAS.exec(lower)
  if (alias) return alias[1] === 'pro' ? 'gemini3pro' : 'gemini3'

  const versioned = GEMINI_VERSIONED.exec(lower)
  if (!versioned) return 'other'

  const major = Number(versioned[1])
  const minor = Number(versioned[2] ?? 0)
  const variant = versioned[3]

  if (major >= 3) {
    return /(^|-)pro(-|$)/.test(variant) ? 'gemini3pro' : 'gemini3'
  }
  if (major === 2 && minor === 5) return 'gemini25'
  return 'other'
}

/**
 * Builds the providerOptions object for Gemini thinking configuration.
 *
 * @param {string} modelName - The full model name (e.g. 'gemini-3-flash-preview')
 * @param {'off' | 'minimal' | 'low' | 'medium' | 'high'} uiLevel - The level chosen by the user
 * @returns {object} providerOptions to spread into generateText / streamText calls,
 *                   or an empty object if this model doesn't support thinking config.
 */
export function buildThinkingProviderOptions(modelName, uiLevel) {
  const family = detectModelFamily(modelName)

  if (family === 'other') {
    // Model doesn't support thinkingConfig — omit entirely to avoid API errors
    return {}
  }

  // Normalize 'off' → 'minimal' for backward compatibility
  const effectiveLevel = uiLevel === 'off' ? 'minimal' : uiLevel

  let thinkingConfig = null

  switch (family) {
    case 'gemini25': {
      // Gemini 2.5 uses thinkingBudget (integer tokens)
      const budgetMap = {
        minimal: 0,      // disable thinking
        low: 2048,       // light reasoning
        medium: 8000,    // moderate reasoning
        high: -1,        // dynamic / auto (model decides)
      }
      thinkingConfig = { thinkingBudget: budgetMap[effectiveLevel] ?? -1 }
      break
    }

    case 'gemini3pro': {
      // Gemini 3 Pro only supports 'medium' and 'high' (no 'minimal')
      // UI Minimal → map UP to 'medium'
      const levelMap = {
        minimal: 'medium', // mapped up — Pro doesn't support minimal
        low: 'medium',     // mapped up — Pro doesn't support low
        medium: 'medium',
        high: 'high',
      }
      thinkingConfig = { thinkingLevel: levelMap[effectiveLevel] ?? 'high' }
      break
    }

    case 'gemini3': {
      // Gemini 3/3.1 Flash & Flash-Lite support all levels
      const levelMap = {
        minimal: 'minimal',
        low: 'low',
        medium: 'medium',
        high: 'high',
      }
      thinkingConfig = { thinkingLevel: levelMap[effectiveLevel] ?? 'high' }
      break
    }

    case 'gemma4': {
      // Gemma 4 only supports 'minimal' and 'high'
      // UI Medium → map DOWN to 'minimal'
      const levelMap = {
        minimal: 'minimal',
        low: 'minimal',     // mapped down — Gemma has no 'low'
        medium: 'minimal',  // mapped down — Gemma has no 'medium'
        high: 'high',
      }
      thinkingConfig = { thinkingLevel: levelMap[effectiveLevel] ?? 'high' }
      break
    }

    default:
      return {}
  }

  return {
    google: {
      thinkingConfig,
    },
  }
}


