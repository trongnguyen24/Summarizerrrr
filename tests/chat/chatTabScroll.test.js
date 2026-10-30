// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/stores/settingsStore.svelte.js', () => ({
  settings: { selectedProvider: 'gemini', tools: {}, chat: { provider: 'gemini', model: 'gemini-3-flash-preview', quickModels: [], defaultReasoningLevel: 'provider-default' } },
}))

vi.mock('@/services/chat/chatService.js', () => ({
  chatService: { startConversationForActiveTab: vi.fn() },
}))

vi.mock('@/lib/db/conversationRepository.js', () => ({
  conversationRepository: {
    getConversation: vi.fn(),
    recoverStreamingMessages: vi.fn(async () => 0),
    getGenerationPath: vi.fn(async () => []),
    getSourcesByIds: vi.fn(async () => []),
    updateConversationMetadata: vi.fn(),
  },
}))

vi.mock('@/services/chat/chatSourceService.js', () => ({
  chatSourceService: { captureTabSource: vi.fn() },
}))

import {
  activateChatSession,
  chatState,
  chatTabsState,
  handleChatBrowserTabRemoved,
  removeChatTabSession,
  syncChatForActiveTab,
} from '@/stores/chatStore.svelte.js'
import { chatSessionService } from '@/services/chat/chatSessionService.js'
import { conversationRepository } from '@/lib/db/conversationRepository.js'

const TAB_A = 101
const TAB_B = 202
const TAB_C = 303

// The document is the chat scroller (no local overflow container), and jsdom
// never actually scrolls — so stand in a plain object we can move by hand.
const scroller = { scrollTop: 0, scrollTo: vi.fn() }

beforeAll(() => {
  Object.defineProperty(document, 'scrollingElement', {
    value: scroller,
    configurable: true,
  })
})

afterEach(() => {
  removeChatTabSession(TAB_A, { detachActiveTab: true })
  removeChatTabSession(TAB_B, { detachActiveTab: true })
  removeChatTabSession(TAB_C, { detachActiveTab: true })
  chatSessionService.clearAll()
  scroller.scrollTop = 0
  vi.clearAllMocks()
})

describe('per-tab chat scroll offset', () => {
  it('hands each tab back its own offset when the view returns to it', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.messages = [{ id: 'message-a' }]
    scroller.scrollTop = 420

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    // A tab the user has never scrolled starts at the top.
    expect(chatState.pendingScrollRestore).toBe(0)
    scroller.scrollTop = 90

    await syncChatForActiveTab(TAB_A)
    expect(chatState.pendingScrollRestore).toBe(420)

    await syncChatForActiveTab(TAB_B)
    expect(chatState.pendingScrollRestore).toBe(90)
  })

  it('re-arms the restore once an async hydration lands the messages', async () => {
    await syncChatForActiveTab(TAB_C, { url: 'https://c.example' })
    scroller.scrollTop = 250
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })

    // Coming back, TAB_C now has a persisted conversation to hydrate.
    chatSessionService.setConversationId(TAB_C, 'conversation-c')
    conversationRepository.getConversation.mockResolvedValue({ id: 'conversation-c' })
    conversationRepository.getGenerationPath.mockResolvedValue([
      { id: 'message-c', role: 'user', content: 'hi' },
    ])

    const pending = syncChatForActiveTab(TAB_C)
    // Stand in for ChatShell consuming the pre-hydration request, which fired
    // against a document that had no messages in it yet.
    chatState.pendingScrollRestore = null
    await pending

    expect(chatState.messages).toHaveLength(1)
    expect(chatState.pendingScrollRestore).toBe(250)
  })

  it('does not disturb the offset when the same tab syncs again', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.pendingScrollRestore = null
    scroller.scrollTop = 310

    await syncChatForActiveTab(TAB_A, { url: 'https://a.example', title: 'A' })
    expect(chatState.pendingScrollRestore).toBeNull()
    expect(chatState.currentTitle).toBe('A')
  })

  it('preserves a detached session snapshot through activation and auto-follow', async () => {
    await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
    chatState.conversation = { id: 'conversation-a' }
    chatState.activeConversationId = 'conversation-a'
    chatState.messages = [{ id: 'message-a' }]
    chatState.composerText = 'Draft A'
    scroller.scrollTop = 420
    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)

    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })
    await activateChatSession(TAB_A)
    expect(chatTabsState.activeBrowserTabId).toBe(TAB_B)
    expect(chatState.messages).toEqual([{ id: 'message-a' }])
    expect(chatState.composerText).toBe('Draft A')
    expect(chatState.pendingScrollRestore).toBe(420)

    scroller.scrollTop = 315
    await syncChatForActiveTab(TAB_B)
    await activateChatSession(TAB_A)

    expect(chatState.messages).toEqual([{ id: 'message-a' }])
    expect(chatState.composerText).toBe('Draft A')
    expect(chatState.scrollTop).toBe(315)
    expect(chatState.pendingScrollRestore).toBe(315)
  })
})
