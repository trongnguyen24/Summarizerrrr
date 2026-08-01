import { describe, expect, it } from 'vitest'
import {
  REASONING_CHOICES,
  TASK_REASONING_CHOICES,
  normalizeChatReasoningLevel,
  normalizeTaskReasoningLevel,
  getChatReasoningOptions,
  buildReasoningRequestOptions,
  effectiveReasoningLevel,
} from '@/lib/api/reasoningConfig.js'

// ---------------------------------------------------------------------------
// normalizeChatReasoningLevel
// ---------------------------------------------------------------------------

describe('normalizeChatReasoningLevel', () => {
  it.each([
    ['provider-default', 'provider-default'],
    ['low', 'low'],
    ['medium', 'medium'],
    ['high', 'high'],
    ['off', 'off'],
  ])('keeps valid level %s', (input, expected) => {
    expect(normalizeChatReasoningLevel(input)).toBe(expected)
  })

  it.each([
    [null, 'provider-default'],
    [undefined, 'provider-default'],
    ['', 'provider-default'],
    ['xhigh', 'provider-default'],
    ['none', 'provider-default'],
    ['minimal', 'provider-default'],
    [42, 'provider-default'],
  ])('normalizes invalid value %j to provider-default', (input, expected) => {
    expect(normalizeChatReasoningLevel(input)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// normalizeTaskReasoningLevel
// ---------------------------------------------------------------------------

describe('normalizeTaskReasoningLevel', () => {
  it.each([
    ['off', 'off'],
    ['low', 'low'],
    ['medium', 'medium'],
    ['high', 'high'],
    ['provider-default', 'provider-default'],
  ])('keeps valid level %s', (input, expected) => {
    expect(normalizeTaskReasoningLevel(input)).toBe(expected)
  })

  it.each([
    [null, 'off'],
    [undefined, 'off'],
    ['', 'off'],
    ['xhigh', 'off'],
    ['none', 'off'],
    ['minimal', 'off'],
    [42, 'off'],
  ])('normalizes invalid value %j to off', (input, expected) => {
    expect(normalizeTaskReasoningLevel(input)).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// TASK_REASONING_CHOICES
// ---------------------------------------------------------------------------

describe('TASK_REASONING_CHOICES', () => {
  it('has exactly 3 choices: off, low, medium', () => {
    expect(TASK_REASONING_CHOICES).toHaveLength(3)
    expect(TASK_REASONING_CHOICES.map((c) => c.value)).toEqual(['off', 'low', 'medium'])
  })

  it('is frozen', () => {
    expect(Object.isFrozen(TASK_REASONING_CHOICES)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getChatReasoningOptions
// ---------------------------------------------------------------------------

describe('getChatReasoningOptions', () => {
  const fullProviders = [
    'gemini',
    'chatgpt',
    'deepseek',
    'groq',
    'ollama',
    'openrouter',
    'cerebras',
  ]

  it.each(fullProviders)('returns all four choices for %s', (providerId) => {
    const options = getChatReasoningOptions(providerId)
    expect(options).toEqual(REASONING_CHOICES)
    expect(options).toHaveLength(4)
  })

  it('returns all four choices for geminiAdvanced (normalized to gemini)', () => {
    expect(getChatReasoningOptions('geminiAdvanced')).toEqual(REASONING_CHOICES)
  })

  it('returns all four choices for openai (normalized to chatgpt)', () => {
    expect(getChatReasoningOptions('openai')).toEqual(REASONING_CHOICES)
  })

  it('returns Auto-only for lmstudio', () => {
    const options = getChatReasoningOptions('lmstudio')
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('provider-default')
  })

  it('returns Auto-only for openaiCompatible template', () => {
    const options = getChatReasoningOptions('openaiCompatible')
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('provider-default')
  })

  it('returns Auto-only for nvidia (thinking is per-model on NIM)', () => {
    const options = getChatReasoningOptions('nvidia')
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('provider-default')
  })

  it('returns Auto-only for dynamic openai-compatible profile ids', () => {
    const options = getChatReasoningOptions('openai-compatible-abc-123')
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('provider-default')
  })

  it('returns Auto-only for openai-compatible-legacy', () => {
    const options = getChatReasoningOptions('openai-compatible-legacy')
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('provider-default')
  })

  it('returns Auto-only for completely unknown providers', () => {
    const options = getChatReasoningOptions('some-future-provider')
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('provider-default')
  })

  it('accepts and ignores modelId parameter for V1', () => {
    expect(getChatReasoningOptions('gemini', 'gemini-3-flash-preview')).toEqual(REASONING_CHOICES)
    expect(getChatReasoningOptions('lmstudio', 'some-model')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// buildReasoningRequestOptions
// ---------------------------------------------------------------------------

describe('buildReasoningRequestOptions', () => {
  describe('portable reasoning providers', () => {
    const portableProviders = ['chatgpt', 'deepseek', 'groq', 'ollama']

    it.each(portableProviders)('returns { reasoning: level } for %s with non-Auto level', (providerId) => {
      expect(buildReasoningRequestOptions(providerId, 'high')).toEqual({ reasoning: 'high' })
      expect(buildReasoningRequestOptions(providerId, 'medium')).toEqual({ reasoning: 'medium' })
      expect(buildReasoningRequestOptions(providerId, 'low')).toEqual({ reasoning: 'low' })
    })

    it.each(portableProviders)('returns {} for %s with Auto', (providerId) => {
      expect(buildReasoningRequestOptions(providerId, 'provider-default')).toEqual({})
    })

    it.each(portableProviders)('returns { reasoning: "none" } for %s with off', (providerId) => {
      expect(buildReasoningRequestOptions(providerId, 'off')).toEqual({ reasoning: 'none' })
    })
  })

  describe('gemini with modelId', () => {
    it('gemini + off + gemini-2.5-flash → thinkingBudget: 0', () => {
      const result = buildReasoningRequestOptions('gemini', 'off', 'gemini-2.5-flash-preview')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
      })
    })

    it('gemini + off + gemini-3-flash → thinkingLevel: minimal', () => {
      const result = buildReasoningRequestOptions('gemini', 'off', 'gemini-3-flash-preview')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
        },
      })
    })

    it('gemini + off + gemini-3-pro → thinkingLevel: medium (mapped up)', () => {
      const result = buildReasoningRequestOptions('gemini', 'off', 'gemini-3-pro-preview')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingLevel: 'medium' },
          },
        },
      })
    })

    it('gemini + off + gemma-4-26b → thinkingLevel: minimal', () => {
      const result = buildReasoningRequestOptions('gemini', 'off', 'gemma-4-26b-a4b-it')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingLevel: 'minimal' },
          },
        },
      })
    })

    it('gemini + low + gemini-2.5-flash → thinkingBudget: 2048', () => {
      const result = buildReasoningRequestOptions('gemini', 'low', 'gemini-2.5-flash-preview')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 2048 },
          },
        },
      })
    })

    it('gemini + low + gemini-3-flash → thinkingLevel: low', () => {
      const result = buildReasoningRequestOptions('gemini', 'low', 'gemini-3-flash-preview')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingLevel: 'low' },
          },
        },
      })
    })

    it('gemini + medium + gemini-2.5-flash → thinkingBudget: 8000', () => {
      const result = buildReasoningRequestOptions('gemini', 'medium', 'gemini-2.5-flash-preview')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 8000 },
          },
        },
      })
    })

    it('gemini + high + gemma-4-26b → thinkingLevel: high', () => {
      const result = buildReasoningRequestOptions('gemini', 'high', 'gemma-4-26b-a4b-it')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingLevel: 'high' },
          },
        },
      })
    })

    it('gemini + off + unknown-model → portable reasoning "none"', () => {
      // No thinkingConfig is possible without a known family, but Off must still
      // be expressed — sending nothing would leave thinking at the model default.
      const result = buildReasoningRequestOptions('gemini', 'off', 'some-unknown-model')
      expect(result).toEqual({ reasoning: 'none' })
    })

    it('gemini + off + null modelId → portable reasoning "none"', () => {
      const result = buildReasoningRequestOptions('gemini', 'off', null)
      expect(result).toEqual({ reasoning: 'none' })
    })
  })

  describe('geminiAdvanced / openai normalization', () => {
    it('geminiAdvanced routes through Gemini path', () => {
      const result = buildReasoningRequestOptions('geminiAdvanced', 'off', 'gemini-2.5-flash-preview')
      expect(result).toEqual({
        providerOptions: {
          google: {
            thinkingConfig: { thinkingBudget: 0 },
          },
        },
      })
    })

    it('openai maps to portable reasoning (via chatgpt)', () => {
      expect(buildReasoningRequestOptions('openai', 'medium')).toEqual({ reasoning: 'medium' })
    })
  })

  describe('OpenRouter provider-specific options', () => {
    it('returns native reasoning.effort object for non-Auto', () => {
      expect(buildReasoningRequestOptions('openrouter', 'high')).toEqual({
        providerOptions: {
          openrouter: {
            reasoning: { effort: 'high' },
          },
        },
      })
    })

    it('returns effort: none for off', () => {
      expect(buildReasoningRequestOptions('openrouter', 'off')).toEqual({
        providerOptions: {
          openrouter: {
            reasoning: { effort: 'none' },
          },
        },
      })
    })

    it('returns {} for Auto', () => {
      expect(buildReasoningRequestOptions('openrouter', 'provider-default')).toEqual({})
    })
  })

  describe('Cerebras provider-specific options', () => {
    it('returns native reasoningEffort for non-Auto', () => {
      expect(buildReasoningRequestOptions('cerebras', 'medium')).toEqual({
        providerOptions: {
          cerebras: {
            reasoningEffort: 'medium',
          },
        },
      })
    })

    it('returns reasoningEffort: none for off', () => {
      expect(buildReasoningRequestOptions('cerebras', 'off')).toEqual({
        providerOptions: {
          cerebras: {
            reasoningEffort: 'none',
          },
        },
      })
    })

    it('returns {} for Auto', () => {
      expect(buildReasoningRequestOptions('cerebras', 'provider-default')).toEqual({})
    })
  })

  describe('Auto-only and unsupported providers', () => {
    it('returns {} for openaiCompatible regardless of level', () => {
      expect(buildReasoningRequestOptions('openaiCompatible', 'high')).toEqual({})
      expect(buildReasoningRequestOptions('openaiCompatible', 'provider-default')).toEqual({})
      expect(buildReasoningRequestOptions('openaiCompatible', 'off')).toEqual({})
    })

    it('returns {} for dynamic OpenAI-compatible profile id', () => {
      expect(buildReasoningRequestOptions('openai-compatible-some-uuid', 'high')).toEqual({})
    })

    it('returns {} for lmstudio regardless of level', () => {
      expect(buildReasoningRequestOptions('lmstudio', 'high')).toEqual({})
      expect(buildReasoningRequestOptions('lmstudio', 'off')).toEqual({})
    })

    it('returns {} for nvidia regardless of level', () => {
      // NIM would 400 on a portable `reasoning`/`reasoningEffort` for most of
      // its ~70-model catalog, so nothing must be sent.
      expect(buildReasoningRequestOptions('nvidia', 'high')).toEqual({})
      expect(buildReasoningRequestOptions('nvidia', 'provider-default')).toEqual({})
      expect(buildReasoningRequestOptions('nvidia', 'off')).toEqual({})
    })

    it('returns {} for unknown providers', () => {
      expect(buildReasoningRequestOptions('future-provider', 'high')).toEqual({})
    })
  })

  describe('invalid level normalization', () => {
    it('treats invalid level as Auto (returns {})', () => {
      expect(buildReasoningRequestOptions('gemini', 'xhigh')).toEqual({})
      expect(buildReasoningRequestOptions('gemini', null)).toEqual({})
      expect(buildReasoningRequestOptions('gemini', undefined)).toEqual({})
    })
  })
})

// ---------------------------------------------------------------------------
// effectiveReasoningLevel
// ---------------------------------------------------------------------------

describe('effectiveReasoningLevel', () => {
  it('uses explicit session value when present', () => {
    expect(effectiveReasoningLevel('high', { chat: { defaultReasoningLevel: 'low' } })).toBe('high')
  })

  it('falls back to settings default when session value is null', () => {
    expect(effectiveReasoningLevel(null, { chat: { defaultReasoningLevel: 'high' } })).toBe('high')
  })

  it('returns provider-default when both session and settings are null', () => {
    expect(effectiveReasoningLevel(null, null)).toBe('provider-default')
  })

  it('returns provider-default when settings has no chat key', () => {
    expect(effectiveReasoningLevel(null, {})).toBe('provider-default')
  })

  it('returns provider-default when session value is undefined', () => {
    expect(effectiveReasoningLevel(undefined, { chat: { defaultReasoningLevel: 'medium' } })).toBe('medium')
  })

  it('normalizes invalid session values', () => {
    expect(effectiveReasoningLevel('xhigh', {})).toBe('provider-default')
  })

  it('normalizes invalid settings default', () => {
    expect(effectiveReasoningLevel(null, { chat: { defaultReasoningLevel: 'invalid' } })).toBe('provider-default')
  })
})

describe('task reasoning: Off on unrecognized Gemini model families', () => {
  it('falls back to portable reasoning "none" instead of sending nothing', () => {
    // detectModelFamily only knows gemma*, gemini-2.5*, gemini-3*. Anything else
    // (gemini-flash-latest, gemini-2.0-flash, a future gemini-4) returned {} before,
    // which left thinking at the model default — the opposite of Off.
    for (const model of ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-4-flash']) {
      expect(buildReasoningRequestOptions('gemini', 'off', model)).toEqual({ reasoning: 'none' })
    }
  })

  it('still uses the family-aware path for known families', () => {
    expect(buildReasoningRequestOptions('gemini', 'off', 'gemini-2.5-flash')).toEqual({
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
    })
    expect(buildReasoningRequestOptions('gemini', 'off', 'gemini-3-flash-preview')).toEqual({
      providerOptions: { google: { thinkingConfig: { thinkingLevel: 'minimal' } } },
    })
    expect(buildReasoningRequestOptions('gemini', 'off', 'gemini-3-pro-preview')).toEqual({
      providerOptions: { google: { thinkingConfig: { thinkingLevel: 'medium' } } },
    })
  })
})
