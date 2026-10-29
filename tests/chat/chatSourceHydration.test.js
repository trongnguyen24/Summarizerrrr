import { afterEach, describe, expect, it, vi } from 'vitest'
import { createChatSourceService } from '@/services/chat/chatSourceService.js'
import { createChatService } from '@/services/chat/chatService.js'
import { resolveSources } from '@/lib/chat/contextPipeline/sourceResolver.js'

const settings = { selectedProvider: 'gemini', selectedGeminiModel: 'gemini-test' }

function stubSource(id, overrides = {}) {
  return {
    id,
    sourceKey: `https://example.com/${id}:webpage:hash`,
    normalizedUrl: 'https://example.com/article',
    url: 'https://example.com/article',
    title: 'Article',
    sourceType: 'webpage',
    contentHash: 'fnv1a-stub',
    originalLength: 100,
    capturedAt: '2026-07-10T00:00:00.000Z',
    contentOmitted: true,
    ...overrides,
  }
}

/** Fake of the browser tabs API. Created tabs load immediately unless `loading` is set. */
function createBrowser({ openTabs = [], createdId = 900, loading = false } = {}) {
  const tabs = [...openTabs]
  const removed = []
  const listeners = new Set()
  let nextId = createdId
  return {
    tabs,
    removed,
    listeners,
    api: {
      tabs: {
        query: async () => [...tabs],
        create: async ({ url, active }) => {
          const tab = { id: nextId++, url, active, status: loading ? 'loading' : 'complete' }
          tabs.push(tab)
          return tab
        },
        get: async (id) => tabs.find((tab) => tab.id === id) || null,
        remove: async (id) => {
          removed.push(id)
          const index = tabs.findIndex((tab) => tab.id === id)
          if (index !== -1) tabs.splice(index, 1)
        },
        onUpdated: {
          addListener: (listener) => listeners.add(listener),
          removeListener: (listener) => listeners.delete(listener),
        },
      },
    },
  }
}

function createHydrationRepository() {
  const hydrateCalls = []
  return {
    hydrateCalls,
    async hydrateSourceContent(id, content) {
      hydrateCalls.push({ id, content })
      return { id, rawContent: content }
    },
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('chatSourceService.hydrateSource', () => {
  it('uses an already-open tab with the same URL, does not create one, and does not close it', async () => {
    const browser = createBrowser({
      openTabs: [{ id: 5, url: 'https://example.com/article#top', status: 'complete' }],
    })
    const repository = createHydrationRepository()
    const createSpy = vi.spyOn(browser.api.tabs, 'create')
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: async ({ tabId }) => ({ content: `captured from ${tabId}` }),
      repository,
    })

    const result = await service.hydrateSource(stubSource('stub-1'))

    expect(createSpy).not.toHaveBeenCalled()
    expect(browser.removed).toEqual([])
    expect(repository.hydrateCalls).toEqual([{ id: 'stub-1', content: 'captured from 5' }])
    expect(result).toEqual({ source: { id: 'stub-1', rawContent: 'captured from 5' } })
  })

  it('creates a background tab, captures from it, and closes it again', async () => {
    const browser = createBrowser()
    const repository = createHydrationRepository()
    const captured = []
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: async ({ tabId, url }) => {
        captured.push({ tabId, url })
        return { content: 'Full article text.' }
      },
      repository,
    })

    const result = await service.hydrateSource(stubSource('stub-2'))

    expect(captured).toEqual([{ tabId: 900, url: 'https://example.com/article' }])
    expect(browser.removed).toEqual([900])
    expect(browser.tabs.some((tab) => tab.id === 900)).toBe(false)
    expect(repository.hydrateCalls).toEqual([{ id: 'stub-2', content: 'Full article text.' }])
    expect(result.source).toMatchObject({ id: 'stub-2' })
  })

  it('closes the background tab when the capture fails and returns an error', async () => {
    const browser = createBrowser()
    const repository = createHydrationRepository()
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: async () => ({ content: '' }),
      repository,
    })

    const result = await service.hydrateSource(stubSource('stub-3'))

    expect(result.error).toEqual(expect.any(String))
    expect(browser.removed).toEqual([900])
    expect(repository.hydrateCalls).toEqual([])
  })

  it('on timeout: returns an error, closes the tab, removes the listener, and never persists a late capture', async () => {
    vi.useFakeTimers()
    const browser = createBrowser()
    const repository = createHydrationRepository()
    let resolveCapture
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: () => new Promise((resolve) => { resolveCapture = resolve }),
      repository,
    })

    const pending = service.hydrateSource(stubSource('stub-4'), { timeoutMs: 1000 })
    await vi.advanceTimersByTimeAsync(1000)
    const result = await pending

    expect(result.error).toEqual(expect.any(String))
    expect(browser.removed).toEqual([900])
    expect(browser.listeners.size).toBe(0)

    // The capture finishes after the caller was told it failed.
    resolveCapture({ content: 'Too late.' })
    await vi.advanceTimersByTimeAsync(0)
    expect(repository.hydrateCalls).toEqual([])
  })

  it('closes a tab whose creation resolves after the timeout, and does not capture from it', async () => {
    vi.useFakeTimers()
    const browser = createBrowser()
    const repository = createHydrationRepository()
    let resolveCreate
    browser.api.tabs.create = () => new Promise((resolve) => { resolveCreate = resolve })
    const captureSpy = vi.fn(async () => ({ content: 'unused' }))
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: captureSpy,
      repository,
    })

    const pending = service.hydrateSource(stubSource('stub-5'), { timeoutMs: 1000 })
    await vi.advanceTimersByTimeAsync(1000)
    const result = await pending
    expect(result.error).toEqual(expect.any(String))

    resolveCreate({ id: 901, url: 'https://example.com/article', status: 'complete' })
    await vi.advanceTimersByTimeAsync(0)

    expect(browser.removed).toEqual([901])
    expect(captureSpy).not.toHaveBeenCalled()
    expect(repository.hydrateCalls).toEqual([])
  })

  it('passes over a discarded open tab and opens a background tab instead', async () => {
    const browser = createBrowser({
      openTabs: [{ id: 5, url: 'https://example.com/article', status: 'unloaded', discarded: true }],
    })
    const repository = createHydrationRepository()
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: async ({ tabId }) => ({ content: `captured from ${tabId}` }),
      repository,
    })

    const result = await service.hydrateSource(stubSource('stub-d'))

    expect(repository.hydrateCalls).toEqual([{ id: 'stub-d', content: 'captured from 900' }])
    expect(browser.removed).toEqual([900])
    expect(result.source).toMatchObject({ id: 'stub-d' })
  })

  it('waits for a still-loading open tab before capturing, and leaves it open', async () => {
    const openTab = { id: 5, url: 'https://example.com/article', status: 'loading' }
    const browser = createBrowser({ openTabs: [openTab] })
    const repository = createHydrationRepository()
    const captureStatuses = []
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: async ({ tabId }) => {
        captureStatuses.push(openTab.status)
        return { content: `captured from ${tabId}` }
      },
      repository,
    })

    const pending = service.hydrateSource(stubSource('stub-l'))
    await vi.waitFor(() => expect(browser.listeners.size).toBe(1))
    expect(captureStatuses).toEqual([])
    openTab.status = 'complete'
    for (const listener of browser.listeners) listener(5, { status: 'complete' })
    const result = await pending

    expect(captureStatuses).toEqual(['complete'])
    expect(browser.removed).toEqual([])
    expect(browser.listeners.size).toBe(0)
    expect(result.source).toMatchObject({ id: 'stub-l' })
  })

  it('abort cancels: closes the background tab, removes the listener, and never persists', async () => {
    const browser = createBrowser({ loading: true })
    const repository = createHydrationRepository()
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: async () => ({ content: 'late content' }),
      repository,
    })
    const controller = new AbortController()

    const pending = service.hydrateSource(stubSource('stub-a'), { signal: controller.signal })
    await vi.waitFor(() => expect(browser.listeners.size).toBe(1))
    controller.abort()
    const result = await pending
    for (const listener of [...browser.listeners]) listener(900, { status: 'complete' })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(result).toEqual({ error: 'Cancelled.' })
    expect(browser.removed).toEqual([900])
    expect(browser.listeners.size).toBe(0)
    expect(repository.hydrateCalls).toEqual([])
  })

  it('skips YouTube comments without touching tabs', async () => {
    const browser = createBrowser()
    const querySpy = vi.spyOn(browser.api.tabs, 'query')
    const service = createChatSourceService({
      browserApi: browser.api,
      getPageContentFn: async () => ({ content: 'unused' }),
      repository: createHydrationRepository(),
    })

    const result = await service.hydrateSource(stubSource('stub-6', { sourceType: 'youtubeComments' }))

    expect(result.error).toEqual(expect.any(String))
    expect(querySpy).not.toHaveBeenCalled()
  })
})

function createChatRepository() {
  const conversations = new Map()
  const messages = new Map()
  const sources = new Map()
  let sequence = 0
  const repo = {
    sources,
    async createConversation(data) {
      const conversation = { id: 'conversation-1', ...data }
      conversations.set(conversation.id, conversation)
      return { conversation }
    },
    async getConversation(id) {
      return conversations.get(id) || null
    },
    async updateConversationMetadata(id, data) {
      const updated = { ...conversations.get(id), ...data }
      conversations.set(id, updated)
      return updated
    },
    async addMessage(conversationId, data) {
      const message = { id: `message-${++sequence}`, conversationId, sequence, ...data }
      messages.set(message.id, message)
      return message
    },
    async getMessage(id) {
      return messages.get(id) || null
    },
    async listMessagesByConversation(id) {
      return [...messages.values()].filter((message) => message.conversationId === id)
    },
    async getGenerationPath(id) {
      return [...messages.values()].filter((message) => message.conversationId === id)
    },
    async getGenerationContextForUser(userMessageId) {
      const userMessage = messages.get(userMessageId)
      const all = [...messages.values()].filter((message) => message.conversationId === userMessage.conversationId)
      const userIndex = all.findIndex((message) => message.id === userMessageId)
      return { history: all.slice(0, userIndex), currentUserMessage: userMessage }
    },
    async createStreamingAssistantMessage(conversationId, data) {
      const message = { id: `message-${++sequence}`, conversationId, sequence, status: 'streaming', ...data }
      messages.set(message.id, message)
      return message
    },
    async checkpointStreamingContent() {
      return null
    },
    async markMessageStreaming(messageId) {
      const message = messages.get(messageId)
      if (message) message.status = 'streaming'
      return message || null
    },
    async finalizeStreamingAssistantMessage(messageId, updates) {
      const message = messages.get(messageId)
      if (!message) return null
      Object.assign(message, updates)
      return message
    },
    async getSourceById(id) {
      return sources.get(id) || null
    },
    async getSourcesByIds(ids) {
      return ids.map((id) => sources.get(id)).filter(Boolean)
    },
    async hydrateSourceContent(id, content) {
      const existing = sources.get(id)
      if (!existing || existing.contentOmitted !== true) return null
      const hydrated = { ...existing, rawContent: content, contentOmitted: false }
      sources.set(id, hydrated)
      return hydrated
    },
  }
  return repo
}

function createHydratingService({ repository, hydrateSource, events, probeWarnings = [] }) {
  return createChatService({
    repository,
    sourceService: {
      getActiveTab: async () => ({ id: 1, title: 'Example' }),
      hydrateSource: async (source) => {
        events.push(`hydrate:${source.id}`)
        return hydrateSource(source)
      },
    },
    buildPipeline: async (input) => {
      events.push('build')
      return {
        system: 'System',
        messages: [{ role: 'user', content: input.currentUserMessage.content }],
        warnings: probeWarnings,
      }
    },
    streamRequest: async function* () {
      yield { chunk: 'Answer', fullText: 'Answer', isComplete: false }
      yield { chunk: '', fullText: 'Answer', isComplete: true, usage: null }
    },
    onPersisted: () => {},
  })
}

describe('chatService hydration of stub sources', () => {
  it('re-captures stub sources in history before the model call, and leaves full sources alone', async () => {
    const repository = createChatRepository()
    repository.sources.set('stub-h1', stubSource('stub-h1'))
    repository.sources.set('full-h1', { id: 'full-h1', rawContent: 'Full text', normalizedUrl: 'https://example.com/full', sourceType: 'webpage' })
    const events = []
    const service = createHydratingService({
      repository,
      events,
      hydrateSource: async (source) => ({ source: { ...source, rawContent: 'Recaptured' } }),
    })
    const { conversation } = await service.startConversationForActiveTab({ settings })
    await repository.addMessage(conversation.id, { role: 'user', content: 'First', attachmentRefs: ['stub-h1', 'full-h1'] })

    await service.send({
      conversation,
      content: 'Follow up',
      sourceRequired: false,
      settings,
      onStatus: (status) => events.push(status === null ? 'status:done' : `status:${status.type}`),
    })

    expect(events.slice(0, 4)).toEqual(['status:hydrating', 'hydrate:stub-h1', 'status:done', 'build'])
    expect(events.filter((event) => event === 'hydrate:full-h1')).toEqual([])
  })

  it('a failed hydration still generates, and its warning survives the pipeline warnings in the last onWarnings call', async () => {
    const repository = createChatRepository()
    repository.sources.set('stub-h2', stubSource('stub-h2', { title: 'Lesson 3' }))
    const events = []
    const collected = []
    const service = createHydratingService({
      repository,
      events,
      probeWarnings: ['Pipeline warning from assembly'],
      hydrateSource: async () => ({ error: 'Timed out waiting for the page to load.' }),
    })
    const { conversation } = await service.startConversationForActiveTab({ settings })
    await repository.addMessage(conversation.id, { role: 'user', content: 'First', attachmentRefs: ['stub-h2'] })

    const result = await service.send({
      conversation,
      content: 'Follow up',
      sourceRequired: false,
      settings,
      onWarnings: (warnings) => collected.push(warnings),
    })

    expect(result.assistant).toMatchObject({ content: 'Answer', status: 'complete' })
    const last = collected.at(-1)
    expect(last).toContain('Pipeline warning from assembly')
    expect(last).toContain('Could not re-capture page content: Lesson 3 — Timed out waiting for the page to load.')
  })

  it('retry on a first turn with empty history hydrates the user message attachments', async () => {
    const repository = createChatRepository()
    repository.sources.set('stub-h3', stubSource('stub-h3'))
    const events = []
    const service = createHydratingService({
      repository,
      events,
      hydrateSource: async (source) => ({ source }),
    })
    const { conversation } = await service.startConversationForActiveTab({ settings })
    const user = await repository.addMessage(conversation.id, { role: 'user', content: 'First', attachmentRefs: ['stub-h3'] })

    await service.retry({ conversation, messages: [user], userMessageId: user.id, settings })

    expect(events).toContain('hydrate:stub-h3')
  })

  it('continue hydrates the original turn attachments before the pipeline is built', async () => {
    const repository = createChatRepository()
    repository.sources.set('stub-h4', stubSource('stub-h4'))
    const events = []
    const service = createHydratingService({
      repository,
      events,
      hydrateSource: async (source) => ({ source }),
    })
    const { conversation } = await service.startConversationForActiveTab({ settings })
    const user = await repository.addMessage(conversation.id, { role: 'user', content: 'Summarize', attachmentRefs: ['stub-h4'] })
    const partial = await repository.addMessage(conversation.id, {
      role: 'assistant',
      content: 'Partial',
      status: 'aborted',
      parentId: user.id,
    })

    await service.continueResponse({ conversation, assistantMessageId: partial.id, settings })

    expect(events.indexOf('hydrate:stub-h4')).toBeGreaterThanOrEqual(0)
    expect(events.indexOf('hydrate:stub-h4')).toBeLessThan(events.indexOf('build'))
  })
})

describe('sourceResolver and stub sources', () => {
  it('treats a stub source as missing so it never reaches the prompt', async () => {
    const sources = new Map([
      ['stub-r1', stubSource('stub-r1')],
      ['full-r1', { id: 'full-r1', normalizedUrl: 'https://example.com/full', rawContent: 'Full text' }],
    ])
    const result = await resolveSources({
      conversationSourceRefs: ['stub-r1', 'full-r1'],
      repository: { getSourceById: async (id) => sources.get(id) },
    })

    expect(result.conversationSources.map((source) => source.sourceId)).toEqual(['full-r1'])
    expect(result.unresolvedRefs.map((ref) => ref.sourceId)).toEqual(['stub-r1'])
  })
})
