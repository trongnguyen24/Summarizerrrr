// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushSync, mount } from 'svelte'
import ChatModelSelect from '../../../src/components/chat/ChatModelSelect.svelte'

// bits-ui scrollIntoView stub
HTMLElement.prototype.scrollIntoView ||= vi.fn()

const scrollLockMock = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn(),
}))

vi.mock('@/lib/utils/overlayScrollLock.js', () => ({
  acquireOverlayScrollLock: scrollLockMock.acquire,
}))

// Mock svelte-i18n
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

// Mock wxt/browser
const mockTabsCreate = vi.fn()
vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      create: (...args) => mockTabsCreate(...args),
    },
    runtime: {
      getURL: (path) => `chrome-extension://mock-id/${path}`,
    },
  },
}))

// Mock settings store
let settingsMock = {
  chat: {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    quickModels: [],
  },
}
vi.mock('@/stores/settingsStore.svelte.js', () => ({
  get settings() {
    return settingsMock
  },
}))

// Mock chat store
let chatStateMock = {
  isSending: false,
}
const mockSetChatModel = vi.fn()
let effectiveChatModelMock = { provider: 'gemini', model: 'gemini-3-flash-preview' }

vi.mock('@/stores/chatStore.svelte.js', () => ({
  get chatState() {
    return chatStateMock
  },
  setChatModel: (...args) => mockSetChatModel(...args),
  getEffectiveChatModel: () => effectiveChatModelMock,
}))

// Mock providerRegistry
let providerEntries = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    iconifyIcon: 'simple-icons:google',
    defaultModel: 'gemini-3-flash-preview',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    iconifyIcon: 'simple-icons:openai',
    defaultModel: 'gpt-4o',
  },
}
let configuredProviders = new Set(['gemini', 'openai'])

vi.mock('@/lib/providers/providerRegistry.js', () => ({
  resolveProviderEntry: (id) => providerEntries[id] || null,
  isProviderConfigured: (id) => configuredProviders.has(id),
}))

function mountModelSelect(props = {}) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mount(ChatModelSelect, { target: host, props })
  flushSync()
  return host
}

describe('ChatModelSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scrollLockMock.acquire.mockReturnValue(scrollLockMock.release)
    document.body.innerHTML = ''
    settingsMock = {
      chat: {
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        quickModels: [],
      },
    }
    chatStateMock = {
      isSending: false,
    }
    effectiveChatModelMock = { provider: 'gemini', model: 'gemini-3-flash-preview' }
    configuredProviders = new Set(['gemini', 'openai'])
  })

  it('renders trigger with provider icon and a decoded, truncated model name', () => {
    const host = mountModelSelect()

    const trigger = host.querySelector('[data-testid="model-trigger"]')
    expect(trigger).toBeTruthy()
    expect(trigger.getAttribute('aria-label')).toContain('gemini-3-flash-preview')

    // Label should be truncated
    const label = host.querySelector('[data-testid="model-name"]')
    expect(label.textContent).toBe('Gemini 3 flash preview')

    host.remove()
  })

  it('disabled when sending is true', () => {
    chatStateMock.isSending = true
    const host = mountModelSelect()

    const trigger = host.querySelector('[data-testid="model-trigger"]')
    expect(trigger.getAttribute('disabled')).not.toBeNull()
    expect(trigger.className).toContain('pointer-events-none')

    host.remove()
  })

  it('shows only decoded model names in the menu, without provider or Default prefixes', () => {
    settingsMock.chat.quickModels = [
      { provider: 'openai', model: 'openai%2Fgpt-5-mini' },
    ]
    const host = mountModelSelect()

    host.querySelector('[data-testid="model-trigger"]').click()
    flushSync()

    const options = [...document.body.querySelectorAll('[data-testid="model-option-label"]')]
      .map((option) => option.textContent.trim())

    expect(options).toContain('Gemini 3 flash preview')
    expect(options).toContain('Gpt 5 mini')
    expect(options.some((label) => label.startsWith('Default'))).toBe(false)
    expect(options.some((label) => label.includes('Google Gemini'))).toBe(false)

    host.remove()
  })

  it('locks the OverlayScrollbars viewport while the menu is open', () => {
    const host = mountModelSelect()

    host.querySelector('[data-testid="model-trigger"]').click()
    flushSync()

    expect(scrollLockMock.acquire).toHaveBeenCalledTimes(1)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    flushSync()

    expect(scrollLockMock.release).toHaveBeenCalledTimes(1)

    host.remove()
  })

  it('shows warning icon when provider is unconfigured', () => {
    configuredProviders.delete('gemini') // make gemini unconfigured
    const host = mountModelSelect()

    const trigger = host.querySelector('[data-testid="model-trigger"]')
    expect(trigger.getAttribute('data-warning')).toBe('true')

    host.remove()
  })

  it('renders trigger with effort suffix when provider supports reasoning and effort is set to high', () => {
    chatStateMock.reasoningLevel = 'high'
    const host = mountModelSelect()

    const trigger = host.querySelector('[data-testid="model-trigger"]')
    expect(trigger.textContent).toContain('Gemini 3 flash preview')
    expect(trigger.textContent).toContain('High')

    const effortLabel = host.querySelector('[data-testid="model-effort"]')
    expect(effortLabel).toBeTruthy()
    expect(effortLabel.textContent).toBe('High')

    host.remove()
  })

  it('hides effort suffix when reasoning level is auto (provider-default)', () => {
    chatStateMock.reasoningLevel = 'provider-default'
    const host = mountModelSelect()

    const trigger = host.querySelector('[data-testid="model-trigger"]')
    expect(trigger.textContent).toContain('Gemini 3 flash preview')
    expect(trigger.textContent).not.toContain('Auto')

    const effortLabel = host.querySelector('[data-testid="model-effort"]')
    expect(effortLabel).toBeNull()

    host.remove()
  })
})
