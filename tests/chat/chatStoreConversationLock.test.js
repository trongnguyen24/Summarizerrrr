import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/settingsStore.svelte.js', () => ({
  settings: {
    selectedProvider: 'gemini',
    tools: {},
    chat: {
      provider: 'gemini',
      model: 'gemini-3-flash-preview',
      quickModels: [],
      defaultReasoningLevel: 'provider-default',
    },
  },
}))

vi.mock('@/services/chat/chatService.js', () => ({
  chatService: {
    startConversationForActiveTab: vi.fn(),
    send: vi.fn(),
  },
}))

vi.mock('@/lib/db/conversationRepository.js', () => ({
  conversationRepository: {
    getConversation: vi.fn(async (id) => ({
      id,
      title: `Conversation ${id}`,
      providerId: 'gemini',
      modelId: 'gemini-3-flash-preview',
    })),
    getGenerationPath: vi.fn(async () => []),
    getSourcesByIds: vi.fn(async () => []),
    recoverStreamingMessages: vi.fn(async () => 0),
    updateConversationMetadata: vi.fn(async () => ({})),
    listMessagesByConversation: vi.fn(async () => []),
  },
}))

vi.mock('@/stores/deepDiveStore.svelte.js', () => ({
  invalidateConversationDeepDive: vi.fn(),
}))

vi.mock('@/services/chat/chatSourceService.js', () => ({
  chatSourceService: { captureTabSource: vi.fn() },
}))

import {
  canSendChat,
  chatState,
  closeConversation,
  openConversation,
  removeChatTabSession,
  retryChatMessage,
  sendChatMessage,
  setChatModel,
  syncChatForActiveTab,
} from '@/stores/chatStore.svelte.js'
import { chatService } from '@/services/chat/chatService.js'
import { conversationRepository } from '@/lib/db/conversationRepository.js'

const LOCK_NAME = 'chat-conv:conv-locked'

/** Fake navigator.locks: a request that is not `ifAvailable` waits in a queue. */
function createFakeLockManager() {
  const held = new Set()
  const waiting = new Map()
  const grant = (name, callback, resolve, reject) => {
    held.add(name)
    Promise.resolve()
      .then(() => callback({ name }))
      .then(
        (value) => {
          held.delete(name)
          resolve(value)
          drain(name)
        },
        (error) => {
          held.delete(name)
          reject(error)
          drain(name)
        },
      )
  }
  const drain = (name) => {
    if (held.has(name)) return
    const queue = waiting.get(name)
    if (!queue?.length) return
    const next = queue.shift()
    grant(name, next.callback, next.resolve, next.reject)
  }
  return {
    request(name, options, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }
      return new Promise((resolve, reject) => {
        if (!held.has(name)) return grant(name, callback, resolve, reject)
        if (options.ifAvailable) return resolve(callback(null))
        const entry = { callback, resolve, reject }
        if (!waiting.has(name)) waiting.set(name, [])
        waiting.get(name).push(entry)
        options.signal?.addEventListener('abort', () => {
          const queue = waiting.get(name) || []
          const index = queue.indexOf(entry)
          if (index >= 0) {
            queue.splice(index, 1)
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
          }
        })
      })
    },
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

let releaseOtherPage

beforeEach(() => {
  vi.stubGlobal('navigator', { locks: createFakeLockManager() })
  chatService.send.mockReset()
  chatService.send.mockResolvedValue({
    assistant: { id: 'a1' },
    transient: {},
    diagnostics: {},
  })
  // Another extension page (e.g. the side panel) holds the conversation lock.
  releaseOtherPage = null
  navigator.locks.request(
    LOCK_NAME,
    () => new Promise((resolve) => (releaseOtherPage = resolve)),
  )
})

afterEach(() => {
  closeConversation()
  removeChatTabSession(101, { detachActiveTab: true })
  removeChatTabSession(102, { detachActiveTab: true })
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('chatStore conversation write lock', () => {
  it('opens a conversation held by another page read-only, and a send is a no-op', async () => {
    await openConversation('conv-locked', { detached: true })

    expect(chatState.readOnly).toBe(true)
    expect(canSendChat()).toBe(false)

    chatState.composerText = 'follow-up'
    const result = await sendChatMessage('follow-up')
    expect(result).toBeNull()
    expect(chatService.send).not.toHaveBeenCalled()
  })

  it('blocks retry on a read-only conversation', async () => {
    await openConversation('conv-locked', { detached: true })
    const result = await retryChatMessage('some-message')
    expect(result).toBeNull()
    expect(chatService.send).not.toHaveBeenCalled()
  })

  it('becomes writable and reloads the path once the other page releases the lock', async () => {
    await openConversation('conv-locked', { detached: true })
    expect(chatState.readOnly).toBe(true)
    const reloadsBefore = conversationRepository.getGenerationPath.mock.calls.length

    releaseOtherPage()
    await flush()
    await flush()

    expect(chatState.readOnly).toBe(false)
    expect(conversationRepository.getGenerationPath.mock.calls.length).toBeGreaterThan(reloadsBefore)

    await sendChatMessage('now allowed')
    expect(chatService.send).toHaveBeenCalledTimes(1)
  })

  it('a free conversation is writable', async () => {
    await openConversation('conv-free', { detached: true })
    expect(chatState.readOnly).toBe(false)
    chatState.composerText = 'hello'
    expect(canSendChat()).toBe(true)
  })

  it('closing a read-only view cancels the queued wait, so a later release grants nothing', async () => {
    await openConversation('conv-locked', { detached: true })
    closeConversation()
    expect(chatState.conversation).toBeNull()
    expect(chatState.readOnly).toBe(false)

    releaseOtherPage()
    await flush()
    expect(chatState.conversation).toBeNull()
  })

  it('does not persist a model change from a read-only view', async () => {
    await openConversation('conv-locked', { detached: true })
    await setChatModel({ provider: 'openai', model: 'gpt-x' })
    expect(conversationRepository.updateConversationMetadata).not.toHaveBeenCalled()
  })

  it('unlocks every session on the page that shows the conversation once the lock is granted', async () => {
    await syncChatForActiveTab(101, { url: 'https://example.com/a' })
    await openConversation('conv-locked')
    expect(chatState.readOnly).toBe(true)
    await syncChatForActiveTab(102, { url: 'https://example.com/b' })
    await openConversation('conv-locked')
    expect(chatState.readOnly).toBe(true)

    releaseOtherPage()
    await flush()
    await flush()

    expect(chatState.readOnly).toBe(false)
    await syncChatForActiveTab(101)
    expect(chatState.conversation?.id).toBe('conv-locked')
    expect(chatState.readOnly).toBe(false)
  })
})

describe('chatStore overlapping opens', () => {
  function deferPathFor(id) {
    let resolve
    const gate = new Promise((r) => (resolve = r))
    const original = conversationRepository.getGenerationPath.getMockImplementation()
    conversationRepository.getGenerationPath.mockImplementation(async (requested) => {
      if (requested === id) await gate
      return original(requested)
    })
    return () => resolve()
  }

  async function lockIsFree(id) {
    // Let a just-released lock settle in the fake manager first.
    await flush()
    return navigator.locks.request(`chat-conv:${id}`, { ifAvailable: true }, (lock) => lock != null)
  }

  it('a slow open overtaken by a newer one writes nothing and gives its lock back', async () => {
    const releaseSlow = deferPathFor('conv-slow')
    const slow = openConversation('conv-slow', { detached: true })
    await flush()
    closeConversation()
    await openConversation('conv-fast', { detached: true })
    expect(chatState.conversation?.id).toBe('conv-fast')

    releaseSlow()
    expect(await slow).toBeNull()
    expect(chatState.conversation?.id).toBe('conv-fast')
    expect(chatState.readOnly).toBe(false)
    expect(await lockIsFree('conv-slow')).toBe(true)
    expect(await lockIsFree('conv-fast')).toBe(false)

    closeConversation()
    expect(await lockIsFree('conv-fast')).toBe(true)
  })

  it('an open still loading when the view closes never lands', async () => {
    const releaseSlow = deferPathFor('conv-slow')
    const slow = openConversation('conv-slow', { detached: true })
    await flush()
    closeConversation()

    releaseSlow()
    expect(await slow).toBeNull()
    expect(chatState.conversation).toBeNull()
    expect(await lockIsFree('conv-slow')).toBe(true)
  })
})
