// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushSync } from 'svelte'
import ChatMessageEditor from '../../../src/components/chat/ChatMessageEditor.svelte'

// Mock getClientRects and getBoundingClientRect for JSDOM ProseMirror compatibility
if (typeof window !== 'undefined') {
  Element.prototype.getClientRects = Element.prototype.getClientRects || function() { return [] }
  Element.prototype.getBoundingClientRect = Element.prototype.getBoundingClientRect || function() {
    return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 }
  }
}

let shouldFailEditorInit = false

vi.mock('@tiptap/core', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    Editor: class MockEditor extends original.Editor {
      constructor(config) {
        if (shouldFailEditorInit) {
          throw new Error('Simulated editor failure')
        }
        super(config)
      }
    }
  }
})

describe('ChatMessageEditor Component', () => {
  beforeEach(() => {
    shouldFailEditorInit = false
  })

  it('mounts and renders with initial value', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const onsave = vi.fn()
    const oncancel = vi.fn()

    mount(ChatMessageEditor, {
      target: host,
      props: {
        value: 'Edit me',
        onsave,
        oncancel
      }
    })

    flushSync()

    expect(host.querySelector('textarea')).toBeNull()
    host.remove()
  })

  it('falls back to textarea when TipTap construction fails', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    shouldFailEditorInit = true

    const onsave = vi.fn()
    const oncancel = vi.fn()

    mount(ChatMessageEditor, {
      target: host,
      props: {
        value: 'Fallback edit',
        onsave,
        oncancel
      }
    })

    flushSync()

    const textarea = host.querySelector('textarea')
    expect(textarea).not.toBeNull()
    expect(textarea.value).toBe('Fallback edit')

    const buttons = host.querySelectorAll('button')
    const cancelButton = Array.from(buttons).find(b => b.textContent.trim() === 'Cancel')
    expect(cancelButton).toBeTruthy()
    cancelButton.click()
    flushSync()
    expect(oncancel).toHaveBeenCalled()

    const saveButton = Array.from(buttons).find(b => b.textContent.trim() === 'Save & Submit')
    expect(saveButton).toBeTruthy()
    saveButton.click()
    flushSync()
    expect(onsave).toHaveBeenCalledWith('Fallback edit')

    host.remove()
  })
})
