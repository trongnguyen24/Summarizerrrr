# Welcome Flow Implementation Plan

## Tổng quan

Tạo welcome flow cho người dùng mới khi chưa có API key nào được cấu hình. Welcome flow sẽ thay thế UI summarize chính và hướng dẫn người dùng qua 3 bước cơ bản.

## Luồng hoạt động

```mermaid
flowchart TD
    A[User mở Sidepanel] --> B{Có API key?}
    B -->|Không| C[Welcome Flow]
    B -->|Có| D[UI chính]

    C --> E[Bước 1: Chọn ngôn ngữ UI<br/>Language buttons<br/>+ Next button]
    E --> F[Bước 2: Setup API<br/>+ Provider selector<br/>+ API key input<br/>+ Video guide link<br/>+ Test button<br/>+ Back/Next buttons]
    F --> G[Bước 3: Chọn ngôn ngữ tóm tắt<br/>+ Back/Finish buttons]
    G --> H[Hoàn thành → UI chính]

    F -.->|Advanced Settings| I[Mở Settings page]
    F -->|Back| E
    G -->|Back| F
```

## Logic kiểm tra người dùng mới

### Function: `hasAnyApiKey(settings)`

```javascript
export function hasAnyApiKey(settings) {
  const apiKeyFields = [
    'geminiApiKey',
    'geminiAdvancedApiKey',
    'openaiCompatibleApiKey',
    'openrouterApiKey',
    'deepseekApiKey',
    'chatgptApiKey',
    'groqApiKey',
  ]

  return apiKeyFields.some((field) => {
    const key = settings[field]
    return (
      key && key.trim() && key !== 'AIzaSyA6I0DGp3XgSoGDZqergz9JAryupj-0JOI'
    ) // Loại trừ demo key
  })
}
```

### Function: `isNewUser(settings)`

```javascript
export function isNewUser(settings) {
  return !hasAnyApiKey(settings) && !settings.hasCompletedOnboarding
}
```

## Cập nhật Settings Store

### Thêm vào DEFAULT_SETTINGS:

```javascript
const DEFAULT_SETTINGS = {
  // ... existing settings
  hasCompletedOnboarding: false,
  onboardingStep: 0,
}
```

### Function: `completeOnboarding()`

```javascript
export async function completeOnboarding() {
  await updateSettings({
    hasCompletedOnboarding: true,
    onboardingStep: 0,
  })
}
```

## Component Structure

### 1. WelcomeFlow.svelte (Component chính)

```javascript
// State management
let currentStep = $state(1)
let selectedUILang = $state('en')
let selectedProvider = $state('gemini')
let apiKey = $state('')
let isTestingKey = $state(false)
let testResult = $state(null)
let selectedSummaryLang = $state('Vietnamese')

// Navigation functions
function nextStep() {
  currentStep++
}
function prevStep() {
  currentStep--
}
function goToSettings() {
  browser.tabs.create({ url: 'settings.html' })
}
```

### 2. Bước 1: WelcomeLanguageStep.svelte

**Features:**

- Grid layout với buttons cho các ngôn ngữ phổ biến
- Khi click sẽ cập nhật `settings.uiLang` và chuyển step
- Ngôn ngữ: English, Vietnamese, Spanish, Chinese, German, French, Japanese, Korean

**UI Layout:**

```
Welcome to Summarizer!
Choose your interface language

[EN] [VI] [ES] [ZH]
[DE] [FR] [JA] [KO]

[Next →]
```

### 3. Bước 2: WelcomeApiKeyStep.svelte

**Features:**

- Provider selector (dropdown hoặc radio buttons)
- Dynamic API key input thay đổi theo provider
- Link đến video hướng dẫn cách lấy API key
- Test button để kiểm tra API key
- Skip button để vào Settings

**Providers hỗ trợ:**

- Gemini (default)
- ChatGPT/OpenAI
- OpenRouter
- DeepSeek
- Groq

**UI Layout:**

```
Setup your AI provider

Provider: [Gemini ▼]

API Key: [________________] [👁]
         [📺 How to get API key]

[Test API Key] - Loading/Success/Error state

[← Back] [Advanced Settings] [Next →]
```

### 4. Bước 3: WelcomeSummaryLangStep.svelte

**Features:**

- Dropdown chọn ngôn ngữ tóm tắt
- Preview example summary trong ngôn ngữ được chọn

**UI Layout:**

```
Choose summary language

Summary Language: [Vietnamese ▼]

Preview: "This is how your summaries will look..."

[← Back] [Finish Setup]
```

## API Key Testing Logic

### Function: `testApiKey(provider, apiKey)`

```javascript
export async function testApiKey(provider, apiKey) {
  try {
    // Tạo settings object tạm thời cho test
    const tempSettings = {
      ...settings,
      selectedProvider: provider,
      [`${provider}ApiKey`]: apiKey,
    }

    // Test với prompt đơn giản
    const result = await generateContent(
      provider,
      tempSettings,
      'You are a helpful assistant',
      "Say 'Hello' in one word only"
    )

    return {
      success: true,
      message: 'API key is valid!',
      result: result,
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || 'API key test failed',
      error: error,
    }
  }
}
```

### Provider-specific API key fields:

```javascript
const PROVIDER_API_KEY_MAP = {
  gemini: 'geminiApiKey',
  chatgpt: 'chatgptApiKey',
  openrouter: 'openrouterApiKey',
  deepseek: 'deepseekApiKey',
  groq: 'groqApiKey',
  openaiCompatible: 'openaiCompatibleApiKey',
}
```

## Tích hợp vào Sidepanel

### Cập nhật src/entrypoints/sidepanel/App.svelte:

```javascript
import WelcomeFlow from '@/components/welcome/WelcomeFlow.svelte'
import { isNewUser } from '@/lib/utils/userHelpers.js'

// Derived state
const showWelcomeFlow = $derived(() => isNewUser(settings))

// Template logic
{#if showWelcomeFlow}
  <WelcomeFlow />
{:else}
  <!-- Existing UI -->
{/if}
```

## File Structure

```
src/
├── components/welcome/
│   ├── WelcomeFlow.svelte                 # Component chính quản lý 3 bước
│   ├── steps/
│   │   ├── WelcomeLanguageStep.svelte     # Bước 1: Chọn ngôn ngữ UI
│   │   ├── WelcomeApiKeyStep.svelte       # Bước 2: Setup API key
│   │   └── WelcomeSummaryLangStep.svelte  # Bước 3: Chọn ngôn ngữ tóm tắt
│   └── shared/
│       ├── WelcomeCard.svelte             # Container card cho mỗi bước
│       └── StepIndicator.svelte           # Progress indicator (1/3, 2/3, 3/3)
├── lib/utils/
│   ├── userHelpers.js                     # hasAnyApiKey, isNewUser functions
│   └── apiKeyTester.js                    # testApiKey function
└── stores/
    └── settingsStore.svelte.js            # Cập nhật với onboarding fields
```

## Navigation Logic

### Step Management:

```javascript
const STEPS = {
  LANGUAGE: 1,
  API_SETUP: 2,
  SUMMARY_LANG: 3,
}

// Navigation conditions
function canGoNext(step) {
  switch (step) {
    case STEPS.LANGUAGE:
      return selectedUILang !== null
    case STEPS.API_SETUP:
      return testResult?.success === true
    case STEPS.SUMMARY_LANG:
      return selectedSummaryLang !== null
    default:
      return false
  }
}
```

## Styling & UX

### Design principles:

- **Clean & minimal**: Focus vào từng bước, không overwhelm user
- **Progress indication**: Hiển thị rõ ràng đang ở bước nào
- **Responsive**: Hoạt động tốt trên mobile và desktop
- **Consistent**: Sử dụng design system hiện có của project
- **Accessible**: Screen reader friendly, keyboard navigation

### Animations:

- Slide transition giữa các bước
- Loading states cho API testing
- Success/error feedback với màu sắc phù hợp

## Error Handling

### API Key Test Errors:

```javascript
const ERROR_MESSAGES = {
  invalid_api_key: 'API key is invalid. Please check and try again.',
  network_error: 'Network error. Please check your connection.',
  rate_limit: 'API rate limit reached. Please try again later.',
  unknown: 'Something went wrong. Please try again.',
}
```

### Fallback behaviors:

- Nếu test API key thất bại, cho phép retry
- Nếu có lỗi network, hiển thị retry button
- Nếu user muốn skip, redirect đến settings page

## Implementation Priority

1. **Phase 1: Core Logic** (Items 3-4)

   - Cập nhật settings store với onboarding fields
   - Tạo helper functions (hasAnyApiKey, isNewUser)
   - Tạo API key testing logic

2. **Phase 2: Components** (Items 5-8)

   - WelcomeFlow.svelte với step management
   - 3 step components cơ bản
   - Navigation logic

3. **Phase 3: Integration** (Items 9-14)
   - Tích hợp vào sidepanel
   - Polish UX với animations
   - Testing và bug fixes

## Testing Strategy

### Manual testing scenarios:

1. **Fresh install**: Không có API key nào → Hiển thị welcome flow
2. **Existing user**: Đã có API key → Không hiển thị welcome flow
3. **Step navigation**: Forward/backward navigation hoạt động đúng
4. **API key testing**: Test với valid/invalid keys cho từng provider
5. **Settings persistence**: Các settings được lưu đúng sau khi hoàn thành
6. **Responsive**: Test trên mobile và desktop
7. **Accessibility**: Test với screen reader và keyboard navigation

### Edge cases:

- User đóng tab giữa chừng welcome flow
- Network issues trong khi test API key
- Invalid provider selection
- Corrupted settings data
