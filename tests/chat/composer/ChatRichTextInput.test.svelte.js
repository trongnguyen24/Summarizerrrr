// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushSync } from 'svelte'
import { Editor } from '@tiptap/core'
import ChatRichTextInput from '../../../src/components/chat/ChatRichTextInput.svelte'

// Mock getClientRects and getBoundingClientRect for JSDOM ProseMirror compatibility
if (typeof window !== 'undefined') {
  Element.prototype.getClientRects = Element.prototype.getClientRects || function() { return [] }
  Element.prototype.getBoundingClientRect = Element.prototype.getBoundingClientRect || function() {
    return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }
  }
}

let shouldFailInit = false

vi.mock('@tiptap/core', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    Editor: class MockEditor extends original.Editor {
      constructor(config) {
        if (shouldFailInit) {
          throw new Error('Simulated editor construction failure')
        }
        super(config)
      }
    }
  }
})

describe('ChatRichTextInput Component', () => {
  beforeEach(() => {
    shouldFailInit = false
  })

  it('mounts successfully and exposes expected API methods', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const props = {
      value: 'Hello **world**',
      disabled: false,
      placeholder: 'Type a message...',
      onchange: vi.fn(),
      onsubmit: vi.fn(),
      onmentionchange: vi.fn(),
      oniniterror: vi.fn()
    }

    const component = mount(ChatRichTextInput, {
      target: host,
      props
    })
    
    flushSync()

    expect(component.focus).toBeTypeOf('function')
    expect(component.getMarkdown).toBeTypeOf('function')
    expect(component.insertMarkdown).toBeTypeOf('function')
    expect(component.deleteRange).toBeTypeOf('function')

    // Clean up
    host.remove()
  })

  it('inserts markdown content when empty', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const component = mount(ChatRichTextInput, {
      target: host,
      props: {
        value: ''
      }
    })

    flushSync()

    // Focus the editor to ensure cursor is positioned for appending
    component.focus()
    flushSync()

    // Insert more markdown
    component.insertMarkdown('Hello **world**')
    expect(component.getMarkdown()).toBe('Hello **world**')

    // Clean up
    host.remove()
  })

  it('opens the skill suggestion state for a slash query', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onskillchange = vi.fn()

    const component = mount(ChatRichTextInput, {
      target: host,
      props: {
        value: '',
        onskillchange,
      },
    })

    flushSync()
    component.focus()
    component.insertMarkdown('/sum')
    flushSync()

    expect(onskillchange).toHaveBeenCalledWith(expect.objectContaining({
      open: true,
      query: 'sum',
      range: expect.objectContaining({ from: 1, to: 5 }),
    }))

    host.remove()
  })

  it('prevents loop on external value updates', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const onchange = vi.fn()
    
    // In Svelte 5, to pass reactive props that can be mutated externally:
    let props = $state({
      value: 'Initial text',
      onchange
    })

    const component = mount(ChatRichTextInput, {
      target: host,
      props
    })

    flushSync()
    expect(component.getMarkdown()).toBe('Initial text')

    // Clear any initialization changes triggered during mount
    onchange.mockClear()

    // Modify the value prop externally via reactive state
    props.value = 'Updated text'
    flushSync()

    expect(component.getMarkdown()).toBe('Updated text')
    // Changing value prop from outside should NOT trigger onchange loop
    expect(onchange).not.toHaveBeenCalled()

    // Clean up
    host.remove()
  })

  it('triggers oniniterror on editor initialization failure', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const oniniterror = vi.fn()
    shouldFailInit = true

    mount(ChatRichTextInput, {
      target: host,
      props: {
        value: 'Testing failure',
        oniniterror
      }
    })

    flushSync()

    expect(oniniterror).toHaveBeenCalled()

    // Clean up
    host.remove()
  })

  it('locks and unlocks the editor with the disabled prop', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    // This is the mechanism the queued-send lock rides on: arming the queue
    // sets disabled, and cancelling it must give editing back.
    const props = $state({ value: 'queued question', disabled: true })

    mount(ChatRichTextInput, { target: host, props })
    flushSync()

    expect(host.querySelector('.tiptap').getAttribute('contenteditable')).toBe(
      'false',
    )

    props.disabled = false
    flushSync()

    expect(host.querySelector('.tiptap').getAttribute('contenteditable')).toBe(
      'true',
    )

    host.remove()
  })

  it('seeds the skill token from the skill prop', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    mount(ChatRichTextInput, {
      target: host,
      props: { value: '', skill: { skillId: 'explain', name: 'Explain' } },
    })

    flushSync()

    const token = host.querySelector('[data-skill-id="explain"]')
    expect(token).not.toBeNull()
    expect(token.textContent).toBe('/Explain')

    host.remove()
  })

  it('removes the token when the skill is cleared on submit', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    // Submit clears skill and composerText together. `value` is '' both before
    // and after (the token serializes to nothing), so the token can only go
    // away by watching `skill` — this is the regression this test pins.
    const props = $state({
      value: '',
      disabled: false,
      skill: { skillId: 'explain', name: 'Explain' },
    })

    mount(ChatRichTextInput, { target: host, props })
    flushSync()

    expect(host.querySelector('[data-skill-id="explain"]')).not.toBeNull()

    props.skill = null
    props.disabled = true // a read-only editor must still drop the token
    flushSync()

    expect(host.querySelector('[data-skill-id="explain"]')).toBeNull()

    host.remove()
  })
})
