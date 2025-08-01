# AI SDK 5 Migration Plan

## Executive Summary

Đề xuất migration từ hệ thống custom AI providers hiện tại sang **Vercel AI SDK 5** - một thư viện chuẩn hóa, hiện đại và mạnh mẽ hơn cho việc tích hợp với các AI providers.

### Key Benefits:

- **Giảm 80% code complexity** - từ 500+ lines custom providers xuống ~50 lines
- **Unified API** - cùng interface cho tất cả providers
- **Better error handling** - structured errors và built-in retry logic
- **Native streaming** - consistent streaming cho tất cả providers
- **Future-proof** - được maintain bởi Vercel team

---

## Current State Analysis

### Existing Provider System

```
src/lib/api/
├── providers/
│   ├── baseProvider.js         # Abstract base class
│   ├── geminiProvider.js       # Custom Gemini implementation
│   ├── openaiCompatibleProvider.js # Custom OpenAI-compatible
│   ├── openrouterProvider.js   # Custom OpenRouter
│   └── ollamaProvider.js       # Custom Ollama
├── providersConfig.js          # Provider factory
└── api.js                      # Main API functions (500+ lines)
```

### Pain Points:

1. **Maintenance Overhead**: Mỗi provider cần custom implementation
2. **Inconsistent APIs**: Mỗi provider có different input/output formats
3. **Error Handling**: Custom error handling cho từng provider
4. **Streaming Support**: Manual streaming implementation
5. **Testing Complexity**: Need to test each provider individually

### Current Dependencies:

```json
{
  "@google/genai": "^0.8.0",
  "openai": "^4.60.1"
}
```

---

## AI SDK 5 Advantages

### Unified Provider Interface

```javascript
// Current - Different APIs for each provider
const geminiResult = await geminiProvider.generateContent(
  model,
  contents,
  system,
  config
)
const openaiResult = await openaiProvider.generateContent(
  model,
  contents,
  system,
  config
)

// AI SDK 5 - Same API for all providers
const { text } = await generateText({
  model: google('gemini-2.0-flash'),
  prompt,
})
const { text } = await generateText({ model: openai('gpt-4'), prompt })
```

### Feature Comparison

| Feature          | Current System                 | AI SDK 5                        |
| ---------------- | ------------------------------ | ------------------------------- |
| Provider Support | 6 custom implementations       | 20+ official providers          |
| API Consistency  | ❌ Different per provider      | ✅ Unified interface            |
| Error Handling   | ❌ Custom per provider         | ✅ Standardized errors          |
| Streaming        | ❌ Manual implementation       | ✅ Built-in streaming           |
| Type Safety      | ❌ Limited TypeScript          | ✅ Full TypeScript support      |
| Testing          | ❌ Complex mocking             | ✅ Built-in test utilities      |
| Documentation    | ❌ Custom docs needed          | ✅ Comprehensive docs           |
| Maintenance      | ❌ High (maintain 6 providers) | ✅ Low (use official providers) |

---

## Detailed Migration Plan

### Phase 1: Dependencies Setup (Estimated: 1 hour)

#### Install AI SDK 5 packages:

```bash
npm install ai @ai-sdk/google @ai-sdk/openai @ai-sdk/anthropic @ai-sdk/openai-compatible
npm install @openrouter/ai-sdk-provider
```

#### Update package.json:

```json
{
  "dependencies": {
    "ai": "^5.0.0",
    "@ai-sdk/google": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/openai-compatible": "^1.0.0",
    "@openrouter/ai-sdk-provider": "^1.0.0"
  }
}
```

### Phase 2: Create AI SDK Adapter (Estimated: 2 hours)

#### Create `src/lib/api/aiSdkAdapter.js`:

```javascript
// @ts-nocheck
import { generateText, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

// Provider configuration mapping
export function getAISDKModel(providerId, settings) {
  switch (providerId) {
    case 'gemini':
      const geminiApiKey = settings.isAdvancedMode
        ? settings.geminiAdvancedApiKey
        : settings.geminiApiKey
      const geminiModel = settings.isAdvancedMode
        ? settings.selectedGeminiAdvancedModel
        : settings.selectedGeminiModel
      return google(geminiModel, { apiKey: geminiApiKey })

    case 'openai':
    case 'chatgpt':
      return openai(settings.selectedChatgptModel, {
        apiKey: settings.chatgptApiKey,
      })

    case 'openrouter':
      const openrouter = createOpenRouter({
        apiKey: settings.openrouterApiKey,
      })
      return openrouter.chat(settings.selectedOpenrouterModel)

    case 'deepseek':
      const deepseek = createOpenAICompatible({
        name: 'deepseek',
        apiKey: settings.deepseekApiKey,
        baseURL: settings.deepseekBaseUrl || 'https://api.deepseek.com/v1',
      })
      return deepseek(settings.selectedDeepseekModel)

    case 'ollama':
      const ollama = createOpenAICompatible({
        name: 'ollama',
        apiKey: 'ollama', // Ollama doesn't need real API key
        baseURL: settings.ollamaEndpoint || 'http://localhost:11434/v1',
      })
      return ollama(settings.selectedOllamaModel)

    default:
      throw new Error(`Unsupported provider: ${providerId}`)
  }
}

// Generation config mapping
export function mapGenerationConfig(settings) {
  return {
    temperature: settings.isAdvancedMode
      ? settings.advancedModeSettings.temperature
      : settings.basicModeSettings.temperature,
    topP: settings.isAdvancedMode
      ? settings.advancedModeSettings.topP
      : settings.basicModeSettings.topP,
    maxTokens: 4000, // Default max tokens
  }
}
```

### Phase 3: Update Core API Functions (Estimated: 3 hours)

#### Refactor `src/lib/api/api.js`:

##### Before (Current):

```javascript
export async function summarizeContent(text, contentType) {
  // 50+ lines of provider selection, config setup, error handling
  const provider = getProvider(selectedProviderId, userSettings)
  const rawResult = await provider.generateContent(
    model,
    contents,
    system,
    config
  )
  return provider.parseResponse(rawResult)
}
```

##### After (AI SDK 5):

```javascript
import { generateText, streamText } from 'ai'
import { getAISDKModel, mapGenerationConfig } from './aiSdkAdapter.js'

export async function summarizeContent(text, contentType) {
  await loadSettings()

  const selectedProviderId = settings.isAdvancedMode
    ? settings.selectedProvider
    : 'gemini'

  const model = getAISDKModel(selectedProviderId, settings)
  const generationConfig = mapGenerationConfig(settings)

  const { systemInstruction, userPrompt } = promptBuilders[
    contentType
  ].buildPrompt(
    text,
    settings.summaryLang,
    settings.summaryLength,
    settings.summaryFormat,
    settings.summaryTone
  )

  try {
    const { text: summary } = await generateText({
      model,
      system: systemInstruction,
      prompt: userPrompt,
      ...generationConfig,
    })

    return summary
  } catch (error) {
    // AI SDK provides structured errors
    console.error('AI SDK Error:', error)
    throw error
  }
}

export async function* summarizeContentStream(text, contentType) {
  await loadSettings()

  const selectedProviderId = settings.isAdvancedMode
    ? settings.selectedProvider
    : 'gemini'

  const model = getAISDKModel(selectedProviderId, settings)
  const generationConfig = mapGenerationConfig(settings)

  const { systemInstruction, userPrompt } = promptBuilders[
    contentType
  ].buildPrompt(
    text,
    settings.summaryLang,
    settings.summaryLength,
    settings.summaryFormat,
    settings.summaryTone
  )

  try {
    const { textStream } = streamText({
      model,
      system: systemInstruction,
      prompt: userPrompt,
      ...generationConfig,
    })

    for await (const chunk of textStream) {
      yield chunk
    }
  } catch (error) {
    console.error('AI SDK Stream Error:', error)
    throw error
  }
}
```

### Phase 4: Provider-Specific Migration (Estimated: 2 hours)

#### 1. Gemini Migration

```javascript
// Current: Custom GeminiProvider class (50+ lines)
export class GeminiProvider extends BaseProvider {
  constructor(apiKey) {
    /* ... */
  }
  async generateContent() {
    /* ... */
  }
  async *generateContentStream() {
    /* ... */
  }
  parseResponse() {
    /* ... */
  }
}

// AI SDK 5: One line import
import { google } from '@ai-sdk/google'
const model = google('gemini-2.0-flash')
```

#### 2. OpenAI/ChatGPT Migration

```javascript
// Current: Custom OpenAICompatibleProvider (100+ lines)
// AI SDK 5:
import { openai } from '@ai-sdk/openai'
const model = openai('gpt-4')
```

#### 3. OpenRouter Migration

```javascript
// Current: Custom OpenrouterProvider
// AI SDK 5:
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
const openrouter = createOpenRouter({ apiKey })
const model = openrouter.chat('meta-llama/llama-3.1-405b-instruct')
```

#### 4. DeepSeek Migration

```javascript
// Current: Reuse OpenAICompatibleProvider
// AI SDK 5:
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
const deepseek = createOpenAICompatible({
  name: 'deepseek',
  apiKey: settings.deepseekApiKey,
  baseURL: 'https://api.deepseek.com/v1',
})
```

### Phase 5: Cleanup Legacy Code (Estimated: 1 hour)

#### Files to Remove:

- `src/lib/api/providers/baseProvider.js`
- `src/lib/api/providers/geminiProvider.js`
- `src/lib/api/providers/openaiCompatibleProvider.js`
- `src/lib/api/providers/openrouterProvider.js`
- `src/lib/api/providers/ollamaProvider.js`
- `src/lib/api/providersConfig.js`

#### Dependencies to Remove:

```bash
npm uninstall @google/genai
# Keep openai package as it's used by AI SDK
```

---

## Code Examples

### Before/After Comparison

#### Streaming Implementation:

##### Before (Current - 50+ lines):

```javascript
async *generateContentStream(model, contents, systemInstruction, generationConfig) {
  try {
    const result = await this.genAI.models.generateContentStream({
      model: model,
      contents: contents,
      systemInstruction: systemInstruction,
      generationConfig: generationConfig,
    })

    for await (const chunk of result) {
      const text = chunk.text
      if (text) {
        yield text
      }
    }
  } catch (error) {
    throw ErrorHandler.handle(error, {
      provider: 'Gemini',
      model: model,
      operation: 'generateContentStream',
    })
  }
}
```

##### After (AI SDK 5 - 10 lines):

```javascript
const { textStream } = streamText({
  model: google('gemini-2.0-flash'),
  system: systemInstruction,
  prompt: userPrompt,
  temperature: 0.7
})

for await (const chunk of textStream) {
  yield chunk
}
```

#### Error Handling:

##### Before (Custom per provider):

```javascript
catch (error) {
  throw ErrorHandler.handle(error, {
    provider: 'Gemini',
    model: model,
    operation: 'generateContent',
  })
}
```

##### After (Standardized):

```javascript
import { APICallError, InvalidArgumentError } from 'ai'

try {
  const result = await generateText({
    /* ... */
  })
} catch (error) {
  if (APICallError.isInstance(error)) {
    console.log('API Error:', error.message)
    console.log('Status:', error.statusCode)
  } else if (InvalidArgumentError.isInstance(error)) {
    console.log('Invalid Argument:', error.message)
  }
  throw error
}
```

---

## Implementation Checklist

### Phase 1: Setup ✅

- [ ] Install AI SDK 5 dependencies
- [ ] Update package.json
- [ ] Verify installations work

### Phase 2: Adapter Creation ✅

- [ ] Create `aiSdkAdapter.js`
- [ ] Implement provider mapping
- [ ] Test adapter with one provider

### Phase 3: Core API Migration ✅

- [ ] Update `summarizeContent()`
- [ ] Update `summarizeContentStream()`
- [ ] Update `summarizeChapters()`
- [ ] Update `enhancePrompt()`
- [ ] Test all functions work

### Phase 4: Provider Migration ✅

- [ ] Migrate Gemini provider
- [ ] Migrate OpenAI/ChatGPT provider
- [ ] Migrate OpenRouter provider
- [ ] Migrate DeepSeek provider
- [ ] Migrate Ollama provider
- [ ] Test each provider individually

### Phase 5: Cleanup ✅

- [ ] Remove legacy provider files
- [ ] Remove unnecessary dependencies
- [ ] Update imports throughout codebase
- [ ] Run full test suite

### Validation Criteria ✅

- [ ] All existing functionality works unchanged
- [ ] Streaming works for all providers
- [ ] Error handling provides useful messages
- [ ] Performance is same or better
- [ ] Code complexity reduced significantly

### Success Metrics ✅

- **Lines of Code**: Reduce from 800+ to ~200 lines
- **Provider Support**: Maintain all 6 current providers
- **Test Coverage**: Maintain 95%+ coverage
- **Performance**: Response time within 5% of current
- **Error Rate**: No increase in error rates

---

## Risk Assessment

### High Risk ❌

- **Breaking Changes**: API changes might break existing functionality
- **Mitigation**: Thorough testing và feature flagging

### Medium Risk ⚠️

- **Provider Compatibility**: Some providers might behave differently
- **Mitigation**: Provider-by-provider testing

### Low Risk ✅

- **Performance Impact**: AI SDK might be slower
- **Mitigation**: Performance benchmarking

---

## Timeline Summary

| Phase     | Tasks              | Estimated Time |
| --------- | ------------------ | -------------- |
| 1         | Dependencies Setup | 1 hour         |
| 2         | Create Adapter     | 2 hours        |
| 3         | Update Core API    | 3 hours        |
| 4         | Provider Migration | 2 hours        |
| 5         | Cleanup & Testing  | 1 hour         |
| **Total** | **Full Migration** | **9 hours**    |

---

## Conclusion

Migration sang AI SDK 5 sẽ mang lại benefits lớn:

- **Reduced Complexity**: 80% ít code hơn
- **Better Maintainability**: Official providers được maintain bởi community
- **Future-Proof**: Theo kịp latest AI provider features
- **Developer Experience**: Better TypeScript support và documentation

Đây là một investment tốt cho long-term maintainability của project.
