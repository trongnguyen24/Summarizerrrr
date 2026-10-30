import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/settingsStore.svelte.js', () => ({
  settings: { selectedProvider: 'gemini', tools: {}, chat: { provider: 'gemini', model: 'gemini-3-flash-preview', quickModels: [], defaultReasoningLevel: 'provider-default' } },
}))

vi.mock('@/services/chat/chatService.js', () => ({
  chatService: {
    startConversationForActiveTab: vi.fn(async ({ settings, modelOverride } = {}) => ({
      conversation: {
        id: 'conv-new',
        providerId: modelOverride?.provider || settings?.chat?.provider || 'gemini',
        modelId: modelOverride?.model || settings?.chat?.model || 'gemini-3-flash-preview',
      },
      tab: { id: 101 }, // TAB_A — must match the tab synced in the test
    })),
    send: vi.fn(),
    retry: vi.fn(),
  },
}))

vi.mock('@/lib/db/conversationRepository.js', () => ({
  conversationRepository: {
    updateConversationMetadata: vi.fn(async (id, metadata) => ({
      id,
      ...metadata,
      updatedAt: new Date().toISOString(),
    })),
    getConversation: vi.fn(),
    recoverStreamingMessages: vi.fn(async () => 0),
    getGenerationPath: vi.fn(async () => []),
    getSourcesByIds: vi.fn(async () => []),
  },
}))

vi.mock('@/services/chat/chatSourceService.js', () => ({
  chatSourceService: {
    captureTabSource: vi.fn(),
  },
}))

import {
  chatState,
  activateChatSession,
  chatTabsState,
  closeConversation,
  handleChatBrowserTabRemoved,
  handleChatTabNavigation,
  getChatTabRuntimeDescriptors,
  removeChatTabSession,
  retryChatMessage,
  sendChatMessage,
  syncChatForActiveTab,
  updateChatTabMetadata,
  setChatModel,
  getEffectiveChatModel,
  startConversationForActiveTab,
  ensureActiveSourceEstimate,
  openConversation,
} from '@/stores/chatStore.svelte.js'
import { conversationRepository } from '@/lib/db/conversationRepository.js'
import { chatService } from '@/services/chat/chatService.js'
import { chatSourceService } from '@/services/chat/chatSourceService.js'
import { resolveConversationModel } from '@/lib/providers/featureModelResolver.js'
import { settings } from '@/stores/settingsStore.svelte.js'

const TAB_A = 101
const TAB_B = 202
const TAB_C = 303

afterEach(() => {
  removeChatTabSession(TAB_A, { detachActiveTab: true })
  removeChatTabSession(TAB_B, { detachActiveTab: true })
  removeChatTabSession(TAB_C, { detachActiveTab: true })
  vi.clearAllMocks()
})

describe('chat store tab ownership', () => {
  it('projects an independent chat session for each browser tab', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    chatState.messages = [{ id: 'message-a' }]
    chatState.composerText = 'Draft A'

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    expect(chatState.conversation).toBeNull()
    expect(chatState.messages).toEqual([])
    expect(chatState.composerText).toBe('')

    chatState.conversation = { id: 'conversation-b' }
    chatState.activeConversationId = 'conversation-b'
    chatState.composerText = 'Draft B'

    await syncChatForActiveTab(TAB_A)
    expect(chatState.conversation.id).toBe('conversation-a')
    expect(chatState.messages).toEqual([{ id: 'message-a' }])
    expect(chatState.composerText).toBe('Draft A')
  })

  it('keeps a mentioned tab as an attachment instead of transferring ownership', async () => {
    await syncChatForActiveTab(TAB_C, { url: 'https://c.example/one' })
    chatState.conversation = { id: 'conversation-c' }
    chatState.activeConversationId = 'conversation-c'
    chatState.pendingAttachments = [{ tabId: TAB_B, title: 'Tab B' }]

    handleChatTabNavigation(TAB_C, 'https://c.example/two')
    expect(chatState.conversation.id).toBe('conversation-c')
    expect(chatState.pendingAttachments).toEqual([{ tabId: TAB_B, title: 'Tab B' }])

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    expect(chatState.conversation).toBeNull()
    expect(chatState.pendingAttachments).toEqual([])

    await syncChatForActiveTab(TAB_C)
    expect(chatState.conversation.id).toBe('conversation-c')
    expect(chatState.pendingAttachments).toEqual([{ tabId: TAB_B, title: 'Tab B' }])
  })

  it('isolates reasoning level per browser tab', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.reasoningLevel = 'high'

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    expect(chatState.reasoningLevel).toBeNull() // fresh tab starts with null sentinel

    chatState.reasoningLevel = 'low'

    await syncChatForActiveTab(TAB_A)
    expect(chatState.reasoningLevel).toBe('high') // Tab A retains its own value

    await syncChatForActiveTab(TAB_B)
    expect(chatState.reasoningLevel).toBe('low') // Tab B retains its own value
  })

  it('null sentinel resolves to the global default at read time (cold-start)', async () => {
    // Import effectiveReasoningLevel to test resolution
    const { effectiveReasoningLevel } = await import('@/lib/api/reasoningConfig.js')

    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    // Session starts with null sentinel
    expect(chatState.reasoningLevel).toBeNull()

    // Before settings are loaded, null resolves to provider-default
    expect(effectiveReasoningLevel(chatState.reasoningLevel, {})).toBe('provider-default')
    expect(effectiveReasoningLevel(chatState.reasoningLevel, null)).toBe('provider-default')

    // After settings load with a non-Auto default, null resolves to it
    const settingsWithDefault = { chat: { defaultReasoningLevel: 'high' } }
    expect(effectiveReasoningLevel(chatState.reasoningLevel, settingsWithDefault)).toBe('high')

    // Once the user explicitly picks a level, it overrides the default
    chatState.reasoningLevel = 'medium'
    expect(effectiveReasoningLevel(chatState.reasoningLevel, settingsWithDefault)).toBe('medium')
  })
})

describe('browser tab close behavior', () => {
  it('detaches a conversation session without aborting it', async () => {
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example',
      title: 'Page A',
      favIconUrl: 'https://a.example/favicon.ico',
    })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    const abort = vi.fn()
    chatState.abortController = { abort }

    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)

    expect(abort).not.toHaveBeenCalled()
    expect(getChatTabRuntimeDescriptors()).toEqual([
      expect.objectContaining({
        id: TAB_A,
        detached: true,
        title: 'Page A',
        favIconUrl: 'https://a.example/favicon.ico',
        hasConversation: true,
      }),
    ])
    expect(chatState.activeSourceEstimate).toBeNull()
  })

  it('removes a tab with no conversation', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.composerText = 'unsent draft'

    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)
    expect(getChatTabRuntimeDescriptors()).toEqual([])
  })

  it('keeps a reply that finishes after its browser tab closes', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    chatState.activeSourceDismissed = true

    let resolveSend
    let inFlightAbortController
    const sendStarted = new Promise((resolve) => {
      chatService.send.mockImplementation(async (options) => {
        inFlightAbortController = options.abortController
        resolve()
        await new Promise((release) => {
          resolveSend = release
        })
        return { assistant: { id: 'assistant-a' }, transient: {}, diagnostics: {} }
      })
    })
    conversationRepository.getGenerationPath.mockResolvedValue([
      { id: 'user-a', role: 'user', content: 'Hello' },
      { id: 'assistant-a', role: 'assistant', content: 'Hi there' },
    ])

    const sending = sendChatMessage('Hello')
    await sendStarted
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)
    expect(inFlightAbortController.signal.aborted).toBe(false)

    resolveSend()
    await sending

    expect(chatState.messages).toEqual([
      { id: 'user-a', role: 'user', content: 'Hello' },
      { id: 'assistant-a', role: 'assistant', content: 'Hi there' },
    ])
    expect(chatState.isSending).toBe(false)
    expect(getChatTabRuntimeDescriptors()).toEqual([
      expect.objectContaining({ id: TAB_A, detached: true, hasConversation: true }),
    ])
  })

  it('does not recreate a detached session when a removed stream resolves', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    chatState.activeSourceDismissed = true

    let resolveSend
    const sendStarted = new Promise((resolve) => {
      chatService.send.mockImplementation(async () => {
        resolve()
        return new Promise((release) => {
          resolveSend = release
        })
      })
    })

    const sending = sendChatMessage('Hello')
    await sendStarted
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    chatState.messages = [{ id: 'message-b' }]
    chatState.error = new Error('B stays visible')
    chatState.isSending = false
    removeChatTabSession(TAB_A)

    resolveSend({})
    await sending

    expect(getChatTabRuntimeDescriptors()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: TAB_A })]),
    )
    expect(chatState.messages).toEqual([{ id: 'message-b' }])
    expect(chatState.isSending).toBe(false)
    expect(chatState.error).toBeInstanceOf(Error)
    expect(chatState.error.message).toBe('B stays visible')
  })

  it('does not recreate a detached session when a removed stream rejects', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    chatState.activeSourceDismissed = true

    let rejectSend
    const sendStarted = new Promise((resolve) => {
      chatService.send.mockImplementation(async () => {
        resolve()
        return new Promise((resolvePromise, rejectPromise) => {
          rejectSend = rejectPromise
        })
      })
    })

    const sending = sendChatMessage('Hello')
    await sendStarted
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    chatState.messages = [{ id: 'message-b' }]
    chatState.error = new Error('B stays visible')
    chatState.isSending = false
    removeChatTabSession(TAB_A)

    rejectSend(new Error('A failed'))
    await sending

    expect(getChatTabRuntimeDescriptors()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: TAB_A })]),
    )
    expect(chatState.messages).toEqual([{ id: 'message-b' }])
    expect(chatState.isSending).toBe(false)
    expect(chatState.error.message).toBe('B stays visible')
  })

  it('guards retry writes after its detached session is removed', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    chatState.messages = [
      { id: 'user-a', role: 'user', content: 'Hello' },
      { id: 'assistant-a', role: 'assistant', content: 'Hi', parentId: 'user-a' },
    ]

    let resolveRetry
    const retryStarted = new Promise((resolve) => {
      chatService.retry.mockImplementation(async () => {
        resolve()
        return new Promise((release) => {
          resolveRetry = release
        })
      })
    })

    const retrying = retryChatMessage('user-a')
    await retryStarted
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)
    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    chatState.messages = [{ id: 'message-b' }]
    chatState.error = new Error('B stays visible')
    chatState.isSending = false
    removeChatTabSession(TAB_A)

    resolveRetry({})
    await retrying

    expect(getChatTabRuntimeDescriptors()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: TAB_A })]),
    )
    expect(chatState.messages).toEqual([{ id: 'message-b' }])
    expect(chatState.isSending).toBe(false)
    expect(chatState.error.message).toBe('B stays visible')
  })

  it('activates a detached session without changing the active browser tab', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    chatState.messages = [{ id: 'message-a' }]
    chatState.composerText = 'Draft A'
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    await activateChatSession(TAB_A)

    expect(chatState.messages).toEqual([{ id: 'message-a' }])
    expect(chatState.composerText).toBe('Draft A')
    expect(chatTabsState.activeBrowserTabId).toBe(TAB_B)
    expect(chatTabsState.activeSessionTabId).toBe(TAB_A)
  })

  it('returns to the active browser tab when the on-screen detached session is removed', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    await activateChatSession(TAB_A)
    removeChatTabSession(TAB_A)
    await Promise.resolve()

    expect(chatState.conversation).toBeNull()
    expect(chatTabsState.activeBrowserTabId).toBe(TAB_B)
    expect(chatTabsState.activeSessionTabId).toBe(TAB_B)
  })

  it('does not write a reply into a fresh session after closeConversation', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    chatState.activeSourceDismissed = true

    let resolveSend
    const sendStarted = new Promise((resolve) => {
      chatService.send.mockImplementation(async () => {
        resolve()
        return new Promise((release) => {
          resolveSend = release
        })
      })
    })

    const sending = sendChatMessage('Hello')
    await sendStarted
    closeConversation()
    resolveSend({})
    await sending

    expect(chatState.conversation).toBeNull()
    expect(chatState.messages).toEqual([])
    expect(chatState.isSending).toBe(false)
    expect(getChatTabRuntimeDescriptors()).toEqual([])
  })
})

describe('per-tab model state (Phase 3)', () => {
  it('isolates modelOverride per browser tab', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.modelOverride = { provider: 'chatgpt', model: 'gpt-5' }

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    expect(chatState.modelOverride).toBeNull() // fresh tab

    chatState.modelOverride = { provider: 'cerebras', model: 'gpt-oss-120b' }

    await syncChatForActiveTab(TAB_A)
    expect(chatState.modelOverride).toEqual({ provider: 'chatgpt', model: 'gpt-5' })

    await syncChatForActiveTab(TAB_B)
    expect(chatState.modelOverride).toEqual({ provider: 'cerebras', model: 'gpt-oss-120b' })
  })

  it('setChatModel with active conversation persists via updateConversationMetadata', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conv-1', providerId: 'gemini', modelId: 'gemini-3-flash-preview' }
    chatState.activeConversationId = 'conv-1'

    await setChatModel({ provider: 'chatgpt', model: 'gpt-5' })

    expect(conversationRepository.updateConversationMetadata).toHaveBeenCalledWith(
      'conv-1',
      { providerId: 'chatgpt', modelId: 'gpt-5' }
    )
    expect(chatState.conversation.providerId).toBe('chatgpt')
    expect(chatState.conversation.modelId).toBe('gpt-5')
  })

  it('setChatModel before a conversation stores override, startConversation consumes it', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    expect(chatState.modelOverride).toBeNull()

    await setChatModel({ provider: 'deepseek', model: 'deepseek-chat' })
    expect(chatState.modelOverride).toEqual({ provider: 'deepseek', model: 'deepseek-chat' })

    await startConversationForActiveTab()

    // modelOverride consumed and cleared
    expect(chatState.modelOverride).toBeNull()
    // chatService was called with the override
    expect(chatService.startConversationForActiveTab).toHaveBeenCalledWith(
      expect.objectContaining({
        modelOverride: { provider: 'deepseek', model: 'deepseek-chat' },
      })
    )
    // conversation stamped with the override
    expect(chatState.conversation.providerId).toBe('deepseek')
    expect(chatState.conversation.modelId).toBe('deepseek-chat')
  })

  it('setChatModel is a no-op while isSending', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conv-2', providerId: 'gemini', modelId: 'gemini-3-flash-preview' }
    chatState.isSending = true

    await setChatModel({ provider: 'chatgpt', model: 'gpt-5' })

    expect(conversationRepository.updateConversationMetadata).not.toHaveBeenCalled()
    expect(chatState.conversation.providerId).toBe('gemini')
    expect(chatState.conversation.modelId).toBe('gemini-3-flash-preview')

    // Clean up
    chatState.isSending = false
  })

  it('getEffectiveChatModel resolves conversation → override → settings.chat', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })

    // No conversation, no override → falls back to settings.chat
    let effective = getEffectiveChatModel()
    expect(effective.provider).toBe('gemini')
    expect(effective.model).toBe('gemini-3-flash-preview')

    // Set modelOverride → override wins
    chatState.modelOverride = { provider: 'chatgpt', model: 'gpt-5' }
    effective = getEffectiveChatModel()
    expect(effective.provider).toBe('chatgpt')
    expect(effective.model).toBe('gpt-5')

    // Set conversation → conversation wins
    chatState.conversation = { id: 'conv-3', providerId: 'deepseek', modelId: 'deepseek-chat' }
    effective = getEffectiveChatModel()
    expect(effective.provider).toBe('deepseek')
    expect(effective.model).toBe('deepseek-chat')
  })

  it('getEffectiveChatModel keeps a stored-provider/no-model conversation on its own provider', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })

    // A stale override must not leak into the label for a conversation that
    // already has a stored provider — the request path would ignore it.
    chatState.modelOverride = { provider: 'chatgpt', model: 'gpt-5' }

    // Legacy conversation: stamped before models were recorded.
    chatState.conversation = { id: 'conv-legacy', providerId: 'cerebras', modelId: null }

    const effective = getEffectiveChatModel()
    // Must report cerebras — not settings.chat's gemini, not the override.
    expect(effective.provider).toBe('cerebras')
    expect(effective.model).not.toBe('gemini-3-flash-preview')
    expect(effective.model).not.toBe('gpt-5')
    // And must agree with what the request path would route to.
    const routed = resolveConversationModel(chatState.conversation, settings)
    expect(effective).toEqual({ provider: routed.providerId, model: routed.modelId })
  })
})

describe('active-tab identity — title + favicon (Phase 1)', () => {
  it('two browser tabs keep independent currentTitle/currentFavIconUrl', async () => {
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example',
      title: 'Page A',
      favIconUrl: 'https://a.example/favicon.ico',
    })
    expect(chatState.currentTitle).toBe('Page A')
    expect(chatState.currentFavIconUrl).toBe('https://a.example/favicon.ico')

    await syncChatForActiveTab(TAB_B, {
      url: 'https://b.example',
      title: 'Page B',
      favIconUrl: 'https://b.example/favicon.ico',
    })
    expect(chatState.currentTitle).toBe('Page B')
    expect(chatState.currentFavIconUrl).toBe('https://b.example/favicon.ico')

    // Switch back to Tab A — its title/favicon should be restored
    await syncChatForActiveTab(TAB_A)
    expect(chatState.currentTitle).toBe('Page A')
    expect(chatState.currentFavIconUrl).toBe('https://a.example/favicon.ico')

    // Switch back to Tab B — its title/favicon should be restored
    await syncChatForActiveTab(TAB_B)
    expect(chatState.currentTitle).toBe('Page B')
    expect(chatState.currentFavIconUrl).toBe('https://b.example/favicon.ico')
  })

  it('a later syncChatForActiveTab with a new title overwrites the old one (not sticky)', async () => {
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example',
      title: 'Loading…',
      favIconUrl: null,
    })
    expect(chatState.currentTitle).toBe('Loading…')

    // Same tab, title changes — must overwrite (unlike url which is sticky)
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example',
      title: 'Actual Page Title',
      favIconUrl: 'https://a.example/favicon.ico',
    })
    expect(chatState.currentTitle).toBe('Actual Page Title')
    expect(chatState.currentFavIconUrl).toBe('https://a.example/favicon.ico')
  })

  it('updateChatTabMetadata on an inactive tab updates that snapshot without touching the active view', async () => {
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example',
      title: 'Page A',
      favIconUrl: 'https://a.example/favicon.ico',
    })
    await syncChatForActiveTab(TAB_B, {
      url: 'https://b.example',
      title: 'Page B',
      favIconUrl: 'https://b.example/favicon.ico',
    })

    // Active tab is now TAB_B. Update TAB_A's metadata in the background.
    updateChatTabMetadata(TAB_A, {
      title: 'Page A (Updated)',
      favIconUrl: 'https://a.example/new-favicon.ico',
    })

    // Active view (TAB_B) must be untouched
    expect(chatState.currentTitle).toBe('Page B')
    expect(chatState.currentFavIconUrl).toBe('https://b.example/favicon.ico')

    // Switching back to TAB_A shows the updated snapshot
    await syncChatForActiveTab(TAB_A)
    expect(chatState.currentTitle).toBe('Page A (Updated)')
    expect(chatState.currentFavIconUrl).toBe('https://a.example/new-favicon.ico')
  })

  it('no-scrape guard: captureTabSource is never called by sync/update', async () => {
    // The core regression test: switching tabs and updating metadata must
    // never trigger content extraction (chatSourceService.captureTabSource).
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example',
      title: 'Page A',
      favIconUrl: 'https://a.example/favicon.ico',
    })
    await syncChatForActiveTab(TAB_B, {
      url: 'https://b.example',
      title: 'Page B',
      favIconUrl: null,
    })
    await syncChatForActiveTab(TAB_A)
    await syncChatForActiveTab(TAB_B, {
      title: 'Page B Updated',
    })
    updateChatTabMetadata(TAB_A, { title: 'Page A v2' })
    updateChatTabMetadata(TAB_B, { favIconUrl: 'https://b.example/favicon.ico' })

    expect(chatSourceService.captureTabSource).not.toHaveBeenCalled()
  })

  it('captures and estimates only when explicitly triggered, then resets on navigation', async () => {
    chatSourceService.captureTabSource.mockResolvedValueOnce({
      source: { id: 'source-a', rawContent: 'Readable page content '.repeat(80) },
    })
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example/one',
      title: 'Page A',
      favIconUrl: 'https://a.example/favicon.ico',
    })

    expect(chatSourceService.captureTabSource).not.toHaveBeenCalled()
    const estimatePromise = ensureActiveSourceEstimate('webpage')
    expect(chatState.activeSourceEstimate.estimating).toBe(true)
    await estimatePromise

    expect(chatSourceService.captureTabSource).toHaveBeenCalledOnce()
    expect(chatSourceService.captureTabSource).toHaveBeenCalledWith(
      { tabId: TAB_A, url: 'https://a.example/one', title: 'Page A' },
      'webpage',
    )
    expect(chatState.activeSourceEstimate.sourceId).toBe('source-a')
    expect(chatState.activeSourceEstimate.estimatedTokens).toBeGreaterThan(0)

    handleChatTabNavigation(TAB_A, 'https://a.example/two')
    expect(chatState.activeSourceEstimate).toBeNull()
    expect(chatSourceService.captureTabSource).toHaveBeenCalledOnce()
  })

  it('does not estimate the page for a detached session', async () => {
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example/closed',
      title: 'Page A',
    })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)

    expect(await ensureActiveSourceEstimate('webpage')).toBeNull()
    expect(chatSourceService.captureTabSource).not.toHaveBeenCalled()
  })

  it('drops the active source when the tab closes during capture', async () => {
    await syncChatForActiveTab(TAB_A, {
      url: 'https://a.example/capture',
      title: 'Page A',
    })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'

    let resolveCapture
    const captureStarted = new Promise((resolve) => {
      chatSourceService.captureTabSource.mockImplementationOnce(
        () => new Promise((resolvePromise) => {
          resolveCapture = resolvePromise
          resolve()
        }),
      )
    })
    chatService.send.mockResolvedValue({ assistant: { id: 'assistant-a' }, transient: {}, diagnostics: {} })

    const sending = sendChatMessage('Hello')
    await captureStarted
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)

    resolveCapture({ source: { id: 'source-a', rawContent: 'Page content' } })
    await sending

    expect(chatSourceService.captureTabSource).toHaveBeenCalledOnce()
    expect(chatService.send).toHaveBeenCalledOnce()
    expect(chatService.send.mock.calls[0][0]).toMatchObject({
      activeSource: null,
      sourceRequired: false,
    })
  })
})

describe('committed context sources', () => {
  it('hydrates grounded sources as locked composer context', async () => {
    conversationRepository.getConversation.mockResolvedValueOnce({
      id: 'conversation-grounded',
      deleted: false,
    })
    conversationRepository.getGenerationPath.mockResolvedValueOnce([
      { id: 'user-1', role: 'user', attachmentRefs: ['source-1'] },
      {
        id: 'assistant-1',
        role: 'assistant',
        groundingRefs: [{ sourceId: 'source-1', tokens: 321 }],
      },
    ])
    conversationRepository.getSourcesByIds.mockResolvedValueOnce([
      {
        id: 'source-1',
        tabIdHint: TAB_A,
        url: 'https://a.example/article',
        normalizedUrl: 'https://a.example/article',
        title: 'Grounded article',
        sourceType: 'webpage',
        rawContent: 'Article body',
      },
    ])

    await syncChatForActiveTab(TAB_A, { url: 'https://a.example/article' })
    await openConversation('conversation-grounded')

    expect(chatState.committedSources).toEqual([
      expect.objectContaining({
        sourceId: 'source-1',
        title: 'Grounded article',
        sourceKind: 'webpage',
        estimatedTokens: 321,
        locked: true,
      }),
    ])
  })
})
