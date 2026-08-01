import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createGoogleGenerativeAI: vi.fn(),
  createOpenAI: vi.fn(),
  createOpenAICompatible: vi.fn(),
  createCerebras: vi.fn(),
  createOllamaProxyModel: vi.fn(),
  generateText: vi.fn(),
  streamText: vi.fn(),
  requiresApiProxy: vi.fn(),
  getBrowserCompatibility: vi.fn(),
  shouldEnableAutoFallback: vi.fn(),
  shouldEnableApiKeyRetry: vi.fn(),
  getCurrentGeminiModel: vi.fn(),
  getNextFallbackModel: vi.fn(),
  isOverloadError: vi.fn(),
  updateModelStatus: vi.fn(),
}))

vi.mock('ai', () => ({
  generateText: mocks.generateText,
  streamText: mocks.streamText,
  wrapLanguageModel: vi.fn(({ model }) => model),
  extractReasoningMiddleware: vi.fn(),
}))
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: mocks.createGoogleGenerativeAI,
}))
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: mocks.createOpenAI }))
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: vi.fn() }))
vi.mock('@ai-sdk/openai-compatible', () => ({ createOpenAICompatible: mocks.createOpenAICompatible }))
vi.mock('@openrouter/ai-sdk-provider', () => ({ createOpenRouter: vi.fn() }))
vi.mock('@ai-sdk/groq', () => ({ createGroq: vi.fn() }))
vi.mock('@ai-sdk/cerebras', () => ({ createCerebras: mocks.createCerebras }))
vi.mock('ai-sdk-ollama', () => ({ createOllama: vi.fn() }))
vi.mock('@/lib/api/ollamaProxyModel.js', () => ({
  createOllamaProxyModel: mocks.createOllamaProxyModel,
}))
vi.mock('@/lib/utils/contextDetection.js', () => ({
  requiresApiProxy: mocks.requiresApiProxy,
}))
vi.mock('@/lib/utils/browserDetection.js', () => ({
  getBrowserCompatibility: mocks.getBrowserCompatibility,
}))
vi.mock('@/lib/utils/geminiAutoFallback.js', () => ({
  isOverloadError: mocks.isOverloadError,
  isQuotaError: vi.fn(),
  getNextFallbackModel: mocks.getNextFallbackModel,
  getNextAdvancedFallbackModel: vi.fn(),
  shouldEnableAutoFallback: mocks.shouldEnableAutoFallback,
  shouldEnableApiKeyRetry: mocks.shouldEnableApiKeyRetry,
  getCurrentGeminiModel: mocks.getCurrentGeminiModel,
}))
vi.mock('@/stores/summaryStore.svelte.js', () => ({
  updateModelStatus: mocks.updateModelStatus,
}))
vi.mock('@/lib/utils/toastUtils.js', () => ({ showModelFallbackToast: vi.fn() }))


import {
  generateContent,
  generateContentRequest,
  generateContentStreamEnhancedRequest,
  generateContentStreamRequest,
} from '@/lib/api/aiSdkAdapter.js'
import { resolveAdapterCall } from '@/lib/providers/providerRegistry.js'

const settings = {
  geminiApiKey: 'test-key',
  selectedGeminiModel: 'gemini-test',
}
const directModel = { modelId: 'gemini-test' }

function textStream(chunks) {
  return (async function* () {
    yield* chunks
  })()
}

function fullStream(chunks) {
  return textStream(chunks.map((text) => ({ type: 'text-delta', text })))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createGoogleGenerativeAI.mockReturnValue(() => directModel)
  mocks.generateText.mockResolvedValue({ text: 'complete response' })
  mocks.streamText.mockImplementation(() =>
    Promise.resolve({ fullStream: fullStream(['one', 'two']) })
  )
  mocks.requiresApiProxy.mockReturnValue(false)
  mocks.getBrowserCompatibility.mockReturnValue({
    isFirefoxMobile: false,
    streamingOptions: { useSmoothing: false },
  })
  mocks.shouldEnableAutoFallback.mockReturnValue(false)
  mocks.shouldEnableApiKeyRetry.mockReturnValue(false)
  mocks.getCurrentGeminiModel.mockReturnValue('gemini-test')
  mocks.getNextFallbackModel.mockReturnValue(null)
  mocks.isOverloadError.mockReturnValue(false)
})

describe('AI SDK generation requests', () => {
  it('keeps positional prompt requests compatible with the previous AI SDK configuration', async () => {
    await expect(generateContent('gemini', settings, 'System', 'Prompt')).resolves.toBe(
      'complete response'
    )

    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: directModel,
        instructions: 'System',
        prompt: 'Prompt',
        maxOutputTokens: 4000,
      })
    )
    expect(mocks.generateText.mock.calls[0][0].messages).toBeUndefined()
  })

  it('preserves message role order and content for direct requests', async () => {
    const messages = [
      { role: 'user', content: 'What is this page about?' },
      { role: 'assistant', content: 'It is about testing.' },
      { role: 'user', content: 'Give a shorter answer.' },
    ]

    await generateContentRequest({
      providerId: 'gemini',
      settings,
      system: 'System',
      messages,
    })

    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ messages, instructions: 'System' })
    )
    expect(mocks.generateText.mock.calls[0][0].prompt).toBeUndefined()
  })

  it('rejects mixed prompt and messages input before creating a provider call', async () => {
    await expect(
      generateContentRequest({
        providerId: 'gemini',
        settings,
        prompt: 'legacy input',
        messages: [{ role: 'user', content: 'chat input' }],
      })
    ).rejects.toThrow('exactly one')

    expect(mocks.createGoogleGenerativeAI).not.toHaveBeenCalled()
    expect(mocks.generateText).not.toHaveBeenCalled()
  })

  it('rebuilds the fallback model without losing messages', async () => {
    const messages = [{ role: 'user', content: 'Keep this turn during retry.' }]
    mocks.shouldEnableAutoFallback.mockReturnValue(true)
    mocks.getCurrentGeminiModel.mockReturnValue('gemini-primary')
    mocks.getNextFallbackModel.mockReturnValue('gemini-fallback')
    mocks.isOverloadError.mockReturnValue(true)
    mocks.generateText
      .mockRejectedValueOnce(new Error('overloaded'))
      .mockResolvedValueOnce({ text: 'fallback response' })

    await expect(
      generateContentRequest({ providerId: 'gemini', settings, messages })
    ).resolves.toBe('fallback response')

    expect(mocks.createGoogleGenerativeAI).toHaveBeenCalledTimes(2)
    expect(mocks.generateText.mock.calls).toHaveLength(2)
    expect(mocks.generateText.mock.calls[0][0].messages).toEqual(messages)
    expect(mocks.generateText.mock.calls[1][0].messages).toEqual(messages)
  })

  it('passes abort signals through direct and proxy request paths', async () => {
    const controller = new AbortController()
    await generateContentRequest({
      providerId: 'gemini',
      settings,
      prompt: 'direct request',
      abortSignal: controller.signal,
    })
    expect(mocks.generateText.mock.calls[0][0].abortSignal).toBe(controller.signal)

    const proxyModel = {
      generateText: vi.fn().mockResolvedValue({ text: 'proxy response' }),
    }
    mocks.requiresApiProxy.mockReturnValue(true)
    mocks.createOllamaProxyModel.mockReturnValue(proxyModel)

    await generateContentRequest({
      providerId: 'ollama',
      settings: { selectedOllamaModel: 'local-model' },
      messages: [{ role: 'user', content: 'proxy request' }],
      abortSignal: controller.signal,
    })
    expect(proxyModel.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'proxy request' }],
        abortSignal: controller.signal,
      })
    )
  })

  it('streams direct chunks and enhanced messages with one completion record', async () => {
    await expect(
      Array.fromAsync(
        generateContentStreamRequest({
          providerId: 'gemini',
          settings,
          messages: [{ role: 'user', content: 'stream me' }],
        })
      )
    ).resolves.toEqual(['one', 'two'])

    const enhanced = await Array.fromAsync(
      generateContentStreamEnhancedRequest({
        providerId: 'gemini',
        settings,
        messages: [{ role: 'user', content: 'enhance me' }],
      })
    )
    expect(enhanced).toEqual([
      { chunk: 'one', fullText: 'one', isComplete: false },
      { chunk: 'two', fullText: 'onetwo', isComplete: false },
      { chunk: '', fullText: 'onetwo', isComplete: true, usage: null },
    ])
    expect(mocks.streamText.mock.calls[1][0].messages).toEqual([
      { role: 'user', content: 'enhance me' },
    ])
  })

  it('throws provider error parts from the full stream instead of completing empty', async () => {
    const providerError = new Error('Request too large for model')
    mocks.streamText.mockResolvedValue({
      fullStream: textStream([{ type: 'error', error: providerError }]),
    })

    await expect(
      Array.fromAsync(
        generateContentStreamEnhancedRequest({
          providerId: 'gemini',
          settings,
          messages: [{ role: 'user', content: 'oversized request' }],
        })
      )
    ).rejects.toBe(providerError)
  })

  it('uses the structured proxy stream contract', async () => {
    const proxyModel = {
      streamText: vi.fn().mockResolvedValue({ fullStream: fullStream(['complete proxy text']) }),
    }
    mocks.requiresApiProxy.mockReturnValue(true)
    mocks.createOllamaProxyModel.mockReturnValue(proxyModel)

    const chunks = await Array.fromAsync(
      generateContentStreamRequest({
        providerId: 'ollama',
        settings: { selectedOllamaModel: 'local-model' },
        messages: [{ role: 'user', content: 'stream through proxy' }],
      })
    )

    expect(chunks).toEqual(['complete proxy text'])
    expect(proxyModel.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'stream through proxy' }],
      })
    )
  })

  it('throws provider error parts from structured proxy streams', async () => {
    const providerError = new Error('Local provider rejected the request')
    const proxyModel = {
      streamText: vi.fn().mockResolvedValue({
        fullStream: textStream([{ type: 'error', error: providerError }]),
      }),
    }
    mocks.requiresApiProxy.mockReturnValue(true)
    mocks.createOllamaProxyModel.mockReturnValue(proxyModel)

    await expect(
      Array.fromAsync(
        generateContentStreamRequest({
          providerId: 'ollama',
          settings: { selectedOllamaModel: 'local-model' },
          messages: [{ role: 'user', content: 'trigger proxy error' }],
        })
      )
    ).rejects.toBe(providerError)
  })

  it('keeps legacy text-only proxy streams compatible', async () => {
    const proxyModel = {
      streamText: vi.fn().mockResolvedValue({ textStream: textStream(['legacy proxy text']) }),
    }
    mocks.requiresApiProxy.mockReturnValue(true)
    mocks.createOllamaProxyModel.mockReturnValue(proxyModel)

    await expect(
      Array.fromAsync(
        generateContentStreamRequest({
          providerId: 'ollama',
          settings: { selectedOllamaModel: 'local-model' },
          prompt: 'legacy proxy stream',
        })
      )
    ).resolves.toEqual(['legacy proxy text'])
  })

  it('annotates Firefox mobile flush errors from enhanced streams', async () => {
    const flushError = new Error('flush failed')
    mocks.getBrowserCompatibility.mockReturnValue({
      isFirefoxMobile: true,
      streamingOptions: { useSmoothing: false },
    })
    mocks.streamText.mockRejectedValue(flushError)

    await expect(
      Array.fromAsync(
        generateContentStreamEnhancedRequest({
          providerId: 'gemini',
          settings,
          messages: [{ role: 'user', content: 'trigger flush error' }],
        })
      )
    ).rejects.toMatchObject({ isFirefoxMobileStreamingError: true })
  })

  it('forwards explicit reasoning to generateText', async () => {
    await generateContentRequest({
      providerId: 'gemini',
      settings,
      prompt: 'chat with reasoning',
      reasoning: 'medium',
    })

    const call = mocks.generateText.mock.calls[0][0]
    expect(call.reasoning).toBe('medium')
  })

  it('forwards explicit reasoning through streaming path', async () => {
    await Array.fromAsync(
      generateContentStreamRequest({
        providerId: 'gemini',
        settings,
        messages: [{ role: 'user', content: 'stream with reasoning' }],
        reasoning: 'high',
      })
    )

    const call = mocks.streamText.mock.calls[0][0]
    expect(call.reasoning).toBe('high')
  })

  it('surfaces reasoning-coercion warnings in the enhanced stream completion event', async () => {
    mocks.streamText.mockImplementation(() =>
      Promise.resolve({
        fullStream: fullStream(['response text']),
        usage: Promise.resolve({ promptTokens: 10, completionTokens: 20 }),
        warnings: Promise.resolve([
          {
            type: 'unsupported-setting',
            setting: 'reasoning',
            message: 'High reasoning is not supported by this model; the provider used Medium.',
          },
        ]),
      })
    )

    const events = await Array.fromAsync(
      generateContentStreamEnhancedRequest({
        providerId: 'gemini',
        settings,
        messages: [{ role: 'user', content: 'test warnings' }],
        reasoning: 'high',
      })
    )

    const completion = events.find((e) => e.isComplete)
    expect(completion).toBeDefined()
    expect(completion.reasoningWarnings).toBeDefined()
    expect(completion.reasoningWarnings).toHaveLength(1)
    expect(completion.reasoningWarnings[0]).toContain('High reasoning is not supported')
  })

  it('does not include non-reasoning warnings in reasoningWarnings', async () => {
    mocks.streamText.mockImplementation(() =>
      Promise.resolve({
        fullStream: fullStream(['response']),
        usage: Promise.resolve({ promptTokens: 5, completionTokens: 10 }),
        warnings: Promise.resolve([
          {
            type: 'unsupported-setting',
            setting: 'temperature',
            message: 'Temperature is not supported.',
          },
        ]),
      })
    )

    const events = await Array.fromAsync(
      generateContentStreamEnhancedRequest({
        providerId: 'gemini',
        settings,
        messages: [{ role: 'user', content: 'test non-reasoning warning' }],
      })
    )

    const completion = events.find((e) => e.isComplete)
    expect(completion).toBeDefined()
    expect(completion.reasoningWarnings).toBeUndefined()
  })
})

describe('Model-routing contract (Phase 1 lock)', () => {
  it('an explicit model via resolveAdapterCall reaches generateText as the constructed model', async () => {
    // resolveAdapterCall overlays settings.selectedGeminiModel = modelId
    const explicitModel = 'gemini-2.5-pro-preview'
    const { providerId: adapterId, settings: resolved } = resolveAdapterCall(
      'gemini',
      explicitModel,
      settings
    )
    expect(adapterId).toBe('gemini')
    expect(resolved.selectedGeminiModel).toBe(explicitModel)

    // Now drive through generateContentRequest to confirm getAISDKModel reads it
    const sentinelModel = { modelId: explicitModel }
    mocks.createGoogleGenerativeAI.mockReturnValue(() => sentinelModel)

    await generateContentRequest({
      providerId: adapterId,
      settings: resolved,
      prompt: 'test explicit model routing',
    })

    // The model passed to generateText must be the sentinel
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: sentinelModel })
    )
  })

  it('a dynamic openai-compatible-* profile id collapses to the openaiCompatible adapter with correct overlay', async () => {
    const profileId = 'openai-compatible-test-uuid-1234'
    const profileSettings = {
      ...settings,
      openaiCompatibleProfiles: [
        {
          id: profileId,
          name: 'My Custom Provider',
          apiKey: 'profile-api-key-xyz',
          baseUrl: 'https://custom.api.example.com/v1',
          defaultModel: 'my-custom-model',
        },
      ],
    }

    const explicitModel = 'custom-model-override'
    const { providerId: adapterId, settings: resolved } = resolveAdapterCall(
      profileId,
      explicitModel,
      profileSettings
    )

    // Must collapse to the openaiCompatible adapter
    expect(adapterId).toBe('openaiCompatible')
    // Overlay must carry the profile's credentials
    expect(resolved.openaiCompatibleApiKey).toBe('profile-api-key-xyz')
    expect(resolved.openaiCompatibleBaseUrl).toBe('https://custom.api.example.com/v1')
    // The model must be the explicit override, not the profile default
    expect(resolved.selectedOpenAICompatibleModel).toBe(explicitModel)

    // Drive through to confirm the adapter reads the overlaid settings
    const profileModel = { modelId: explicitModel }
    mocks.createOpenAICompatible.mockReturnValue(() => profileModel)

    await generateContentRequest({
      providerId: adapterId,
      settings: resolved,
      prompt: 'test profile model routing',
    })

    // createOpenAICompatible must receive the profile's API key and base URL
    expect(mocks.createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'profile-api-key-xyz',
        baseURL: 'https://custom.api.example.com/v1',
      })
    )
    // The constructed model must reach generateText
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: profileModel })
    )
  })

  it('an explicit chatgpt model is overlaid and reaches the OpenAI adapter', async () => {
    const chatgptSettings = {
      ...settings,
      chatgptApiKey: 'openai-key-test',
      selectedChatgptModel: 'gpt-4o',
    }

    const explicitModel = 'o3-mini'
    const { providerId: adapterId, settings: resolved } = resolveAdapterCall(
      'chatgpt',
      explicitModel,
      chatgptSettings
    )

    expect(adapterId).toBe('chatgpt')
    expect(resolved.selectedChatgptModel).toBe(explicitModel)

    const chatgptModel = { modelId: explicitModel }
    const chatgptFactory = vi.fn(() => chatgptModel)
    mocks.createOpenAI.mockReturnValue(chatgptFactory)

    await generateContentRequest({
      providerId: adapterId,
      settings: resolved,
      prompt: 'test chatgpt model routing',
    })

    // The OpenAI factory must be called with the API key
    expect(mocks.createOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'openai-key-test' })
    )
    // The factory's return must be called with the explicit model
    expect(chatgptFactory).toHaveBeenCalledWith(explicitModel)
    // The model must reach generateText
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: chatgptModel })
    )
  })

  it('a call without an explicit model (Summary path) produces the same model/config as default settings', async () => {
    // This simulates the Summary path: providerId and settings come from
    // the user's default settings, no resolveAdapterCall overlay
    const defaultSettings = {
      geminiApiKey: 'summary-key',
      selectedGeminiModel: 'gemini-3-flash-preview',
    }

    const defaultModel = { modelId: 'gemini-3-flash-preview' }
    const geminiFactory = vi.fn(() => defaultModel)
    mocks.createGoogleGenerativeAI.mockReturnValue(geminiFactory)

    await generateContentRequest({
      providerId: 'gemini',
      settings: defaultSettings,
      prompt: 'summarize this page',
    })

    // The Google provider factory must be called with the summary-key
    expect(mocks.createGoogleGenerativeAI).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'summary-key' })
    )
    // Factory called with the default model name
    expect(geminiFactory).toHaveBeenCalledWith('gemini-3-flash-preview')
    // Config must include the standard maxOutputTokens
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: defaultModel,
        maxOutputTokens: 4000,
      })
    )
  })

  it('resolveAdapterCall for cerebras overlays selectedCerebrasModel correctly', async () => {
    const cerebrasSettings = {
      ...settings,
      cerebrasApiKey: 'cerebras-key-test',
      selectedCerebrasModel: 'gpt-oss-120b',
    }

    const explicitModel = 'llama-3.3-70b'
    const { providerId: adapterId, settings: resolved } = resolveAdapterCall(
      'cerebras',
      explicitModel,
      cerebrasSettings
    )

    expect(adapterId).toBe('cerebras')
    expect(resolved.selectedCerebrasModel).toBe(explicitModel)

    const cerebrasModel = { modelId: explicitModel }
    const cerebrasFactory = vi.fn(() => cerebrasModel)
    mocks.createCerebras.mockReturnValue(cerebrasFactory)

    await generateContentRequest({
      providerId: adapterId,
      settings: resolved,
      prompt: 'test cerebras model routing',
    })

    expect(mocks.createCerebras).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'cerebras-key-test' })
    )
    expect(cerebrasFactory).toHaveBeenCalledWith(explicitModel)
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: cerebrasModel })
    )
  })

  it('resolveAdapterCall for nvidia builds an OpenAI-compatible client on the NIM base URL', async () => {
    const explicitModel = 'meta/llama-3.3-70b-instruct'
    const { providerId: adapterId, settings: resolved } = resolveAdapterCall(
      'nvidia',
      explicitModel,
      { ...settings, nvidiaApiKey: 'nvapi-key-test' }
    )

    expect(adapterId).toBe('nvidia')
    expect(resolved.selectedNvidiaModel).toBe(explicitModel)

    const nvidiaModel = { modelId: explicitModel }
    const nvidiaFactory = vi.fn(() => nvidiaModel)
    mocks.createOpenAICompatible.mockReturnValue(nvidiaFactory)

    await generateContentRequest({
      providerId: adapterId,
      settings: resolved,
      prompt: 'test nvidia model routing',
    })

    expect(mocks.createOpenAICompatible).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'nvidia',
        apiKey: 'nvapi-key-test',
        baseURL: 'https://integrate.api.nvidia.com/v1',
      })
    )
    expect(nvidiaFactory).toHaveBeenCalledWith(explicitModel)
    expect(mocks.generateText).toHaveBeenCalledWith(
      expect.objectContaining({ model: nvidiaModel })
    )
  })

  it('explicit model via resolveAdapterCall reaches streamText in the streaming path', async () => {
    const explicitModel = 'gemini-2.5-pro-preview'
    const { providerId: adapterId, settings: resolved } = resolveAdapterCall(
      'gemini',
      explicitModel,
      settings
    )

    const sentinelModel = { modelId: explicitModel }
    mocks.createGoogleGenerativeAI.mockReturnValue(() => sentinelModel)

    await Array.fromAsync(
      generateContentStreamRequest({
        providerId: adapterId,
        settings: resolved,
        messages: [{ role: 'user', content: 'stream with explicit model' }],
      })
    )

    expect(mocks.streamText).toHaveBeenCalledWith(
      expect.objectContaining({ model: sentinelModel })
    )
  })
})
