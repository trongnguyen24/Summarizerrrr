// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'

// Everything below the shell is out of scope here — the composer alone would
// drag in the rich-text editor.
// Each `vi.mock` is hoisted, so the factories can't share a helper and every
// path has to be a literal.
vi.mock('@/components/chat/ChatMessageList.svelte', async () => ({
  default: (await import('../stubs/EmptyStub.svelte')).default,
}))
vi.mock('@/components/chat/ChatEmptyState.svelte', async () => ({
  default: (await import('../stubs/EmptyStub.svelte')).default,
}))
vi.mock('@/components/chat/ChatComposer.svelte', async () => ({
  default: (await import('../stubs/EmptyStub.svelte')).default,
}))
vi.mock('@/components/chat/ChatContextWarning.svelte', async () => ({
  default: (await import('../stubs/EmptyStub.svelte')).default,
}))
vi.mock('@/components/ui/ErrorDisplay.svelte', async () => ({
  default: (await import('../stubs/EmptyStub.svelte')).default,
}))

vi.mock(
  '@/stores/chatStore.svelte.js',
  async () => await import('../stubs/chatStoreStub.svelte.js'),
)

const { chatState } = await import('@/stores/chatStore.svelte.js')
const { default: ChatShell } = await import(
  '../../src/components/chat/ChatShell.svelte'
)

const scroller = { scrollTop: 0, clientHeight: 800, scrollTo: vi.fn() }

beforeAll(() => {
  Object.defineProperty(document, 'scrollingElement', {
    value: scroller,
    configurable: true,
  })
  // The restore is deferred a frame so the remounted composer can settle its
  // height; run it straight through instead.
  vi.stubGlobal('requestAnimationFrame', (/** @type {Function} */ cb) => {
    cb()
    return 0
  })
  // jsdom has no ResizeObserver. The shell observes its list to re-measure the
  // tail spacer (driven explicitly here), and Svelte's own `bind:clientHeight`
  // needs `unobserve` on teardown.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  scroller.scrollTo.mockClear()
  chatState.pendingScrollRestore = null
})

describe('ChatShell scroll restore', () => {
  it('consumes a restore request and puts the document back', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const component = mount(ChatShell, { target: host })
    flushSync()

    chatState.pendingScrollRestore = 420
    flushSync()
    // Two `tick()`s inside (measure the tail spacer, then scroll).
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(scroller.scrollTo).toHaveBeenCalledWith({
      top: 420,
      // A plain `scrollTop =` would animate: `html { scroll-behavior: smooth }`.
      behavior: 'instant',
    })
    // One-shot — cleared so the streaming re-renders that follow don't repeat it.
    expect(chatState.pendingScrollRestore).toBeNull()

    await unmount(component)
    host.remove()
  })

  it('treats 0 as a real target rather than "nothing to do"', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const component = mount(ChatShell, { target: host })
    flushSync()

    chatState.pendingScrollRestore = 0
    flushSync()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })

    await unmount(component)
    host.remove()
  })
})
