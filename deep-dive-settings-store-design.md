# Deep Dive Tool - Settings Store Design

## 📋 Overview

Chi tiết thiết kế settings structure cho Deep Dive tool, bao gồm:

- Default settings values
- Settings schema và validation
- Migration strategy từ old structure
- Settings update patterns

---

## 🗂️ Settings Structure

### Complete Settings Object

```javascript
// File: src/stores/settingsStore.svelte.js

const DEFAULT_SETTINGS = {
  // ... Existing settings (lines 8-99) ...

  // ============================================
  // TOOLS CONFIGURATION (NEW)
  // ============================================
  tools: {
    // Deep Dive Tool
    deepDive: {
      // Enable/Disable tool
      enabled: true,

      // Provider Configuration
      // Use Gemini Basic (free tier) or custom provider
      useGeminiBasic: true,

      // Custom provider settings (only used when useGeminiBasic = false)
      customProvider: 'gemini',
      customModel: 'gemini-2.5-flash-lite',

      // Auto-generate questions after summary completes
      autoGenerate: false,

      // Default chat provider for "Start Chat" action
      // 'gemini' | 'chatgpt' | 'perplexity' | 'grok'
      defaultChatProvider: 'gemini',
    },

    // Future tools will be added here
    // Example:
    // translator: {
    //   enabled: true,
    //   provider: 'gemini-basic',
    //   targetLanguages: ['vi', 'en', 'ja'],
    //   autoDetectSource: true,
    // },
  },
}
```

---

## 🔄 Migration Strategy

### Scenario 1: Fresh Install

- No migration needed
- DEFAULT_SETTINGS will be used as-is
- Tools section initialized with defaults

### Scenario 2: Existing Users (Update from old version)

- Old settings structure exists without `tools` key
- Need to add `tools` object to settings
- Preserve all existing settings

### Scenario 3: Future Tool Updates

- New tools added to DEFAULT_SETTINGS
- Existing tool configs preserved
- Missing tool configs use defaults

### Migration Code

```javascript
// File: src/stores/settingsStore.svelte.js
// Update in loadSettings() function (around line 134-231)

export async function loadSettings() {
  if (_isInitializedPromise) {
    return _isInitializedPromise
  }

  _isInitializedPromise = (async () => {
    try {
      const storedSettings = await settingsStorage.getValue()
      if (storedSettings && Object.keys(storedSettings).length > 0) {
        // ... Existing migration logic ...

        // ============================================
        // TOOLS MIGRATION (NEW)
        // ============================================

        // If tools object doesn't exist, initialize it
        if (!storedSettings.tools) {
          console.log('[settingsStore] Migration: Adding tools configuration')
          storedSettings.tools = DEFAULT_SETTINGS.tools
        } else {
          // If tools exists but is missing some tools, merge with defaults
          storedSettings.tools = {
            ...DEFAULT_SETTINGS.tools,
            ...storedSettings.tools,
          }

          // Ensure each tool has all required fields
          Object.keys(DEFAULT_SETTINGS.tools).forEach((toolName) => {
            if (!storedSettings.tools[toolName]) {
              console.log(
                `[settingsStore] Migration: Adding ${toolName} tool config`
              )
              storedSettings.tools[toolName] = DEFAULT_SETTINGS.tools[toolName]
            } else {
              // Merge tool settings with defaults to ensure all fields exist
              storedSettings.tools[toolName] = {
                ...DEFAULT_SETTINGS.tools[toolName],
                ...storedSettings.tools[toolName],
              }
            }
          })
        }

        // Merge settings with defaults
        const mergedSettings = {
          ...DEFAULT_SETTINGS,
          ...storedSettings,
        }
        Object.assign(settings, mergedSettings)

        // Save cleaned settings back to storage
        await settingsStorage.setValue(
          JSON.parse(JSON.stringify(mergedSettings))
        )
      } else {
        // No settings in storage, initialize with defaults
        await settingsStorage.setValue(DEFAULT_SETTINGS)
        Object.assign(settings, DEFAULT_SETTINGS)
      }
    } catch (error) {
      console.error('[settingsStore] Error loading settings:', error)
      Object.assign(settings, DEFAULT_SETTINGS)
    }
  })()

  return _isInitializedPromise
}
```

---

## 🛡️ Settings Schema & Validation

### Tools Schema

```javascript
// File: src/lib/config/settingsSchema.js (if exists, otherwise add to settingsStore)

/**
 * Validates Deep Dive tool settings
 * @param {Object} toolSettings - Deep Dive settings object
 * @returns {Object} Validated and sanitized settings
 */
export function validateDeepDiveSettings(toolSettings) {
  const defaults = {
    enabled: true,
    useGeminiBasic: true,
    customProvider: 'gemini',
    customModel: 'gemini-2.5-flash-lite',
    autoGenerate: false,
    defaultChatProvider: 'gemini',
  }

  return {
    enabled:
      typeof toolSettings.enabled === 'boolean'
        ? toolSettings.enabled
        : defaults.enabled,

    useGeminiBasic:
      typeof toolSettings.useGeminiBasic === 'boolean'
        ? toolSettings.useGeminiBasic
        : defaults.useGeminiBasic,

    customProvider: validateProvider(
      toolSettings.customProvider,
      defaults.customProvider
    ),

    customModel:
      typeof toolSettings.customModel === 'string' &&
      toolSettings.customModel.trim() !== ''
        ? toolSettings.customModel
        : defaults.customModel,

    autoGenerate:
      typeof toolSettings.autoGenerate === 'boolean'
        ? toolSettings.autoGenerate
        : defaults.autoGenerate,

    defaultChatProvider: validateChatProvider(
      toolSettings.defaultChatProvider,
      defaults.defaultChatProvider
    ),
  }
}

/**
 * Validates provider ID
 */
function validateProvider(provider, defaultValue) {
  const validProviders = [
    'gemini',
    'openrouter',
    'chatgpt',
    'openai',
    'groq',
    'deepseek',
    'ollama',
    'lmstudio',
    'openaiCompatible',
  ]

  return validProviders.includes(provider) ? provider : defaultValue
}

/**
 * Validates chat provider
 */
function validateChatProvider(provider, defaultValue) {
  const validChatProviders = ['gemini', 'chatgpt', 'perplexity', 'grok']
  return validChatProviders.includes(provider) ? provider : defaultValue
}

/**
 * Validates entire tools configuration
 */
export function validateToolsSettings(toolsSettings) {
  const validated = {}

  // Deep Dive
  if (toolsSettings.deepDive) {
    validated.deepDive = validateDeepDiveSettings(toolsSettings.deepDive)
  }

  // Add validators for future tools here

  return validated
}
```

---

## 📝 Settings Update Patterns

### Pattern 1: Update Single Tool Setting

```javascript
// From a component
import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'

/**
 * ✅ ĐÚNG - Update single tool setting
 * Tạo shallow copy để trigger reactivity
 */
function updateDeepDiveSetting(key, value) {
  updateSettings({
    tools: {
      ...settings.tools,
      deepDive: {
        ...settings.tools.deepDive,
        [key]: value,
      },
    },
  })
}

// Usage
updateDeepDiveSetting('autoGenerate', true)
updateDeepDiveSetting('customProvider', 'openrouter')
```

### Pattern 2: Update Multiple Tool Settings

```javascript
/**
 * ✅ ĐÚNG - Update multiple tool settings at once
 * Hiệu quả hơn vì chỉ trigger một lần updateSettings
 */
function updateDeepDiveSettings(updates) {
  updateSettings({
    tools: {
      ...settings.tools,
      deepDive: {
        ...settings.tools.deepDive,
        ...updates,
      },
    },
  })
}

// Usage
updateDeepDiveSettings({
  useGeminiBasic: false,
  customProvider: 'openrouter',
  customModel: 'anthropic/claude-3-opus',
})
```

### Pattern 3: Toggle Tool Enabled

```javascript
function toggleToolEnabled(toolName, enabled) {
  updateSettings({
    tools: {
      ...settings.tools,
      [toolName]: {
        ...settings.tools[toolName],
        enabled,
      },
    },
  })
}

// Usage
toggleToolEnabled('deepDive', false)
```

### Pattern 4: Reset Tool to Defaults

```javascript
function resetToolToDefaults(toolName) {
  const defaults = DEFAULT_SETTINGS.tools[toolName]
  if (!defaults) {
    console.error(`Tool "${toolName}" not found in defaults`)
    return
  }

  updateSettings({
    tools: {
      ...settings.tools,
      [toolName]: { ...defaults },
    },
  })
}

// Usage
resetToolToDefaults('deepDive')
```

---

## 🔍 Settings Access Patterns

### Pattern 1: Reactive Access in Components

```svelte
<script>
  import { settings } from '@/stores/settingsStore.svelte.js'

  // ✅ Direct reactive access - settings là $state nên tự động reactive
  // Không cần tạo intermediate derived values
</script>

{#if settings.tools.deepDive.enabled}
  <div>Deep Dive is enabled</div>
{/if}

<!-- Hoặc nếu cần derived value với safety check: -->
<script>
  import { settings } from '@/stores/settingsStore.svelte.js'

  // ✅ Sử dụng $derived.by() cho complex computations
  let toolSettings = $derived.by(() => settings.tools?.deepDive ?? {})
  let isEnabled = $derived(toolSettings.enabled ?? false)
</script>

{#if isEnabled}
  <div>Deep Dive is enabled</div>
{/if}
```

### Pattern 2: Direct Access in Services

```javascript
import { settings } from '@/stores/settingsStore.svelte.js'

export function getDeepDiveConfig() {
  return settings.tools.deepDive
}

export function isDeepDiveEnabled() {
  return settings.tools.deepDive.enabled
}

export function getNumQuestions() {
  return settings.tools.deepDive.numQuestions
}
```

### Pattern 3: Safe Conditional Access

```javascript
/**
 * ✅ ĐÚNG - Safe access với proper validation
 * Sử dụng optional chaining và nullish coalescing
 */
export function getToolConfig(toolName) {
  const toolConfig = settings.tools?.[toolName]

  if (!toolConfig) {
    throw new Error(`Tool "${toolName}" not found in settings`)
  }

  if (!toolConfig.enabled) {
    throw new Error(
      `Tool "${toolName}" is disabled. Enable it in Settings > Tools.`
    )
  }

  return toolConfig
}

/**
 * ✅ Safe getter không throw error
 */
export function getToolConfigSafe(toolName) {
  return settings.tools?.[toolName] ?? null
}

/**
 * ✅ Check if tool is available và enabled
 */
export function isToolAvailable(toolName) {
  return settings.tools?.[toolName]?.enabled ?? false
}
```

---

## 🧪 Testing Scenarios

### Test Case 1: Fresh Install

```javascript
// Expected: DEFAULT_SETTINGS.tools is used
{
  tools: {
    deepDive: {
      enabled: true,
      useGeminiBasic: true,
      customProvider: 'gemini',
      customModel: 'gemini-2.5-flash-lite',
      autoGenerate: false,
      defaultChatProvider: 'gemini',
    }
  }
}
```

### Test Case 2: Update from Version Without Tools

```javascript
// Before (old settings)
{
  selectedProvider: 'gemini',
  geminiApiKey: 'abc123',
  // ... other settings, NO tools key
}

// After migration
{
  selectedProvider: 'gemini',
  geminiApiKey: 'abc123',
  tools: {
    deepDive: { /* defaults */ }
  }
}
```

### Test Case 3: Partial Tool Config Exists

```javascript
// Before (incomplete tool config)
{
  tools: {
    deepDive: {
      enabled: false,
      autoGenerate: true,
      // Missing other fields
    }
  }
}

// After migration (merged with defaults)
{
  tools: {
    deepDive: {
      enabled: false,          // Preserved
      autoGenerate: true,      // Preserved
      useGeminiBasic: true,    // Added from defaults
      customProvider: 'gemini', // Added from defaults
      customModel: 'gemini-2.5-flash-lite', // Added
      defaultChatProvider: 'gemini', // Added
    }
  }
}
```

### Test Case 4: Invalid Values

```javascript
// Before (invalid values)
{
  tools: {
    deepDive: {
      useGeminiBasic: 'invalid',  // Not boolean
      customProvider: 'invalid-provider',
      customModel: '',  // Empty string
    }
  }
}

// After validation
{
  tools: {
    deepDive: {
      useGeminiBasic: true,    // Reset to default
      customProvider: 'gemini', // Reset to default
      customModel: 'gemini-2.5-flash-lite', // Reset to default
    }
  }
}
```

---

## 🚀 Implementation Steps

### Step 1: Update DEFAULT_SETTINGS

**File**: [`src/stores/settingsStore.svelte.js`](src/stores/settingsStore.svelte.js:8)

**Location**: After line 99 (after existing settings)

**Code**:

```javascript
// Tools Configuration
tools: {
  deepDive: {
    enabled: true,
    useGeminiBasic: true,
    customProvider: 'gemini',
    customModel: 'gemini-2.5-flash-lite',
    autoGenerate: false,
    defaultChatProvider: 'gemini',
  },
},
```

### Step 2: Add Migration Logic

**File**: [`src/stores/settingsStore.svelte.js`](src/stores/settingsStore.svelte.js:134)

**Location**: Inside `loadSettings()` function, after existing migrations (around line 206)

**Code**: See "Migration Code" section above

### Step 3: Add Validation (Optional but Recommended)

**File**: [`src/lib/config/settingsSchema.js`](src/lib/config/settingsSchema.js) or add to settingsStore

**Code**: See "Settings Schema & Validation" section above

### Step 4: Export Helper Functions

**File**: [`src/stores/settingsStore.svelte.js`](src/stores/settingsStore.svelte.js:404)

**Location**: At end of file (after clearPermissionCache)

**Code**:

```javascript
// --- Tool Settings Helper Functions ---

/**
 * Updates a specific tool's settings
 * @param {string} toolName - Name of the tool
 * @param {Object} updates - Settings to update
 */
export async function updateToolSettings(toolName, updates) {
  if (!_isInitializedPromise) {
    await loadSettings()
  }
  await _isInitializedPromise

  if (!settings.tools[toolName]) {
    console.error(`[settingsStore] Tool "${toolName}" not found`)
    return
  }

  const updatedTools = {
    ...settings.tools,
    [toolName]: {
      ...settings.tools[toolName],
      ...updates,
    },
  }

  await updateSettings({ tools: updatedTools })
}

/**
 * Gets a specific tool's settings
 * @param {string} toolName - Name of the tool
 * @returns {Object|null} Tool settings or null if not found
 */
export function getToolSettings(toolName) {
  return settings.tools?.[toolName] || null
}

/**
 * Checks if a tool is enabled
 * @param {string} toolName - Name of the tool
 * @returns {boolean} True if tool is enabled
 */
export function isToolEnabled(toolName) {
  return settings.tools?.[toolName]?.enabled || false
}
```

---

## 📊 Settings Flow Diagram

```mermaid
graph TD
    A[Extension Loads] --> B{Settings Exist?}
    B -->|No| C[Use DEFAULT_SETTINGS]
    B -->|Yes| D{Has tools key?}

    D -->|No| E[Migrate: Add tools from defaults]
    D -->|Yes| F{All tools present?}

    F -->|No| G[Merge with defaults]
    F -->|Yes| H{All fields valid?}

    G --> H
    H -->|No| I[Validate & fix invalid values]
    H -->|Yes| J[Settings Ready]

    E --> J
    I --> J
    C --> J

    J --> K[Save to Storage]
    K --> L[Initialize Extension]
```

---

## 🎯 Key Decisions & Rationale

### 1. Why Nested `tools` Object?

- ✅ Clear separation from main settings
- ✅ Easy to add new tools without conflicts
- ✅ Tools can have similar field names without collision
- ✅ Easy to loop through all tools programmatically

### 2. Why `useGeminiBasic` Boolean Flag?

- ✅ Most users already have Gemini Basic key configured
- ✅ Clear and explicit: true = basic, false = custom
- ✅ Easy to understand and toggle in UI
- ✅ No ambiguity about provider selection

### 3. Why Separate `defaultChatProvider`?

- ✅ Question generation (API) ≠ Chat interaction (web UI)
- ✅ Users might want different providers for different purposes
- ✅ Chat providers don't need API keys (use web UI)
- ✅ More flexibility for user preferences

### 4. Why Simplify Settings?

- ✅ Simplifies UI and reduces cognitive load
- ✅ Most users don't need advanced settings (temperature/topP)
- ✅ Use sensible defaults (temp 0.7, topP 0.9)
- ✅ Advanced users can use custom providers if needed
- ✅ Focus on provider selection, not fine-tuning parameters

### 5. Why Validation Functions?

- ✅ Prevent invalid values breaking the app
- ✅ Graceful degradation with defaults
- ✅ Better error messages for debugging
- ✅ Type safety without TypeScript complexity

---

## ✅ Completion Checklist

- [x] Design complete settings structure
- [x] Define default values
- [x] Design migration strategy
- [x] Create validation functions
- [x] Define update patterns
- [x] Define access patterns
- [x] Create test scenarios
- [x] Document implementation steps
- [ ] Implement in [`settingsStore.svelte.js`](src/stores/settingsStore.svelte.js)
- [ ] Add tools validation logic in migration
- [ ] Test migrations with various scenarios
- [ ] Verify validation works correctly
- [ ] Test settings persistence across updates

---

**Status**: ✅ Design complete - Ready for implementation

**Next Step**: Implement in [`src/stores/settingsStore.svelte.js`](src/stores/settingsStore.svelte.js)
