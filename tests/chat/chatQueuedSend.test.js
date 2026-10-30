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
    startConversationForActiveTab: vi.fn(async () => ({
      conversation: { id: 'conv-1', providerId: 'gemini', modelId: 'gemini-3-flash-preview' },
      tab: { id: 101 },
    })),
    send: vi.fn(),
  },
}))

vi.mock('@/lib/db/conversationRepository.js', () => ({
  conversationRepository: {
    getGenerationPath: vi.fn(async () => []),
    getSourcesByIds: vi.fn(async () => []),
    recoverStreamingMessages: vi.fn(async () => 0),
    updateConversationMetadata: vi.fn(async () => ({})),
    getConversation: vi.fn(),
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
  handleChatBrowserTabRemoved,
  removeChatTabSession,
  syncChatForActiveTab,
  sendChatMessage,
} from '@/stores/chatStore.svelte.js'
import { chatService } from '@/services/chat/chatService.js'

const TAB_A = 101
const TAB_B = 202

/**
 * Drive `chatService.send` by hand so a test can act at the exact moment the
 * generation is in flight — which is the whole point of the queue.
 */
function deferredSend({ onUserMessageContent = null } = {}) {
  let release
  const started = new Promise((resolveStarted) => {
    chatService.send.mockImplementation(async ({ content, onUserMessage }) => {
      resolveStarted({ content, onUserMessage })
      await new Promise((r) => (release = r))
      onUserMessage?.({
        id: `msg-${content}`,
        role: 'user',
        content: onUserMessageContent ?? content,
      })
      return { assistant: { id: 'a1' }, transient: {}, diagnostics: {} }
    })
  })
  return { started, finish: () => release() }
}

beforeEach(async () => {
  chatService.send.mockReset()
  await syncChatForActiveTab(TAB_A, { url: 'https://a.example' })
  chatState.conversation = { id: 'conv-1' }
  chatState.activeConversationId = 'conv-1'
  chatState.activeSourceDismissed = true // skip the page-capture path
})

afterEach(() => {
  removeChatTabSession(TAB_A, { detachActiveTab: true })
  removeChatTabSession(TAB_B, { detachActiveTab: true })
  vi.clearAllMocks()
})

describe('queued send', () => {
  it('does not ground a detached page and preserves explicit tab attachments', async () => {
    chatState.pendingAttachments = [{ tabId: TAB_B, title: 'Tab B', sourceKind: 'webpage' }]
    chatService.send.mockResolvedValue({ assistant: { id: 'a1' }, transient: {}, diagnostics: {} })

    expect(handleChatBrowserTabRemoved(TAB_A)).toBe(true)
    await sendChatMessage('detached question')

    expect(chatService.send).toHaveBeenCalledOnce()
    expect(chatService.send.mock.calls[0][0]).toMatchObject({
      activeSource: null,
      sourceRequired: false,
      pendingAttachments: [{ tabId: TAB_B, title: 'Tab B', sourceKind: 'webpage' }],
    })
  })

  it('starts disarmed', () => {
    expect(chatState.queuedSend).toBe(false)
  })

  it('sends the composer content when armed and the generation finishes cleanly', async () => {
    const first = deferredSend()
    chatState.composerText = 'first'
    const inFlight = sendChatMessage()
    await first.started

    // The user types the next question and hits Enter mid-stream.
    chatState.composerText = 'second'
    chatState.queuedSend = true

    first.finish()
    await inFlight
    await vi.waitFor(() => expect(chatService.send).toHaveBeenCalledTimes(2))

    expect(chatService.send.mock.calls[1][0].content).toBe('second')
    expect(chatState.queuedSend).toBe(false)
  })

  it('does not send when the generation was aborted', async () => {
    chatService.send.mockImplementation(async () => {
      chatState.abortController.abort()
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    chatState.composerText = 'first'
    const inFlight = sendChatMessage()
    chatState.composerText = 'second'
    chatState.queuedSend = true
    await inFlight

    expect(chatService.send).toHaveBeenCalledTimes(1)
    // Disarmed rather than left pending: a flag surviving an abort would fire
    // on a later generation and send a message the user never asked for.
    expect(chatState.queuedSend).toBe(false)
    expect(chatState.composerText).toBe('second')
  })

  it('does not send when the generation failed', async () => {
    chatService.send.mockImplementation(async () => {
      throw new Error('provider exploded')
    })
    chatState.composerText = 'first'
    chatState.queuedSend = true
    await sendChatMessage()

    expect(chatService.send).toHaveBeenCalledTimes(1)
    expect(chatState.queuedSend).toBe(false)
    expect(chatState.composerText).toBe('first')
  })

  it('a stale arming from an aborted turn does not fire on the next turn', async () => {
    chatService.send.mockImplementationOnce(async () => {
      chatState.abortController.abort()
      throw Object.assign(new Error('aborted'), { name: 'AbortError' })
    })
    chatState.composerText = 'first'
    chatState.queuedSend = true
    await sendChatMessage()

    // A perfectly ordinary next turn must not drag the old arming along.
    chatService.send.mockImplementation(async ({ onUserMessage, content }) => {
      onUserMessage?.({ id: 'm2', role: 'user', content })
      return { assistant: { id: 'a2' }, transient: {}, diagnostics: {} }
    })
    chatState.composerText = 'second'
    await sendChatMessage()

    expect(chatService.send).toHaveBeenCalledTimes(2)
  })

  it('disarms without sending when the user has moved to another tab', async () => {
    const first = deferredSend()
    chatState.composerText = 'first'
    const inFlight = sendChatMessage()
    await first.started

    chatState.composerText = 'second'
    chatState.queuedSend = true
    await syncChatForActiveTab(TAB_B, { url: 'https://b.example' })

    first.finish()
    await inFlight

    expect(chatService.send).toHaveBeenCalledTimes(1)
    await syncChatForActiveTab(TAB_A)
    expect(chatState.queuedSend).toBe(false)
    expect(chatState.composerText).toBe('second')
  })

  // Defensive: the UI locks the composer while armed, so this shouldn't be
  // reachable by hand — but the drain must not send an empty message either way.
  it('does not send when the armed composer was emptied again', async () => {
    const first = deferredSend()
    chatState.composerText = 'first'
    const inFlight = sendChatMessage()
    await first.started

    chatState.composerText = 'second'
    chatState.queuedSend = true
    chatState.composerText = '' // user changed their mind and deleted it

    first.finish()
    await inFlight

    expect(chatService.send).toHaveBeenCalledTimes(1)
    expect(chatState.queuedSend).toBe(false)
  })
})

describe('composer is not clobbered by a late onUserMessage', () => {
  it('clears the draft when it is still the message that was sent', async () => {
    const first = deferredSend()
    chatState.composerText = 'first'
    const inFlight = sendChatMessage()
    await first.started

    first.finish()
    await inFlight

    expect(chatState.composerText).toBe('')
  })

  it('keeps text the user typed while the send was still in flight', async () => {
    const first = deferredSend()
    chatState.composerText = 'first'
    const inFlight = sendChatMessage()
    await first.started

    // onUserMessage lands only after the page capture and addMessage, so the
    // user can easily have started the next question by then.
    chatState.composerText = 'next question'

    first.finish()
    await inFlight

    expect(chatState.composerText).toBe('next question')
  })

  it('keeps a skill the user picked while the send was still in flight', async () => {
    const first = deferredSend()
    chatState.composerText = 'first'
    chatState.selectedSkill = { skillId: 'explain', name: 'Explain' }
    const inFlight = sendChatMessage()
    await first.started

    chatState.selectedSkill = { skillId: 'summarize', name: 'Summarize' }

    first.finish()
    await inFlight

    expect(chatState.selectedSkill?.skillId).toBe('summarize')
  })
})

// What the empty-state skill chips rest on: one tap picks a skill and submits,
// with nothing typed. If a bare skill ever stops being sendable, those chips
// silently become no-ops.
describe('skill-only send', () => {
  it('sends a bare skill with no composer text', async () => {
    chatService.send.mockResolvedValue({
      assistant: { id: 'a1' },
      transient: {},
      diagnostics: {},
    })
    chatState.composerText = ''
    chatState.selectedSkill = {
      skillId: 'summarize',
      skillVersion: 3,
      name: 'Summarize',
      instructionSnapshot: 'Summarize the source.',
      sourceMode: 'auto',
    }

    expect(canSendChat()).toBe(true)
    await sendChatMessage()

    expect(chatService.send).toHaveBeenCalledTimes(1)
    expect(chatService.send.mock.calls[0][0].content).toBe('')
    expect(chatService.send.mock.calls[0][0].skillInvocation).toMatchObject({
      skillId: 'summarize',
    })
  })
})
