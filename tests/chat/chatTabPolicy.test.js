import { describe, expect, it } from 'vitest'
import {
  abortChatTabSession,
  chatSessionHasActivity,
  getAdjacentChatTabId,
  mergeChatTabsWithBrowserTabs,
  toChatTabRuntimeDescriptor,
  updateChatSessionUrl,
} from '@/services/chat/chatTabPolicy.js'

describe('chat tab policy', () => {
  it.each([
    { conversation: { id: 'conversation-1' } },
    { messages: [{ id: 'message-1' }] },
    { composerText: 'Draft' },
    { selectedSkill: { id: 'summarize' } },
    { pendingAttachments: [{ tabId: 2 }] },
    { isSending: true },
    { streamingMessage: { content: 'Partial' } },
    { error: { message: 'Failed' } },
  ])('includes a session with runtime activity: %j', (session) => {
    expect(chatSessionHasActivity(session)).toBe(true)
  })

  it('excludes an empty runtime session', () => {
    expect(
      chatSessionHasActivity({
        messages: [],
        composerText: ' ',
        pendingAttachments: [],
        contextWarnings: [],
      }),
    ).toBe(false)
  })

  it('sorts established chats by browser order and hides the empty active tab', () => {
    const tabs = mergeChatTabsWithBrowserTabs({
      runtimeTabs: [
        { id: 30, hasConversation: true, isLoading: true, hasError: false, removable: true },
        { id: 10, hasConversation: true, isLoading: false, hasError: true, removable: true },
        { id: 20, hasConversation: false, isLoading: false, hasError: false, removable: true },
      ],
      browserTabs: [
        { id: 10, title: 'First' },
        { id: 20, title: 'Current empty tab' },
        { id: 30, title: 'Third' },
        { id: 40, title: 'Unused' },
      ],
      activeBrowserTabId: 20,
    })

    expect(tabs).toEqual([
      {
        id: 10,
        title: 'First',
        isLoading: false,
        hasError: true,
        removable: true,
      },
      {
        id: 30,
        title: 'Third',
        isLoading: true,
        hasError: false,
        removable: true,
      },
    ])
  })

  it('shows the active browser tab only when no conversations exist', () => {
    const tabs = mergeChatTabsWithBrowserTabs({
      runtimeTabs: [
        { id: 10, hasConversation: false, isLoading: false, hasError: false, removable: true },
      ],
      browserTabs: [
        { id: 10, title: 'YouTube' },
        { id: 20, title: 'Another tab' },
      ],
      activeBrowserTabId: 10,
    })

    expect(tabs).toEqual([
      {
        id: 10,
        title: 'YouTube',
        isLoading: false,
        hasError: false,
        removable: false,
      },
    ])
  })

  it('moves the active tab into browser order after its first chat starts', () => {
    const tabs = mergeChatTabsWithBrowserTabs({
      runtimeTabs: [
        { id: 30, hasConversation: true, isLoading: false, hasError: false, removable: true },
        { id: 10, hasConversation: true, isLoading: false, hasError: false, removable: true },
        { id: 20, hasConversation: true, isLoading: true, hasError: false, removable: true },
      ],
      browserTabs: [
        { id: 10, title: 'First' },
        { id: 20, title: 'Second' },
        { id: 30, title: 'Third' },
      ],
    })

    expect(tabs.map((tab) => ({ id: tab.id, title: tab.title }))).toEqual([
      { id: 10, title: 'First' },
      { id: 20, title: 'Second' },
      { id: 30, title: 'Third' },
    ])
  })

  it('appends detached conversations after live browser tabs', () => {
    const tabs = mergeChatTabsWithBrowserTabs({
      runtimeTabs: [
        {
          id: 99,
          detached: true,
          title: 'Closed lesson',
          hasConversation: true,
          isLoading: true,
          hasError: false,
          removable: true,
        },
        {
          id: 10,
          detached: false,
          hasConversation: true,
          isLoading: false,
          hasError: true,
          removable: true,
        },
      ],
      browserTabs: [{ id: 10, title: 'Live lesson' }],
      activeBrowserTabId: 10,
    })

    expect(tabs).toEqual([
      {
        id: 10,
        title: 'Live lesson',
        isLoading: false,
        hasError: true,
        removable: true,
      },
      {
        id: 99,
        title: 'Closed lesson',
        detached: true,
        isLoading: true,
        hasError: false,
        removable: true,
      },
    ])
  })

  it('hides detached runtime tabs without a conversation', () => {
    const tabs = mergeChatTabsWithBrowserTabs({
      runtimeTabs: [
        {
          id: 99,
          detached: true,
          title: 'Draft only',
          hasConversation: false,
          isLoading: false,
          hasError: false,
          removable: true,
        },
      ],
      browserTabs: [{ id: 10, title: 'Current page' }],
      activeBrowserTabId: 10,
    })

    expect(tabs).toEqual([
      {
        id: 10,
        title: 'Current page',
        isLoading: false,
        hasError: false,
        removable: false,
      },
    ])
  })

  it('adds the active browser placeholder while a detached session is shown', () => {
    const detachedRuntimeTab = {
      id: 99,
      detached: true,
      title: 'Closed lesson',
      hasConversation: true,
      isLoading: false,
      hasError: false,
      removable: true,
    }
    const browserTabs = [
      { id: 10, title: 'Current page' },
      { id: 20, title: 'Other page' },
    ]

    expect(
      mergeChatTabsWithBrowserTabs({
        runtimeTabs: [detachedRuntimeTab],
        browserTabs,
        activeBrowserTabId: 10,
        activeSessionId: 99,
      }),
    ).toEqual([
      {
        id: 99,
        title: 'Closed lesson',
        detached: true,
        isLoading: false,
        hasError: false,
        removable: true,
      },
      {
        id: 10,
        title: 'Current page',
        isLoading: false,
        hasError: false,
        removable: false,
      },
    ])

    expect(
      mergeChatTabsWithBrowserTabs({
        runtimeTabs: [
          detachedRuntimeTab,
          {
            id: 10,
            hasConversation: true,
            isLoading: false,
            hasError: false,
            removable: true,
          },
        ],
        browserTabs,
        activeBrowserTabId: 10,
        activeSessionId: 99,
      }).filter((tab) => tab.id === 10),
    ).toHaveLength(1)
  })

  it('maps loading, error and removable state from a session', () => {
    expect(
      toChatTabRuntimeDescriptor(7, {
        isSending: true,
        error: { message: 'Failed' },
      }),
    ).toEqual({
      id: 7,
      detached: false,
      title: null,
      favIconUrl: null,
      hasConversation: false,
      isLoading: true,
      hasError: true,
      removable: true,
    })
  })

  it('aborts only the removed tab session', () => {
    const removed = new AbortController()
    const background = new AbortController()

    expect(abortChatTabSession({ abortController: removed })).toBe(true)
    expect(removed.signal.aborted).toBe(true)
    expect(background.signal.aborted).toBe(false)
    expect(abortChatTabSession(null)).toBe(false)
  })

  it('cycles through displayed chat tabs in browser order', () => {
    const tabs = [{ id: 10 }, { id: 20 }, { id: 30 }]
    expect(getAdjacentChatTabId(tabs, 20, 1)).toBe(30)
    expect(getAdjacentChatTabId(tabs, 30, 1)).toBe(10)
    expect(getAdjacentChatTabId(tabs, 10, -1)).toBe(30)
  })

  it('updates navigation metadata without clearing chat activity', () => {
    const session = {
      conversation: { id: 'conversation-1' },
      messages: [{ id: 'message-1' }],
      composerText: 'Keep this draft',
      currentUrl: 'https://example.com/one',
    }

    expect(updateChatSessionUrl(session, 'https://example.com/two')).toBe(true)
    expect(session).toEqual({
      conversation: { id: 'conversation-1' },
      messages: [{ id: 'message-1' }],
      composerText: 'Keep this draft',
      currentUrl: 'https://example.com/two',
    })
  })
})
