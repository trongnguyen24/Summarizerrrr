import { describe, it, expect } from 'vitest'
import { getVisibleActions } from '@/lib/config/actionConstants.js'
import { VALID_SETTING_KEYS } from '@/lib/config/settingsSchema.js'

const keys = (opts) => getVisibleActions(opts).map((a) => a.key)

describe('getVisibleActions', () => {
  it('shows only the generic actions on a plain web page', () => {
    expect(keys({})).toEqual(['analyze', 'explain', 'debate'])
  })

  it('adds page-specific actions for YouTube and courses', () => {
    expect(keys({ isYouTube: true })).toEqual([
      'analyze',
      'explain',
      'debate',
      'chapters',
      'comments',
    ])
    expect(keys({ isCourse: true })).toContain('courseConcepts')
  })

  it('drops actions the user hid', () => {
    expect(
      keys({ isYouTube: true, hidden: ['analyze', 'debate', 'comments'] }),
    ).toEqual(['explain', 'chapters'])
  })

  it('tolerates a missing hidden list', () => {
    expect(keys({ hidden: undefined })).toEqual(['analyze', 'explain', 'debate'])
  })

  it('persists through the settings schema', () => {
    expect(VALID_SETTING_KEYS).toContain('hiddenActionButtons')
  })
})
