// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'

// The footer buttons are bits-ui tooltip triggers. Their handlers were once lost
// because `{...builder}` was spread *after* `onclick` — bits-ui's trigger props
// carry their own `onclick`, and the last writer wins. Tooltips still appeared,
// so the row looked fine and did nothing. These tests click the real buttons.

vi.mock('svelte-i18n', () => {
  const store = (/** @type {string} */ key, /** @type {object|undefined} */ opts) => {
    let text = opts?.default || key
    if (opts?.values) {
      for (const [k, v] of Object.entries(opts.values)) {
        text = text.replace(`{${k}}`, v)
      }
    }
    return text
  }
  store.subscribe = (/** @type {Function} */ fn) => {
    fn(store)
    return () => {}
  }
  return { _: store }
})

const storeSpies = {
  switchBranch: vi.fn(),
  regenerateChatMessage: vi.fn(),
  editChatMessage: vi.fn(),
  continueChatMessage: vi.fn(),
}

vi.mock('@/stores/chatStore.svelte.js', () => storeSpies)
vi.mock('@/stores/settingsStore.svelte.js', () => ({ settings: { summaryLang: 'en' } }))
vi.mock('@/stores/nowStore.svelte.js', () => ({ nowState: { value: Date.now() } }))
vi.mock('@/lib/db/conversationRepository.js', () => ({
  conversationRepository: { getSiblings: vi.fn(async () => []) },
}))
// The markdown renderer pulls in shiki/highlighting; the row under it is what
// this file is about.
vi.mock('@/components/markdown/StreamingMarkdownV2.svelte', async () => {
  const { default: Stub } = await import('../stubs/MarkdownStub.svelte')
  return { default: Stub }
})

const { default: ChatMessage } = await import(
  '../../src/components/chat/ChatMessage.svelte'
)

function render(message, extraProps = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const component = mount(ChatMessage, {
    target: host,
    props: { message, isStreaming: false, ...extraProps },
  })
  flushSync()
  return {
    host,
    btn: (/** @type {string} */ label) => host.querySelector(`button[aria-label="${label}"]`),
    async destroy() {
      await unmount(component)
      host.remove()
    },
  }
}

const assistantMessage = {
  id: 'm1',
  conversationId: 'c1',
  role: 'assistant',
  content: 'Hello there.',
  status: 'complete',
  createdAt: Date.now(),
  modelId: 'gemini-2.5-flash',
}

describe('ChatMessage action row', () => {
  beforeEach(() => {
    for (const spy of Object.values(storeSpies)) spy.mockClear()
  })

  it('regenerates when the regenerate button is clicked', async () => {
    const view = render(assistantMessage)
    const button = view.btn('Regenerate response')
    expect(button).not.toBeNull()

    button.click()
    flushSync()
    expect(storeSpies.regenerateChatMessage).toHaveBeenCalledWith('m1')

    await view.destroy()
  })

  // Deleting a turn was removed from the row: branching (edit/regenerate) is
  // the intended way to abandon one, and it keeps the record.
  it('offers no delete button', async () => {
    const view = render(assistantMessage)
    expect(view.btn('Delete message')).toBeNull()

    await view.destroy()
  })

  it('copies the response to the clipboard', async () => {
    const writeText = vi.fn()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const onCopy = vi.fn()

    const view = render(assistantMessage, { onCopy })
    view.btn('Copy response').click()
    flushSync()

    expect(writeText).toHaveBeenCalledWith('Hello there.')
    expect(onCopy).toHaveBeenCalled()

    await view.destroy()
  })

  it('continues an aborted response', async () => {
    const view = render({ ...assistantMessage, status: 'aborted' })
    view.btn('Continue response').click()
    flushSync()
    expect(storeSpies.continueChatMessage).toHaveBeenCalledWith('m1')

    await view.destroy()
  })

  it('opens the editor from the user row edit button', async () => {
    const view = render({
      id: 'u1',
      conversationId: 'c1',
      role: 'user',
      content: 'my question',
      status: 'complete',
      createdAt: Date.now(),
    })

    expect(view.btn('Edit message')).not.toBeNull()
    view.btn('Edit message').click()
    flushSync()
    // The editor replaces the bubble, so the edit button is gone.
    expect(view.btn('Edit message')).toBeNull()

    await view.destroy()
  })
})
