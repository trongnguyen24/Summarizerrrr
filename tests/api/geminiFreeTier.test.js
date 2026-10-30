import { describe, expect, it } from 'vitest'
import {
  getGeminiFreeTierQuota,
  isNonTextGeminiModel,
  sortFreeTierFirst,
  toModelItem,
} from '../../src/lib/providers/geminiFreeTier.js'
import {
  isModelUnavailableError,
  isOverloadError,
  isQuotaError,
} from '../../src/lib/utils/geminiAutoFallback.js'

describe('getGeminiFreeTierQuota', () => {
  it('matches the longest prefix so lite models keep their own quota', () => {
    expect(getGeminiFreeTierQuota('gemini-3.5-flash-lite')).toEqual({
      rpm: 15,
      tpm: 250_000,
      rpd: 500,
    })
    expect(getGeminiFreeTierQuota('gemini-3.5-flash')).toEqual({
      rpm: 5,
      tpm: 250_000,
      rpd: 20,
    })
  })

  it('covers the newest flash families (issue #77)', () => {
    expect(getGeminiFreeTierQuota('gemini-3.8-flash')).toEqual({
      rpm: 5,
      tpm: 250_000,
      rpd: 20,
    })
    expect(getGeminiFreeTierQuota('gemini-3.6-flash')).not.toBeNull()
  })

  it('resolves dated and preview variants through their family prefix', () => {
    expect(getGeminiFreeTierQuota('gemini-3.1-flash-lite-preview')).toMatchObject({
      rpd: 500,
    })
    expect(getGeminiFreeTierQuota('gemini-2.5-flash-001')).toMatchObject({
      rpd: 20,
    })
    expect(getGeminiFreeTierQuota('GEMINI-3-FLASH-PREVIEW')).toMatchObject({
      rpm: 5,
    })
  })

  it('returns null for models with no free-tier quota', () => {
    expect(getGeminiFreeTierQuota('gemini-2.5-pro')).toBeNull()
    expect(getGeminiFreeTierQuota('gemini-3.1-pro-preview')).toBeNull()
    expect(getGeminiFreeTierQuota('gemini-2.0-flash-001')).toBeNull()
    expect(getGeminiFreeTierQuota('deep-research-pro-preview-12-2025')).toBeNull()
    expect(getGeminiFreeTierQuota('gemini-4-argon')).toBeNull()
    expect(getGeminiFreeTierQuota('gemini-omni-1.1-flash')).toBeNull()
  })

  it('returns null for unknown or empty ids instead of guessing', () => {
    expect(getGeminiFreeTierQuota('gemini-9-ultra')).toBeNull()
    expect(getGeminiFreeTierQuota('')).toBeNull()
    expect(getGeminiFreeTierQuota(undefined)).toBeNull()
  })
})

describe('isNonTextGeminiModel', () => {
  it('flags speech, image, audio, robotics and computer-use models', () => {
    for (const id of [
      'gemini-2.5-flash-preview-tts',
      'gemini-3-pro-image',
      'gemini-3.1-flash-image-preview',
      'imagen-4.0-generate-001',
      'veo-3.0-generate-preview',
      'gemini-embedding-001',
      'gemini-2.5-computer-use-preview-10-2025',
      'gemini-robotics-er-1.5-preview',
      'gemini-2.5-flash-native-audio-dialog',
      'gemini-3-flash-live',
    ]) {
      expect(isNonTextGeminiModel(id), id).toBe(true)
    }
  })

  it('keeps plain text models', () => {
    for (const id of [
      'gemini-3-flash-preview',
      'gemini-2.5-pro',
      'gemma-4-26b-it',
      'antigravity-preview-05-2026',
    ]) {
      expect(isNonTextGeminiModel(id), id).toBe(false)
    }
  })
})

describe('sortFreeTierFirst', () => {
  it('moves free-tier models to the front, keeping order inside each group', () => {
    expect(
      sortFreeTierFirst('gemini', [
        'gemini-2.5-pro',
        'gemini-3-flash-preview',
        'gemini-3.1-pro-preview',
        'gemini-3.1-flash-lite',
      ]),
    ).toEqual([
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-2.5-pro',
      'gemini-3.1-pro-preview',
    ])
  })

  it('leaves other providers untouched', () => {
    const models = ['gpt-5.6', 'gpt-5.4-mini']
    expect(sortFreeTierFirst('chatgpt', models)).toBe(models)
  })
})

describe('isModelUnavailableError', () => {
  it('detects a model Google retired', () => {
    const byStatus = Object.assign(new Error('boom'), { status: 404 })
    const byMessage = new Error(
      'models/gemini-2.5-flash is not found for API version v1beta, or is not supported for generateContent'
    )
    const byCause = Object.assign(new Error('request failed'), {
      cause: Object.assign(new Error('NOT_FOUND'), { status: 404 }),
    })

    expect(isModelUnavailableError(byStatus)).toBe(true)
    expect(isModelUnavailableError(byMessage)).toBe(true)
    expect(isModelUnavailableError(byCause)).toBe(true)
  })

  it('stays out of the way of the other error paths', () => {
    const overload = Object.assign(new Error('The model is overloaded'), {
      status: 503,
    })
    const quota = Object.assign(new Error('RESOURCE_EXHAUSTED'), { status: 429 })

    expect(isModelUnavailableError(overload)).toBe(false)
    expect(isModelUnavailableError(quota)).toBe(false)
    expect(isModelUnavailableError(null)).toBe(false)
    // …and the reverse: a 404 must not read as overload or quota.
    const notFound = Object.assign(new Error('is not found'), { status: 404 })
    expect(isOverloadError(notFound)).toBe(false)
    expect(isQuotaError(notFound)).toBe(false)
  })
})

describe('toModelItem', () => {
  it('attaches a badge with a readable quota tooltip', () => {
    expect(toModelItem('gemini', 'gemini-3.1-flash-lite', 'Free')).toEqual({
      value: 'gemini-3.1-flash-lite',
      label: 'gemini-3.1-flash-lite',
      badge: 'Free',
      badgeTitle: '15 RPM · 250K TPM · 500 RPD',
    })
    expect(
      toModelItem('gemini', 'gemma-4-26b-it', 'Free').badgeTitle,
    ).toBe('30 RPM · 16K TPM · 14.4K RPD')
  })

  it('leaves paid and non-Gemini models unbadged', () => {
    expect(toModelItem('gemini', 'gemini-2.5-pro', 'Free')).toEqual({
      value: 'gemini-2.5-pro',
      label: 'gemini-2.5-pro',
    })
    expect(toModelItem('chatgpt', 'gemini-3-flash-preview', 'Free')).toEqual({
      value: 'gemini-3-flash-preview',
      label: 'gemini-3-flash-preview',
    })
  })
})
