// @ts-nocheck
/**
 * Gemini Thinking Configuration Utility
 *
 * Maps UI-level thinking preference ('minimal' | 'medium' | 'high') to the correct
 * API parameter for each Gemini model family:
 *
 * - Gemini 2.5 series  → thinkingBudget (integer)
 * - Gemini 3/3.1 Flash & Flash-Lite → thinkingLevel ('minimal' | 'medium' | 'high' | 'low')
 * - Gemini 3 Pro       → thinkingLevel ('medium' | 'high') — no 'minimal' support
 * - Gemma 4            → thinkingLevel ('minimal' | 'high') — no 'medium' support
 * - Other models       → no thinkingConfig (ignored)
 *
 * UI mapping per model family:
 * ┌─────────┬──────────────────┬──────────────────────┬───────────────┬──────────┐
 * │ UI      │ Gemini 2.5       │ Gemini 3 Flash/Lite  │ Gemini 3 Pro  │ Gemma 4  │
 * ├─────────┼──────────────────┼──────────────────────┼───────────────┼──────────┤
 * │ Minimal │ thinkingBudget:0 │ 'minimal'            │ 'medium' ↑    │ 'minimal'│
 * │ Medium  │ thinkingBudget:  │ 'medium'             │ 'medium'      │ 'minimal'↓│
 * │         │   8000           │                      │               │          │
 * │ High    │ thinkingBudget:  │ 'high'               │ 'high'        │ 'high'   │
 * │         │   -1 (dynamic)   │                      │               │          │
 * └─────────┴──────────────────┴──────────────────────┴───────────────┴──────────┘
 */

/**
 * Detects the Gemini model family from a model name string.
 * @param {string} modelName
 * @returns {'gemma4' | 'gemini25' | 'gemini3pro' | 'gemini3' | 'other'}
 */
function detectModelFamily(modelName) {
  if (!modelName) return 'other'
  const lower = modelName.toLowerCase()

  // Gemma 4 (gemma-4-*)
  if (lower.includes('gemma')) return 'gemma4'

  // Gemini 2.5 series (gemini-2.5-*)
  if (lower.includes('gemini-2.5')) return 'gemini25'

  // Gemini 3 Pro — must check before generic gemini-3
  if (
    lower.includes('gemini-3-pro') ||
    lower.includes('gemini-3.1-pro') ||
    lower.includes('gemini-3.0-pro')
  ) {
    return 'gemini3pro'
  }

  // Gemini 3 / 3.1 Flash, Flash-Lite, etc.
  if (lower.includes('gemini-3')) return 'gemini3'

  return 'other'
}

/**
 * Builds the providerOptions object for Gemini thinking configuration.
 *
 * @param {string} modelName - The full model name (e.g. 'gemini-3-flash-preview')
 * @param {'minimal' | 'medium' | 'high'} uiLevel - The level chosen by the user in Settings
 * @returns {object} providerOptions to spread into generateText / streamText calls,
 *                   or an empty object if this model doesn't support thinking config.
 */
export function buildThinkingProviderOptions(modelName, uiLevel) {
  const family = detectModelFamily(modelName)

  if (family === 'other') {
    // Model doesn't support thinkingConfig — omit entirely to avoid API errors
    return {}
  }

  let thinkingConfig = null

  switch (family) {
    case 'gemini25': {
      // Gemini 2.5 uses thinkingBudget (integer tokens)
      const budgetMap = {
        minimal: 0,      // disable thinking
        medium: 8000,    // moderate reasoning
        high: -1,        // dynamic / auto (model decides)
      }
      thinkingConfig = { thinkingBudget: budgetMap[uiLevel] ?? -1 }
      break
    }

    case 'gemini3pro': {
      // Gemini 3 Pro only supports 'medium' and 'high' (no 'minimal')
      // UI Minimal → map UP to 'medium'
      const levelMap = {
        minimal: 'medium', // mapped up — Pro doesn't support minimal
        medium: 'medium',
        high: 'high',
      }
      thinkingConfig = { thinkingLevel: levelMap[uiLevel] ?? 'high' }
      break
    }

    case 'gemini3': {
      // Gemini 3/3.1 Flash & Flash-Lite support all 4 levels
      const levelMap = {
        minimal: 'minimal',
        medium: 'medium',
        high: 'high',
      }
      thinkingConfig = { thinkingLevel: levelMap[uiLevel] ?? 'high' }
      break
    }

    case 'gemma4': {
      // Gemma 4 only supports 'minimal' and 'high'
      // UI Medium → map DOWN to 'minimal'
      const levelMap = {
        minimal: 'minimal',
        medium: 'minimal', // mapped down — Gemma has no 'medium'
        high: 'high',
      }
      thinkingConfig = { thinkingLevel: levelMap[uiLevel] ?? 'high' }
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

/**
 * Gets the effective thinking level for a given model.
 * Useful for displaying the actual API value in UI tooltips.
 *
 * @param {string} modelName
 * @param {'minimal' | 'medium' | 'high'} uiLevel
 * @returns {string} Human-readable effective level description
 */
export function getEffectiveThinkingDescription(modelName, uiLevel) {
  const family = detectModelFamily(modelName)

  if (family === 'other') return 'Not supported'

  if (family === 'gemini25') {
    const map = { minimal: 'Disabled (0)', medium: 'Budget: 8000', high: 'Dynamic (auto)' }
    return map[uiLevel] ?? 'Dynamic (auto)'
  }

  if (family === 'gemini3pro') {
    if (uiLevel === 'minimal') return 'Medium (min for Pro)'
    return uiLevel.charAt(0).toUpperCase() + uiLevel.slice(1)
  }

  if (family === 'gemma4') {
    if (uiLevel === 'medium') return 'Minimal (max for Gemma)'
    return uiLevel.charAt(0).toUpperCase() + uiLevel.slice(1)
  }

  return uiLevel.charAt(0).toUpperCase() + uiLevel.slice(1)
}
