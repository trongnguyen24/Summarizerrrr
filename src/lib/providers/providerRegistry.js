// Canonical provider registry for Summarizerrrr
import {
  isOpenAICompatibleProfileId,
  findProfileById,
  validateProfile,
} from './openAICompatibleProfiles.js';

export const PROVIDER_LIST = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Fast, multimodal AI from Google',
    iconifyIcon: 'simple-icons:google',
    adapterId: 'gemini',
    adapterOverlay: {},
    apiKeyField: 'geminiApiKey',
    additionalKeysField: 'geminiAdditionalApiKeys',
    baseUrlField: null,
    endpointField: null,
    legacyModelField: 'selectedGeminiModel',
    defaultModel: 'gemini-3-flash-preview',
    modelInfoHref: 'https://aistudio.google.com/app/rate-limit',
    requiresKey: true,
    discoveryId: 'gemini',
    modelSource: 'discovery',
    capabilityProviderId: 'gemini',
    icon: 'gemini',
  },
  {
    id: 'chatgpt',
    label: 'OpenAI',
    description: 'GPT models for fast, capable general AI tasks',
    iconifyIcon: 'simple-icons:openai',
    adapterId: 'chatgpt',
    adapterOverlay: {},
    apiKeyField: 'chatgptApiKey',
    additionalKeysField: null,
    // baseUrlField hidden from UI; adapter still reads settings.chatgptBaseUrl (default endpoint)
    baseUrlField: null,
    endpointField: null,
    legacyModelField: 'selectedChatgptModel',
    defaultModel: 'gpt-5.6-luna',
    modelInfoHref: 'https://platform.openai.com/docs/pricing',
    requiresKey: true,
    discoveryId: 'chatgpt',
    modelSource: 'discovery',
    capabilityProviderId: 'chatgpt',
    icon: 'chatgpt',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    description: 'Unified gateway to 200+ AI models',
    iconifyIcon: 'simple-icons:openrouter',
    adapterId: 'openrouter',
    adapterOverlay: {},
    apiKeyField: 'openrouterApiKey',
    additionalKeysField: null,
    baseUrlField: null,
    endpointField: null,
    legacyModelField: 'selectedOpenrouterModel',
    defaultModel: 'openrouter/free',
    modelInfoHref: 'https://openrouter.ai/models',
    requiresKey: true,
    discoveryId: 'openrouter',
    modelSource: 'discovery',
    capabilityProviderId: 'openrouter',
    icon: 'openrouter',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'Efficient reasoning and coding models',
    iconifyIcon: 'simple-icons:deepseek',
    adapterId: 'deepseek',
    adapterOverlay: {},
    apiKeyField: 'deepseekApiKey',
    additionalKeysField: null,
    // baseUrlField hidden from UI; adapter still reads settings.deepseekBaseUrl (default endpoint)
    baseUrlField: null,
    endpointField: null,
    legacyModelField: 'selectedDeepseekModel',
    defaultModel: 'deepseek-v4-flash',
    modelInfoHref: 'https://api-docs.deepseek.com/quick_start/pricing',
    requiresKey: true,
    discoveryId: 'deepseek',
    modelSource: 'discovery',
    capabilityProviderId: 'deepseek',
    icon: 'deepseek',
  },
  {
    id: 'groq',
    label: 'Groq',
    description: 'Ultra-fast inference with LPU hardware',
    iconifyIcon: 'bxl:groq-ai',
    adapterId: 'groq',
    adapterOverlay: {},
    apiKeyField: 'groqApiKey',
    additionalKeysField: null,
    baseUrlField: null,
    endpointField: null,
    legacyModelField: 'selectedGroqModel',
    defaultModel: 'llama-3.3-70b-versatile',
    modelInfoHref: 'https://console.groq.com/docs/models',
    requiresKey: true,
    discoveryId: 'groq',
    modelSource: 'discovery',
    capabilityProviderId: 'groq',
    icon: 'groq',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    description: 'High-performance wafer-scale AI inference',
    iconifyIcon: 'heroicons:cpu-chip-20-solid',
    adapterId: 'cerebras',
    adapterOverlay: {},
    apiKeyField: 'cerebrasApiKey',
    additionalKeysField: null,
    baseUrlField: null,
    endpointField: null,
    legacyModelField: 'selectedCerebrasModel',
    defaultModel: 'gpt-oss-120b',
    modelInfoHref: 'https://inference-docs.cerebras.ai/models/overview',
    requiresKey: true,
    discoveryId: 'cerebras',
    modelSource: 'discovery',
    capabilityProviderId: 'cerebras',
    icon: 'cerebras',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    description: 'Free access to 100+ hosted open models',
    iconifyIcon: 'simple-icons:nvidia',
    adapterId: 'nvidia',
    adapterOverlay: {},
    apiKeyField: 'nvidiaApiKey',
    additionalKeysField: null,
    baseUrlField: null,
    endpointField: null,
    legacyModelField: 'selectedNvidiaModel',
    defaultModel: 'deepseek-ai/deepseek-v4-flash',
    modelInfoHref: 'https://build.nvidia.com/models',
    requiresKey: true,
    discoveryId: 'nvidia',
    modelSource: 'discovery',
    capabilityProviderId: 'nvidia',
    icon: 'nvidia',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    description: 'Run open-source models locally',
    iconifyIcon: 'simple-icons:ollama',
    adapterId: 'ollama',
    adapterOverlay: {},
    apiKeyField: null,
    additionalKeysField: null,
    baseUrlField: null,
    endpointField: 'ollamaEndpoint',
    legacyModelField: 'selectedOllamaModel',
    defaultModel: 'deepseek-r1:8b',
    requiresKey: false,
    discoveryId: null,
    modelSource: 'freeText',
    capabilityProviderId: 'ollama',
    icon: 'ollama',
  },
  {
    id: 'lmstudio',
    label: 'LM Studio',
    description: 'Local inference engine for LLMs',
    iconifyIcon: 'heroicons:computer-desktop-20-solid',
    adapterId: 'lmstudio',
    adapterOverlay: {},
    apiKeyField: null,
    additionalKeysField: null,
    baseUrlField: null,
    endpointField: 'lmStudioEndpoint',
    legacyModelField: 'selectedLmStudioModel',
    defaultModel: 'lmstudio-community/gemma-2b-it-GGUF',
    requiresKey: false,
    discoveryId: null,
    modelSource: 'freeText',
    capabilityProviderId: 'lmstudio',
    icon: 'lmstudio',
  },
  {
    id: 'openaiCompatible',
    label: 'OpenAI Compatible',
    description: 'Any OpenAI-compatible API server',
    iconifyIcon: 'heroicons:link-20-solid',
    adapterId: 'openaiCompatible',
    adapterOverlay: {},
    apiKeyField: 'openaiCompatibleApiKey',
    additionalKeysField: null,
    baseUrlField: 'openaiCompatibleBaseUrl',
    endpointField: null,
    legacyModelField: 'selectedOpenAICompatibleModel',
    defaultModel: '',
    requiresKey: true,
    discoveryId: null,
    modelSource: 'freeText',
    capabilityProviderId: 'openaiCompatible',
    icon: 'openaiCompatible',
    isTemplate: true,
  },
];

export function getProvider(id) {
  return PROVIDER_LIST.find((p) => p.id === id) || null;
}

export function resolveProviderEntry(id, settings) {
  if (isOpenAICompatibleProfileId(id)) {
    const profile = findProfileById(settings?.openaiCompatibleProfiles, id);
    if (profile) {
      return {
        id: profile.id,
        label: profile.name,
        description: 'Custom OpenAI Compatible profile',
        iconifyIcon: 'heroicons:link-20-solid',
        adapterId: 'openaiCompatible',
        adapterOverlay: {},
        apiKeyField: null,
        additionalKeysField: null,
        baseUrlField: null,
        endpointField: null,
        legacyModelField: null,
        defaultModel: profile.defaultModel,
        requiresKey: true,
        discoveryId: null,
        modelSource: 'freeText',
        capabilityProviderId: 'openaiCompatible',
        icon: 'openaiCompatible',
      };
    }
    return null;
  }
  return getProvider(id);
}

export function listAddedProviderEntries(settings) {
  if (!settings) return [];
  const addedIds = settings.addedProviders || [];
  const singletons = addedIds
    .filter(id => id !== 'openaiCompatible')
    .map(id => getProvider(id))
    .filter(Boolean);
  const profiles = settings.openaiCompatibleProfiles || [];
  const dynamicDescriptors = profiles
    .map(p => resolveProviderEntry(p.id, settings))
    .filter(Boolean);
  return [...singletons, ...dynamicDescriptors];
}

export function normalizeProviderId(id) {
  if (id === 'openai') return 'chatgpt';
  if (id === 'geminiAdvanced') return 'gemini';
  if (isOpenAICompatibleProfileId(id)) return id;
  const provider = getProvider(id);
  return provider ? provider.id : 'gemini';
}

export function getApiKey(id, settings) {
  if (isOpenAICompatibleProfileId(id)) {
    const profile = findProfileById(settings?.openaiCompatibleProfiles, id);
    return profile ? profile.apiKey : null;
  }
  const provider = getProvider(id);
  if (!provider || !settings) return null;
  if (provider.apiKeyField) {
    return settings[provider.apiKeyField] || null;
  }
  return null;
}

export function isProviderConfigured(id, settings) {
  if (isOpenAICompatibleProfileId(id)) {
    const profile = findProfileById(settings?.openaiCompatibleProfiles, id);
    return profile ? validateProfile(profile) : false;
  }
  const provider = getProvider(id);
  if (!provider || !settings) return false;
  if (provider.requiresKey === false) {
    if (provider.endpointField) {
      const endpoint = settings[provider.endpointField];
      return typeof endpoint === 'string' && endpoint.trim().length > 0;
    }
    return true;
  }
  const key = getApiKey(id, settings);
  return typeof key === 'string' && key.trim().length > 0;
}

export function listConfiguredProviders(settings) {
  if (!settings) return [];
  return PROVIDER_LIST.filter((p) => !p.isTemplate && isProviderConfigured(p.id, settings));
}

export function getLegacyModel(id, settings) {
  const provider = getProvider(id);
  if (!provider || !settings || !provider.legacyModelField) return null;
  return settings[provider.legacyModelField] || null;
}

export function getDefaultModel(id, settings) {
  if (isOpenAICompatibleProfileId(id)) {
    const profile = findProfileById(settings?.openaiCompatibleProfiles, id);
    return profile ? profile.defaultModel : null;
  }
  const provider = getProvider(id);
  return provider ? provider.defaultModel : null;
}

export function getModelSource(id, settings) {
  if (isOpenAICompatibleProfileId(id)) return 'freeText';
  const provider = getProvider(id);
  return provider ? provider.modelSource : null;
}

export function resolveAdapterCall(featureProviderId, modelId, settings) {
  let provider;
  let isProfile = false;
  let profile = null;

  if (isOpenAICompatibleProfileId(featureProviderId)) {
    isProfile = true;
    profile = findProfileById(settings?.openaiCompatibleProfiles, featureProviderId);
    provider = getProvider('openaiCompatible');
  } else {
    provider = getProvider(featureProviderId);
  }

  if (!provider) {
    throw new Error(`Unknown provider: ${featureProviderId}`);
  }

  const adapterId = provider.adapterId;
  const overlay = { ...(provider.adapterOverlay || {}) };
  const legacyModelField = provider.legacyModelField;

  const updatedSettings = {
    ...settings,
    ...overlay,
  };

  if (isProfile && profile) {
    updatedSettings.openaiCompatibleApiKey = profile.apiKey;
    updatedSettings.openaiCompatibleBaseUrl = profile.baseUrl;
    updatedSettings.selectedOpenAICompatibleModel = modelId;
  } else if (legacyModelField) {
    updatedSettings[legacyModelField] = modelId;
  }

  return {
    providerId: adapterId,
    settings: updatedSettings,
  };
}
