import { describe, expect, it, vi } from 'vitest'
import {
  FALLBACK_PROVIDER_MODELS,
  fetchProviderModels,
} from '../../src/lib/api/providerModelService.js'
import {
  getProviderCapabilities,
  clearDiscoveredCapabilities,
} from '../../src/lib/chat/providerCapabilities.js'

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  }
}

describe('provider model discovery', () => {
  it('uses static OpenAI models until an API key is available', async () => {
    const fetchFn = vi.fn()

    await expect(fetchProviderModels('chatgpt', '', fetchFn)).resolves.toEqual(
      FALLBACK_PROVIDER_MODELS.chatgpt,
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('loads OpenAI models dynamically when an API key is available', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'gpt-5.6-terra' },
          { id: 'gpt-5.6-luna' },
          { id: 'gpt-5.6-terra' },
        ],
      }),
    )

    await expect(fetchProviderModels('chatgpt', 'secret', fetchFn)).resolves.toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-terra',
    ])
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.openai.com/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer secret' },
      }),
    )
  })

  it('loads NVIDIA models without an API key and drops non-chat entries', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        object: 'list',
        data: [
          { id: 'meta/llama-3.3-70b-instruct' },
          { id: 'deepseek-ai/deepseek-v4-flash' },
          // Non-chat modalities sharing the same catalog endpoint:
          { id: 'nvidia/nv-embedqa-e5-v5' },
          { id: 'baai/bge-m3' },
          { id: 'nvidia/llama-3.2-nemoretriever-1b-vlm-embed-v1' },
          { id: 'meta/llama-guard-4-12b' },
          { id: 'nvidia/nemotron-3.5-content-safety' },
          { id: 'nvidia/nemotron-4-340b-reward' },
          { id: 'nvidia/nemotron-parse' },
          { id: 'nvidia/nvclip' },
          { id: 'nvidia/vila' },
          { id: 'adept/fuyu-8b' },
          { id: 'nvidia/riva-translate-4b-instruct' },
          { id: 'nvidia/ai-synthetic-video-detector' },
        ],
      }),
    )

    await expect(fetchProviderModels('nvidia', '', fetchFn)).resolves.toEqual([
      'deepseek-ai/deepseek-v4-flash',
      'meta/llama-3.3-70b-instruct',
    ])
    expect(fetchFn).toHaveBeenCalledWith(
      'https://integrate.api.nvidia.com/v1/models',
      expect.objectContaining({ method: 'GET' }),
    )
    // Keyless discovery must not send an Authorization header.
    expect(fetchFn.mock.calls[0][1].headers).toBeUndefined()
  })

  it('falls back to the static NVIDIA list when discovery yields no chat models', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({ data: [{ id: 'nvidia/nv-embedqa-e5-v5' }] }),
    )

    await expect(fetchProviderModels('nvidia', '', fetchFn)).resolves.toEqual(
      FALLBACK_PROVIDER_MODELS.nvidia,
    )
  })

  it('loads OpenRouter models dynamically without requiring an API key', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'openrouter/auto', context_length: 2_000_000 },
          { id: 'openai/gpt-5.2', context_length: 400_000 },
        ],
      }),
    )

    await expect(fetchProviderModels('openrouter', '', fetchFn)).resolves.toEqual([
      'openai/gpt-5.2',
      'openrouter/auto',
    ])
    expect(fetchFn).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({ headers: undefined }),
    )
    expect(getProviderCapabilities('openrouter', 'openai/gpt-5.2')).toMatchObject({
      contextWindowTokens: 400_000,
      source: 'discovered',
    })
    clearDiscoveredCapabilities()
  })

  it('uses static Groq models until an API key is available', async () => {
    const fetchFn = vi.fn()

    await expect(fetchProviderModels('groq', '', fetchFn)).resolves.toEqual(
      FALLBACK_PROVIDER_MODELS.groq,
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('loads and filters Groq chat models', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'whisper-large-v3', active: true },
          { id: 'llama-3.3-70b-versatile', active: true },
          { id: 'meta-llama/llama-guard-4-12b', active: true },
          { id: 'disabled-model', active: false },
          { id: 'openai/gpt-oss-120b', active: true },
        ],
      }),
    )

    await expect(fetchProviderModels('groq', 'secret', fetchFn)).resolves.toEqual([
      'llama-3.3-70b-versatile',
      'openai/gpt-oss-120b',
    ])
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer secret' },
      }),
    )
  })

  it('loads DeepSeek models dynamically when an API key is available', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'deepseek-v4-pro' },
          { id: 'deepseek-v4-flash' },
          { id: 'deepseek-v4-flash' },
        ],
      }),
    )

    await expect(fetchProviderModels('deepseek', 'secret', fetchFn)).resolves.toEqual([
      'deepseek-v4-flash',
      'deepseek-v4-pro',
    ])
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.deepseek.com/models',
      expect.objectContaining({
        headers: { Authorization: 'Bearer secret' },
      }),
    )
  })

  it('uses fallback DeepSeek models until an API key is available', async () => {
    const fetchFn = vi.fn()

    await expect(fetchProviderModels('deepseek', '', fetchFn)).resolves.toEqual(
      FALLBACK_PROVIDER_MODELS.deepseek,
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('loads every page of generative Gemini models dynamically', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          models: [
            {
              name: 'models/gemini-2.5-pro-001',
              baseModelId: 'gemini-2.5-pro',
              inputTokenLimit: 1_000_000,
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/text-embedding-004',
              supportedGenerationMethods: ['embedContent'],
            },
          ],
          nextPageToken: 'next page',
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          models: [
            {
              name: 'models/gemini-2.5-flash',
              supportedGenerationMethods: ['generateContent'],
            },
            {
              name: 'models/gemini-2.5-pro-002',
              baseModelId: 'gemini-2.5-pro',
              supportedGenerationMethods: ['generateContent'],
            },
          ],
        }),
      )

    await expect(
      fetchProviderModels('gemini', 'secret', fetchFn),
    ).resolves.toEqual(['gemini-2.5-flash', 'gemini-2.5-pro'])
    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      'https://generativelanguage.googleapis.com/v1beta/models?key=secret&pageSize=1000',
      { method: 'GET' },
    )
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      'https://generativelanguage.googleapis.com/v1beta/models?key=secret&pageSize=1000&pageToken=next+page',
      { method: 'GET' },
    )
    expect(getProviderCapabilities('gemini', 'gemini-2.5-pro')).toMatchObject({
      contextWindowTokens: 1_000_000,
      source: 'discovered',
    })
    clearDiscoveredCapabilities()
  })

  it('drops Gemini models that cannot do text-out work', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        models: [
          'gemini-3-flash-preview',
          'gemini-3-pro-image',
          'gemini-2.5-flash-preview-tts',
          'gemini-3-flash-live',
          'gemini-2.5-computer-use-preview-10-2025',
          'gemini-robotics-er-2-preview',
        ].map((id) => ({
          name: `models/${id}`,
          supportedGenerationMethods: ['generateContent'],
        })),
      }),
    )

    await expect(
      fetchProviderModels('gemini', 'secret', fetchFn),
    ).resolves.toEqual(['gemini-3-flash-preview'])
  })

  it('uses fallback Gemini models until an API key is available', async () => {
    const fetchFn = vi.fn()

    expect(FALLBACK_PROVIDER_MODELS.gemini).toEqual([
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ])
    await expect(fetchProviderModels('gemini', '', fetchFn)).resolves.toEqual(
      FALLBACK_PROVIDER_MODELS.gemini,
    )
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('registers each Groq model\'s context_window into the capability registry', async () => {
    clearDiscoveredCapabilities()
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { id: 'llama-3.3-70b-versatile', active: true, context_window: 131072 },
          { id: 'openai/gpt-oss-120b', active: true, context_window: 131072 },
          { id: 'legacy-model', active: true, context_window: 8192 },
        ],
      }),
    )

    await fetchProviderModels('groq', 'secret', fetchFn)

    expect(getProviderCapabilities('groq', 'llama-3.3-70b-versatile')).toMatchObject({
      contextWindowTokens: 131072,
      source: 'discovered',
    })
    // Discovered small windows guard against over-estimating the 128K default.
    expect(getProviderCapabilities('groq', 'legacy-model').contextWindowTokens).toBe(8192)
    clearDiscoveredCapabilities()
  })

  it('falls back to the public Cerebras catalog when authenticated loading fails', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({ data: [{ id: 'zai-glm-4.7' }, { id: 'gpt-oss-120b' }] }),
      )

    await expect(
      fetchProviderModels('cerebras', 'expired-key', fetchFn),
    ).resolves.toEqual(['gpt-oss-120b', 'zai-glm-4.7'])
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      'https://api.cerebras.ai/public/v1/models',
      expect.objectContaining({ headers: undefined }),
    )
  })
})
