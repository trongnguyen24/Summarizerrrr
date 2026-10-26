// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushSync, mount } from 'svelte'
import SkillPicker from '../../../src/components/chat/SkillPicker.svelte'

HTMLElement.prototype.scrollIntoView ||= vi.fn()

describe('SkillPicker', () => {
  it('filters skills by name and selects the active result with Enter', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onSelect = vi.fn()
    const onClose = vi.fn()

    const component = mount(SkillPicker, {
      target: host,
      props: {
        open: true,
        query: 'ana',
        skills: [
          { id: 'summarize', name: 'Summarize', pinned: true },
          { id: 'analyze', name: 'Analyze', pinned: false },
        ],
        onSelect,
        onClose,
      },
    })

    flushSync()
    expect(host.textContent).toContain('Analyze')
    expect(host.textContent).not.toContain('Summarize')

    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    expect(component.handleKeyDown(event)).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'analyze' }))
    expect(onClose).toHaveBeenCalled()

    host.remove()
  })

  it('consumes Enter when no skill matches', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const component = mount(SkillPicker, {
      target: host,
      props: {
        open: true,
        query: 'missing',
        skills: [{ id: 'summarize', name: 'Summarize' }],
      },
    })

    flushSync()
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    expect(component.handleKeyDown(event)).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(host.textContent).toContain('No matching skills.')

    host.remove()
  })
})
