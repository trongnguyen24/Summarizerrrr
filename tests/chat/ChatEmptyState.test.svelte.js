// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushSync, mount } from 'svelte'
import ChatEmptyState from '../../src/components/chat/ChatEmptyState.svelte'

vi.mock('svelte-i18n', () => import('../stubs/svelteI18nStub.js'))

// `pinned` decides what the empty chat screen offers, so the store only needs
// to supply the user-skill overrides the service merges over the built-ins.
vi.mock('@/stores/settingsStore.svelte.js', () => ({
  settings: { chatUserSkills: [] },
}))

describe('ChatEmptyState', () => {
  it('offers only pinned skills and hands the picked one back', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onSelectSkill = vi.fn()

    mount(ChatEmptyState, { target: host, props: { onSelectSkill } })
    flushSync()

    const labels = Array.from(host.querySelectorAll('button')).map((button) =>
      button.textContent.trim(),
    )
    // The three built-ins carrying `pinned: true`, alphabetically.
    expect(labels).toEqual(['Analyze', 'Explain', 'Summarize'])
    // A non-pinned built-in must not be surfaced here.
    expect(labels).not.toContain('Translate')

    host.querySelector('button').click()
    expect(onSelectSkill).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'analyze' }),
    )

    host.remove()
  })
})
