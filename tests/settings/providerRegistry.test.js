import { describe, it, expect } from 'vitest'
import { VALID_SETTING_KEYS } from '@/lib/config/settingsSchema.js'
import { PROVIDER_CONFIG } from '@/lib/api/providerModelService.js'
import {
  PROVIDER_LIST,
  getProvider,
  normalizeProviderId,
  getApiKey,
  isProviderConfigured,
  listConfiguredProviders,
  getLegacyModel,
  getDefaultModel,
  getModelSource,
  resolveAdapterCall,
  resolveProviderEntry,
  listAddedProviderEntries,
} from '@/lib/providers/providerRegistry.js'
import { resolveFeatureModel } from '@/lib/providers/featureModelResolver.js'

describe('Provider Registry', () => {
  it('every entry has fields that exist in VALID_SETTING_KEYS', () => {
    for (const entry of PROVIDER_LIST) {
      if (entry.apiKeyField) {
        expect(VALID_SETTING_KEYS).toContain(entry.apiKeyField)
      }
      if (entry.additionalKeysField) {
        expect(VALID_SETTING_KEYS).toContain(entry.additionalKeysField)
      }
      if (entry.baseUrlField) {
        expect(VALID_SETTING_KEYS).toContain(entry.baseUrlField)
      }
      if (entry.endpointField) {
        expect(VALID_SETTING_KEYS).toContain(entry.endpointField)
      }
      if (entry.legacyModelField) {
        expect(VALID_SETTING_KEYS).toContain(entry.legacyModelField)
      }
    }
  })

  it('every entry has a valid modelSource, and discoveryId exists in PROVIDER_CONFIG when discovery', () => {
    const validModelSources = ['discovery', 'static', 'freeText']
    for (const entry of PROVIDER_LIST) {
      expect(validModelSources).toContain(entry.modelSource)
      if (entry.modelSource === 'discovery') {
        expect(entry.discoveryId).toBeDefined()
        expect(PROVIDER_CONFIG[entry.discoveryId]).toBeDefined()
      } else {
        expect(entry.discoveryId).toBeNull()
      }
    }
  })

  it('exposes official model-list links for cloud providers', () => {
    expect(getProvider('gemini').modelInfoHref).toBe('https://aistudio.google.com/app/rate-limit')
    expect(getProvider('chatgpt').modelInfoHref).toBe('https://platform.openai.com/docs/pricing')
    expect(getProvider('openrouter').modelInfoHref).toBe('https://openrouter.ai/models')
    expect(getProvider('deepseek').modelInfoHref).toBe('https://api-docs.deepseek.com/quick_start/pricing')
    expect(getProvider('groq').modelInfoHref).toBe('https://console.groq.com/docs/models')
    expect(getProvider('cerebras').modelInfoHref).toBe('https://inference-docs.cerebras.ai/models/overview')
    expect(getProvider('nvidia').modelInfoHref).toBe('https://build.nvidia.com/models')
  })

  it('nvidia routes through the openai-compatible adapter but keeps its own key/model fields', () => {
    const nvidia = getProvider('nvidia')
    expect(nvidia.apiKeyField).toBe('nvidiaApiKey')
    expect(nvidia.legacyModelField).toBe('selectedNvidiaModel')
    expect(nvidia.modelSource).toBe('discovery')
    expect(nvidia.discoveryId).toBe('nvidia')
    // NVIDIA model ids are vendor-namespaced (`vendor/model`).
    expect(nvidia.defaultModel).toBe('deepseek-ai/deepseek-v4-flash')

    const { providerId, settings: resolved } = resolveAdapterCall(
      'nvidia',
      'meta/llama-3.3-70b-instruct',
      { nvidiaApiKey: 'nvapi-test' },
    )
    expect(providerId).toBe('nvidia')
    expect(resolved.selectedNvidiaModel).toBe('meta/llama-3.3-70b-instruct')
    // Must not leak into the shared openaiCompatible slots.
    expect(resolved.openaiCompatibleApiKey).toBeUndefined()
    expect(resolved.openaiCompatibleBaseUrl).toBeUndefined()
  })

  it('nvidia is configured once a key is present and appears in listConfiguredProviders', () => {
    expect(isProviderConfigured('nvidia', { nvidiaApiKey: '' })).toBe(false)
    expect(isProviderConfigured('nvidia', { nvidiaApiKey: '  ' })).toBe(false)
    expect(isProviderConfigured('nvidia', { nvidiaApiKey: 'nvapi-abc' })).toBe(true)
    expect(getApiKey('nvidia', { nvidiaApiKey: 'nvapi-abc' })).toBe('nvapi-abc')

    const configured = listConfiguredProviders({ nvidiaApiKey: 'nvapi-abc' })
    expect(configured.map((p) => p.id)).toContain('nvidia')
  })

  it('resolveAdapterCall returns correct adapter ID and overlay settings', () => {
    const settings = {
      isAdvancedMode: false,
      selectedGeminiModel: 'some-model',
    }
    const result = resolveAdapterCall('gemini', 'my-gemini-model', settings)
    expect(result.providerId).toBe('gemini')
    expect(result.settings.selectedGeminiModel).toBe('my-gemini-model')
  })

  it('normalizeProviderId maps legacy openai to chatgpt, geminiAdvanced to gemini, and unknown to gemini', () => {
    expect(normalizeProviderId('openai')).toBe('chatgpt')
    expect(normalizeProviderId('geminiAdvanced')).toBe('gemini')
    expect(normalizeProviderId('gemini')).toBe('gemini')
    expect(normalizeProviderId('groq')).toBe('groq')
    expect(normalizeProviderId('invalid')).toBe('gemini')
    expect(normalizeProviderId(null)).toBe('gemini')
  })

  describe('Dynamic Profiles Support', () => {
    const settings = {
      addedProviders: ['gemini', 'chatgpt'],
      openaiCompatibleProfiles: [
        {
          id: 'openai-compatible-p1',
          name: 'SiliconFlow',
          baseUrl: 'https://api.siliconflow.cn/v1',
          apiKey: 'sk-siliconflow-key',
          defaultModel: 'deepseek-chat',
        },
        {
          id: 'openai-compatible-p2',
          name: 'TogetherAI',
          baseUrl: 'https://api.together.xyz',
          apiKey: '', // unconfigured
          defaultModel: 'meta-llama/Llama-3-70b',
        }
      ],
      geminiApiKey: 'gemini-key',
      chatgptApiKey: 'chatgpt-key',
    }

    it('resolveProviderEntry returns dynamic descriptor or static entry', () => {
      const descriptor = resolveProviderEntry('openai-compatible-p1', settings)
      expect(descriptor).not.toBeNull()
      expect(descriptor.id).toBe('openai-compatible-p1')
      expect(descriptor.label).toBe('SiliconFlow')
      expect(descriptor.defaultModel).toBe('deepseek-chat')
      expect(descriptor.modelSource).toBe('freeText')

      const staticEntry = resolveProviderEntry('gemini', settings)
      expect(staticEntry.id).toBe('gemini')

      const missing = resolveProviderEntry('openai-compatible-nonexistent', settings)
      expect(missing).toBeNull()
    })

    it('listAddedProviderEntries combines addedProviders (excluding template) and dynamic profiles', () => {
      const list = listAddedProviderEntries(settings)
      // gemini and chatgpt are singletons, plus 2 profiles
      expect(list.length).toBe(4)
      expect(list[0].id).toBe('gemini')
      expect(list[1].id).toBe('chatgpt')
      expect(list[2].id).toBe('openai-compatible-p1')
      expect(list[3].id).toBe('openai-compatible-p2')
    })

    it('normalizeProviderId preserves profile ID', () => {
      expect(normalizeProviderId('openai-compatible-p1')).toBe('openai-compatible-p1')
    })

    it('getApiKey resolves dynamic api keys', () => {
      expect(getApiKey('openai-compatible-p1', settings)).toBe('sk-siliconflow-key')
      expect(getApiKey('openai-compatible-p2', settings)).toBe('')
    })

    it('isProviderConfigured checks validation rules for profile', () => {
      expect(isProviderConfigured('openai-compatible-p1', settings)).toBe(true)
      expect(isProviderConfigured('openai-compatible-p2', settings)).toBe(false) // key is empty
    })

    it('getDefaultModel returns profile default model', () => {
      expect(getDefaultModel('openai-compatible-p1', settings)).toBe('deepseek-chat')
    })

    it('getModelSource returns freeText for profiles', () => {
      expect(getModelSource('openai-compatible-p1', settings)).toBe('freeText')
    })

    it('resolveAdapterCall creates correct overlay with dynamic settings', () => {
      const call = resolveAdapterCall('openai-compatible-p1', 'custom-model-abc', settings)
      expect(call.providerId).toBe('openaiCompatible')
      expect(call.settings.openaiCompatibleApiKey).toBe('sk-siliconflow-key')
      expect(call.settings.openaiCompatibleBaseUrl).toBe('https://api.siliconflow.cn/v1')
      expect(call.settings.selectedOpenAICompatibleModel).toBe('custom-model-abc')
    })
  })
})

describe('Feature Model Resolver', () => {
  it('forces Gemini Basic in basic mode', () => {
    const settings = {
      isAdvancedMode: false,
      selectedGeminiModel: 'basic-model',
    }
    const result = resolveFeatureModel('summarize', settings)
    expect(result.providerId).toBe('gemini')
    expect(result.modelId).toBe('basic-model')
    expect(result.adapterProviderId).toBe('gemini')
    expect(result.settingsOverlay).toEqual({})
  })

  it('falls back to legacy derivation if summarize block is missing', () => {
    const settings = {
      isAdvancedMode: true,
      selectedProvider: 'groq',
      selectedGroqModel: 'groq-model',
      groqApiKey: 'some-key',
    }
    const result = resolveFeatureModel('summarize', settings)
    expect(result.providerId).toBe('groq')
    expect(result.modelId).toBe('groq-model')
  })

  it('uses summarize/chat block if present and configured', () => {
    const settings = {
      isAdvancedMode: true,
      summarize: {
        provider: 'deepseek',
        model: 'deepseek-chat',
      },
      deepseekApiKey: 'ds-key',
    }
    const result = resolveFeatureModel('summarize', settings)
    expect(result.providerId).toBe('deepseek')
    expect(result.modelId).toBe('deepseek-chat')
  })

  it('falls back to Gemini Basic if chosen provider is not configured but gemini has a key', () => {
    const settings = {
      isAdvancedMode: true,
      summarize: {
        provider: 'deepseek',
        model: 'deepseek-chat',
      },
      deepseekApiKey: '', // unconfigured
      geminiApiKey: 'gemini-key',
      selectedGeminiModel: 'gemini-basic-model',
    }
    const result = resolveFeatureModel('summarize', settings)
    expect(result.providerId).toBe('gemini')
    expect(result.modelId).toBe('gemini-basic-model')
  })
})
