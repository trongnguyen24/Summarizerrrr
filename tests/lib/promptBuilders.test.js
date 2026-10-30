/**
 * Regression guard for issue #77: v3 removed the Basic/Advanced toggle, so
 * `isSummaryAdvancedMode` stays false for Gemini users. Custom prompts must
 * apply on their per-item selection alone, not on that vestigial flag.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSettings = vi.hoisted(() => ({}))

vi.mock('@/lib/config/settingsPort.js', () => ({ settings: mockSettings }))

import { promptBuilders } from '@/lib/prompts/builders/index.js'

const cases = [
  ['youtube', 'youtube'],
  ['general', 'web'],
  ['chapter', 'chapter'],
  ['selectedText', 'selectedText'],
  ['courseSummary', 'courseSummary'],
  ['courseConcepts', 'courseConcepts'],
]

describe('promptBuilders custom prompts', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockSettings)) delete mockSettings[key]
    mockSettings.isSummaryAdvancedMode = false
  })

  it.each(cases)('%s uses the custom prompt when selected', (type, prefix) => {
    mockSettings[`${prefix}PromptSelection`] = true
    mockSettings[`${prefix}CustomPromptContent`] = 'CUSTOM __LANG__: __CONTENT__'
    mockSettings[`${prefix}CustomSystemInstructionContent`] = 'CUSTOM SYSTEM'

    const { systemInstruction, userPrompt } = promptBuilders[type].buildPrompt(
      'body',
      'English',
      'long',
      'expert'
    )

    expect(systemInstruction).toBe('CUSTOM SYSTEM')
    expect(userPrompt).toBe('CUSTOM English: body')
  })

  it.each(cases)('%s keeps the default prompt when not selected', (type, prefix) => {
    mockSettings[`${prefix}PromptSelection`] = false
    mockSettings[`${prefix}CustomPromptContent`] = 'CUSTOM __CONTENT__'

    const { userPrompt } = promptBuilders[type].buildPrompt(
      'body',
      'English',
      'long',
      'expert'
    )

    expect(userPrompt).not.toContain('CUSTOM')
  })
})
