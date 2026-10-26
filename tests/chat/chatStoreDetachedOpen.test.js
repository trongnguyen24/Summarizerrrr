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
  },
}))

vi.mock('@/stores/deepDiveStore.svelte.js', () => ({
  invalidateConversationDeepDive: vi.fn(),
}))

vi.mock('@/services/chat/chatSourceService.js', () => ({
  chatSourceService: { captureTabSource: vi.fn() },
}))

import {
  chatState,
  closeConversation,
  handleChatBrowserTabRemoved,
  openConversation,
  removeChatTabSession,
  sendChatMessage,
  syncChatForActiveTab,
} from '@/stores/chatStore.svelte.js'
import { chatService } from '@/services/chat/chatService.js'

const LIVE_TAB = 101

beforeEach(() => {
  chatService.send.mockReset()
  chatService.send.mockResolvedValue({
    assistant: { id: 'a1' },
    transient: {},
    diagnostics: {},
  })
})

afterEach(() => {
  closeConversation()
  removeChatTabSession(LIVE_TAB, { detachActiveTab: true })
  vi.clearAllMocks()
})

describe('openConversation detached mode', () => {
  it('sends a follow-up with no live source when opened detached with no active tab (Archive page)', async () => {
    await openConversation('conv-archive', { detached: true })
    expect(chatState.detached).toBe(true)
    expect(chatState.conversation?.id).toBe('conv-archive')

    await sendChatMessage('follow-up question')

    expect(chatService.send).toHaveBeenCalledTimes(1)
    const args = chatService.send.mock.calls[0][0]
    expect(args.activeSource).toBeNull()
    expect(args.sourceRequired).toBe(false)
  })

  it('does not ground a detached resume on the browser tab that is active', async () => {
    await syncChatForActiveTab(LIVE_TAB, { url: 'https://www.youtube.com/watch?v=abc' })
    expect(chatState.detached).toBe(false)

    await openConversation('conv-wiki', { detached: true })
    expect(chatState.detached).toBe(true)

    await sendChatMessage('what about this?')

    const args = chatService.send.mock.calls[0][0]
    expect(args.activeSource).toBeNull()
    expect(args.sourceRequired).toBe(false)
  })

  it('keeps the default (non-detached) behaviour when no option is passed', async () => {
    await openConversation('conv-plain')
    expect(chatState.detached).toBe(false)
  })

  it('keeps the session\'s own detached flag when a conversation is opened without the option', async () => {
    await syncChatForActiveTab(LIVE_TAB, { url: 'https://example.com/page' })
    await openConversation('conv-detached', { detached: true })
    expect(chatState.detached).toBe(true)

    await openConversation('conv-normal')
    expect(chatState.detached).toBe(true)
  })

  it('a closed tab\'s session stays detached when another conversation is picked from history', async () => {
    await syncChatForActiveTab(LIVE_TAB, { url: 'https://example.com/page' })
    await openConversation('conv-first')
    handleChatBrowserTabRemoved(LIVE_TAB)
    expect(chatState.detached).toBe(true)

    await openConversation('conv-from-history')
    expect(chatState.conversation?.id).toBe('conv-from-history')
    expect(chatState.detached).toBe(true)

    await sendChatMessage('follow-up')
    const args = chatService.send.mock.calls[0][0]
    expect(args.activeSource).toBeNull()
    expect(args.sourceRequired).toBe(false)
  })
})
