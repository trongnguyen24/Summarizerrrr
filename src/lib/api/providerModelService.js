import { registerModelCapability } from '@/lib/chat/providerCapabilities.js'
import { persistDiscoveredCapabilities } from '@/lib/chat/modelCapabilityCache.js'
import { isNonTextGeminiModel } from '@/lib/providers/geminiFreeTier.js'

export const PROVIDER_CONFIG = {
  chatgpt: {
    url: 'https://api.openai.com/v1/models',
    requiresApiKey: true,
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/models',
    requiresApiKey: false,
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/models',
    requiresApiKey: true,
  },
  cerebras: {
    url: 'https://api.cerebras.ai/v1/models',
    publicUrl: 'https://api.cerebras.ai/public/v1/models',
    requiresApiKey: false,
  },
  deepseek: {
    url: 'https://api.deepseek.com/models',
    requiresApiKey: true,
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    requiresApiKey: true,
    usesApiKeyQueryParam: true,
    capabilityProviderId: 'gemini',
  },
  nvidia: {
    // NVIDIA's catalog endpoint answers unauthenticated, so discovery works
    // before the user pastes a key.
    url: 'https://integrate.api.nvidia.com/v1/models',
    requiresApiKey: false,
  },
}

export const FALLBACK_PROVIDER_MODELS = {
  groq: [
    'groq/compound',
    'groq/compound-mini',
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'qwen/qwen3-32b',
  ],
  cerebras: ['gpt-oss-120b', 'zai-glm-4.7'],
  nvidia: [
    'deepseek-ai/deepseek-v4-flash',
    'deepseek-ai/deepseek-v4-pro',
    'meta/llama-3.3-70b-instruct',
    'moonshotai/kimi-k2.6',
    'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    'nvidia/nvidia-nemotron-nano-9b-v2',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'z-ai/glm-5.2',
  ],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  gemini: [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
  ],
  chatgpt: [
    'gpt-5.6-luna',
    'gpt-5.6-terra',
    'gpt-5.6-sol',
    'gpt-5.6',
    'gpt-5.5',
    'gpt-5.4',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
  ],
  openrouter: [
    'openrouter/free',
    'openrouter/auto',
  ],
}

function isGroqChatModel(model) {
  const id = model.id?.toLowerCase() || ''

  return (
    model.active !== false &&
    !id.includes('whisper') &&
    !id.includes('tts') &&
    !id.includes('guard') &&
    !id.includes('moderation')
  )
}

/**
 * NVIDIA's catalog mixes chat LLMs with embedding, reranking, safety-guard,
 * reward, OCR/document-parse, speech, vision-only and biology models — all
 * under the same `/v1/models` list, with no `type` field to discriminate on.
 * Substring matching on the id is the only signal available.
 */
const NVIDIA_NON_CHAT_PATTERNS = [
  'embed',
  'rerank',
  'retriever',
  'bge-',
  'nvclip',
  'guard',
  'shield',
  // Catches `nemotron-3.5-content-safety`, which carries no `guard` in its id.
  'safety',
  'reward',
  'parse',
  'ocr',
  'table-structure',
  'graphic-elements',
  'deplot',
  'parakeet',
  'riva-',
  '-asr',
  '-tts',
  'fuyu',
  'kosmos',
  'neva-',
  'vila',
  'video-detector',
  'maxine',
  'usdcode',
  'esm',
  'molmim',
  'diffdock',
  'proteinmpnn',
  'genmol',
  'sana',
  'flux',
  'stable-diffusion',
  'sdxl',
]

function isNvidiaChatModel(model) {
  const id = model.id?.toLowerCase() || ''

  return !NVIDIA_NON_CHAT_PATTERNS.some((pattern) => id.includes(pattern))
}

/**
 * Capture per-model context length from a provider's `/models` response and
 * feed it into the shared capability registry. Providers expose it under
 * different keys: Groq → `context_window`, OpenRouter → `context_length`,
 * Gemini → `inputTokenLimit`.
 * Silently ignores models that don't carry it.
 *
 * @param {string} providerId
 * @param {{data?: Array<object>, models?: Array<object>}} body
 */
function registerCapabilitiesFromBody(providerId, body) {
  const models = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.models)
      ? body.models
      : []

  for (const model of models) {
    const id = typeof model?.id === 'string'
      ? model.id.trim()
      : typeof model?.baseModelId === 'string'
        ? model.baseModelId.trim()
        : ''
    if (!id) continue
    const contextWindowTokens = Number(
      model.context_window ?? model.context_length ?? model.inputTokenLimit,
    )
    if (!Number.isFinite(contextWindowTokens) || contextWindowTokens <= 0) continue
    registerModelCapability(providerId, id, { contextWindowTokens })
  }
}

function normalizeModels(providerId, body) {
  if (providerId === 'gemini') {
    if (!Array.isArray(body?.models)) {
      throw new Error("Invalid API response: missing 'models' array")
    }

    return body.models
      .filter((model) =>
        model?.supportedGenerationMethods?.includes('generateContent'),
      )
      .map(
        (model) =>
          model.baseModelId?.trim() || model.name?.replace(/^models\//, '').trim(),
      )
      .filter(Boolean)
      // `generateContent` alone still lets TTS, image and Live-audio models
      // through; this extension only ever sends text.
      .filter((id) => !isNonTextGeminiModel(id))
      .filter((id, index, models) => models.indexOf(id) === index)
      .sort((a, b) => a.localeCompare(b))
  }

  if (!Array.isArray(body?.data)) {
    throw new Error("Invalid API response: missing 'data' array")
  }

  return body.data
    .filter((model) => providerId !== 'groq' || isGroqChatModel(model))
    .filter((model) => providerId !== 'nvidia' || isNvidiaChatModel(model))
    .filter((model) => typeof model?.id === 'string' && model.id.trim())
    .map((model) => model.id.trim())
    .filter((id, index, models) => models.indexOf(id) === index)
    .sort((a, b) => a.localeCompare(b))
}

async function requestModels(url, apiKey, fetchFn) {
  const response = await fetchFn(url, {
    method: 'GET',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  })

  if (!response.ok) {
    throw new Error(`Could not load models (HTTP ${response.status})`)
  }

  return response.json()
}

async function requestPaginatedModels(config, apiKey, fetchFn) {
  let nextPageToken = ''
  let models = []

  do {
    const params = new URLSearchParams({ key: apiKey, pageSize: '1000' })
    if (nextPageToken) params.set('pageToken', nextPageToken)

    const response = await fetchFn(`${config.url}?${params}`, { method: 'GET' })
    if (!response.ok) {
      throw new Error(`Could not load models (HTTP ${response.status})`)
    }

    const body = await response.json()
    if (!Array.isArray(body?.models)) {
      throw new Error("Invalid API response: missing 'models' array")
    }

    models = [...models, ...body.models]
    nextPageToken = body.nextPageToken || ''
  } while (nextPageToken)

  return { models }
}

export async function fetchProviderModels(
  providerId,
  apiKey,
  fetchFn = fetch,
) {
  const config = PROVIDER_CONFIG[providerId]
  if (!config) throw new Error(`Unsupported model provider: ${providerId}`)

  const cleanApiKey = apiKey?.trim() || ''
  if (config.requiresApiKey && !cleanApiKey) {
    return FALLBACK_PROVIDER_MODELS[providerId]
  }

  try {
    const body = config.usesApiKeyQueryParam
      ? await requestPaginatedModels(config, cleanApiKey, fetchFn)
      : await requestModels(config.url, cleanApiKey, fetchFn)
    registerCapabilitiesFromBody(config.capabilityProviderId || providerId, body)
    const models = normalizeModels(providerId, body)
    void persistDiscoveredCapabilities()
    return models.length ? models : FALLBACK_PROVIDER_MODELS[providerId]
  } catch (error) {
    if (!config.publicUrl) throw error

    const body = await requestModels(config.publicUrl, '', fetchFn)
    registerCapabilitiesFromBody(config.capabilityProviderId || providerId, body)
    const models = normalizeModels(providerId, body)
    void persistDiscoveredCapabilities()
    return models.length ? models : FALLBACK_PROVIDER_MODELS[providerId]
  }
}
