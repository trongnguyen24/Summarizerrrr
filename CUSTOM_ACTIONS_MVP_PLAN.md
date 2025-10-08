# Custom Actions MVP - Phase 1 Implementation Plan

## Overview

Triển khai 3 Custom Actions cố định (Analyze, Explain, Reply) sử dụng cơ chế có sẵn của hệ thống. Không cần database mới, chỉ mở rộng logic hiện có.

## MVP Features

- **Analyze**: Phân tích nội dung một cách có hệ thống
- **Explain**: Giải thích nội dung bằng ngôn ngữ đơn giản
- **Reply**: Tạo phản hồi sâu sắc với câu hỏi mở rộng

## Implementation Steps

### 1. Thêm Custom Action Templates

**File: `src/lib/prompting/promptTemplates.js`**

```javascript
// Thêm vào cuối file
export const customActionTemplates = {
  analyze: {
    systemPrompt:
      'You are an expert content analyst. Analyze the given content systematically, focusing on structure, arguments, evidence, and logical flow.',
    userPrompt:
      'Analyze this content focusing on:\n- Key arguments and main points\n- Logical structure and flow\n- Evidence and supporting details\n- Strengths and weaknesses\n- Conclusion and implications\n\nContent:\n__CONTENT__',
  },

  explain: {
    systemPrompt:
      'You are an expert educator who excels at making complex topics simple and accessible to everyone.',
    userPrompt:
      'Explain this content in clear, simple terms:\n- Break down complex concepts\n- Use analogies and examples when helpful\n- Define technical terms\n- Structure explanation logically\n- Make it engaging and easy to understand\n\nContent:\n__CONTENT__',
  },

  reply: {
    systemPrompt:
      'You are a thoughtful discussion partner who generates meaningful, constructive responses that encourage further dialogue.',
    userPrompt:
      'Generate a thoughtful response to this content:\n- Provide additional perspectives or viewpoints\n- Ask follow-up questions that encourage deeper thinking\n- Offer constructive feedback or commentary\n- Suggest related ideas or connections\n- Maintain a respectful, engaging tone\n\nContent:\n__CONTENT__',
  },
}
```

### 2. Mở rộng Summary Store

**File: `src/stores/summaryStore.svelte.js`**

#### A. Thêm state mới (dòng 29-54):

```javascript
export const summaryState = $state({
  // ... existing states
  currentActionType: 'summarize', // 'summarize' | 'analyze' | 'explain' | 'reply'
  customActionResult: '',
  isCustomActionLoading: false,
  customActionError: null,
})
```

#### B. Cập nhật resetState() (dòng 61-86):

```javascript
export function resetState() {
  // ... existing resets
  summaryState.currentActionType = 'summarize'
  summaryState.customActionResult = ''
  summaryState.isCustomActionLoading = false
  summaryState.customActionError = null
}
```

#### C. Cập nhật resetDisplayState() (dòng 91-105):

```javascript
export function resetDisplayState() {
  // ... existing resets
  summaryState.customActionResult = ''
  summaryState.customActionError = null
}
```

#### D. Thêm function mới (cuối file):

```javascript
/**
 * Execute custom action (analyze, explain, reply) on current page content
 * @param {string} actionType - 'analyze' | 'explain' | 'reply'
 */
export async function executeCustomAction(actionType) {
  // Prevent multiple simultaneous actions
  if (summaryState.isCustomActionLoading || summaryState.isLoading) {
    return
  }

  // Wait for settings to be initialized
  await loadSettings()
  const userSettings = settings

  // Reset custom action state
  summaryState.isCustomActionLoading = true
  summaryState.currentActionType = actionType
  summaryState.customActionResult = ''
  summaryState.customActionError = null
  summaryState.lastSummaryTypeDisplayed = 'custom'

  try {
    // Get current tab info
    const [tabInfo] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })

    if (!tabInfo || !tabInfo.url) {
      throw new Error('Could not get current tab information or URL.')
    }

    // Check Firefox permissions
    if (import.meta.env.BROWSER === 'firefox') {
      const hasPermission = await checkPermission(tabInfo.url)
      if (!hasPermission) {
        const permissionGranted = await requestPermission(tabInfo.url)
        if (!permissionGranted) {
          throw new Error('Permission denied for this website.')
        }
      }
    }

    // Set page info
    summaryState.pageTitle = tabInfo.title || 'Custom Action Result'
    summaryState.pageUrl = tabInfo.url

    // Get page content
    const contentResult = await getPageContent(
      'webpageText',
      userSettings.summaryLang
    )

    if (!contentResult.content || contentResult.content.trim() === '') {
      throw new Error('No content found on this page.')
    }

    // Execute custom action using existing summarizeContent function
    const result = await summarizeContent(contentResult.content, actionType)

    summaryState.customActionResult =
      result || '<p><i>Could not generate result.</i></p>'
  } catch (e) {
    const errorObject = handleError(e, {
      source: `customAction_${actionType}`,
    })
    summaryState.customActionError = errorObject
  } finally {
    summaryState.isCustomActionLoading = false
    // Log to history
    await logAllGeneratedSummariesToHistory()
  }
}
```

#### E. Cập nhật saveAllGeneratedSummariesToArchive() (dòng 624):

```javascript
export async function saveAllGeneratedSummariesToArchive() {
  const summariesToSave = []

  // ... existing summary checks

  // Add custom action result
  if (
    summaryState.customActionResult &&
    summaryState.customActionResult.trim() !== ''
  ) {
    summariesToSave.push({
      title:
        summaryState.currentActionType.charAt(0).toUpperCase() +
        summaryState.currentActionType.slice(1),
      content: summaryState.customActionResult,
    })
  }

  // ... rest of function
}
```

#### F. Cập nhật logAllGeneratedSummariesToHistory() (dòng 691):

```javascript
export async function logAllGeneratedSummariesToHistory() {
  const summariesToLog = []

  // ... existing summary checks

  // Add custom action result
  if (
    summaryState.customActionResult &&
    summaryState.customActionResult.trim() !== ''
  ) {
    summariesToLog.push({
      title:
        summaryState.currentActionType.charAt(0).toUpperCase() +
        summaryState.currentActionType.slice(1),
      content: summaryState.customActionResult,
    })
  }

  // ... rest of function
}
```

### 3. Cập nhật API để hỗ trợ Custom Actions

**File: `src/lib/api/api.js`**

Tìm hàm `summarizeContent()` và cập nhật switch case để bao gồm custom actions:

```javascript
// Trong hàm summarizeContent, thêm vào switch statement:
case 'analyze':
case 'explain':
case 'reply':
  systemInstruction = customActionTemplates[contentType].systemPrompt
  userPrompt = customActionTemplates[contentType].userPrompt.replace('__CONTENT__', content)
  break
```

Đảm bảo import customActionTemplates:

```javascript
import { customActionTemplates } from '@/lib/prompting/promptTemplates.js'
```

### 4. Tạo ActionButtons Component

**File: `src/components/buttons/ActionButtons.svelte`**

```svelte
<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { summaryState, executeCustomAction } from '@/stores/summaryStore.svelte.js'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'

  const actions = [
    {
      key: 'analyze',
      label: 'Analyze',
      icon: 'solar:chart-square-linear',
      description: 'Analyze content structure and arguments'
    },
    {
      key: 'explain',
      label: 'Explain',
      icon: 'solar:lightbulb-minimalistic-linear',
      description: 'Explain in simple terms'
    },
    {
      key: 'reply',
      label: 'Reply',
      icon: 'solar:chat-round-linear',
      description: 'Generate thoughtful response'
    }
  ]

  async function handleActionClick(actionType) {
    await executeCustomAction(actionType)
  }

  const isAnyLoading = $derived(
    summaryState.isLoading ||
    summaryState.isChapterLoading ||
    summaryState.isCourseSummaryLoading ||
    summaryState.isCourseConceptsLoading ||
    summaryState.isCustomActionLoading
  )
</script>

<div class="flex gap-2 flex-wrap justify-center">
  {#each actions as action}
    <button
      class="action-btn font-mono relative px-3 py-2 text-sm rounded-full border border-border/50 bg-surface-2/50 hover:bg-surface-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      onclick={() => handleActionClick(action.key)}
      disabled={isAnyLoading}
      title={action.description}
    >
      {#if summaryState.isCustomActionLoading && summaryState.currentActionType === action.key}
        <span transition:slideScaleFade>
          <Icon
            width={16}
            icon="svg-spinners:bouncing-ball"
            class="text-primary"
          />
        </span>
      {:else}
        <span transition:slideScaleFade>
          <Icon
            width={16}
            icon={action.icon}
            class="text-text-secondary"
          />
        </span>
      {/if}
      <span class="text-text-primary">{action.label}</span>
    </button>
  {/each}
</div>

<style>
  .action-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .action-btn:active {
    transform: translateY(0);
  }
</style>
```

### 5. Cập nhật Sidepanel

**File: `src/entrypoints/sidepanel/App.svelte`**

#### A. Thêm import ActionButtons (dòng 7):

```svelte
import ActionButtons from '@/components/buttons/ActionButtons.svelte'
```

#### B. Thêm ActionButtons sau SummarizeButton (dòng 245):

```svelte
{#if !needsApiKeySetup()()}
  <div class="flex flex-col gap-4 items-center justify-center">
    <SummarizeButton
      isLoading={summaryState.isLoading || isAnyCourseLoading}
      isChapterLoading={summaryState.isChapterLoading}
      disabled={!hasPermission && import.meta.env.BROWSER === 'firefox'}
    />

    <!-- Custom Action Buttons -->
    <ActionButtons />
  </div>
{/if}
```

#### C. Cập nhật anyError để bao gồm customActionError (dòng 100):

```javascript
const anyError = $derived(
  summaryState.summaryError ||
    summaryState.chapterError ||
    summaryState.courseSummaryError ||
    summaryState.courseConceptsError ||
    summaryState.selectedTextError ||
    summaryState.customActionError
)
```

#### D. Thêm display cho custom action results (dòng 300):

```svelte
{:else if summaryState.lastSummaryTypeDisplayed === 'custom'}
  <GenericSummaryDisplay
    summary={summaryState.customActionResult}
    isLoading={summaryState.isCustomActionLoading}
    loadingText="Processing {summaryState.currentActionType}..."
    targetId="custom-action-display"
    showTOC={true}
  />
```

### 6. Thêm Localization

**File: `src/lib/locales/en.json`**

```json
{
  "custom_actions": {
    "analyze": "Analyze",
    "explain": "Explain",
    "reply": "Reply",
    "analyze_description": "Analyze content structure and arguments",
    "explain_description": "Explain in simple terms",
    "reply_description": "Generate thoughtful response",
    "processing": "Processing {action}...",
    "error": "Failed to {action} content"
  }
}
```

**File: `src/lib/locales/vi.json`**

```json
{
  "custom_actions": {
    "analyze": "Phân tích",
    "explain": "Giải thích",
    "reply": "Phản hồi",
    "analyze_description": "Phân tích cấu trúc và lập luận nội dung",
    "explain_description": "Giải thích bằng ngôn ngữ đơn giản",
    "reply_description": "Tạo phản hồi sâu sắc",
    "processing": "Đang xử lý {action}...",
    "error": "Không thể {action} nội dung"
  }
}
```

## Files Modified Summary

### New Files (1):

- `src/components/buttons/ActionButtons.svelte`

### Modified Files (5):

1. `src/lib/prompting/promptTemplates.js` - Add custom action templates
2. `src/stores/summaryStore.svelte.js` - Add state and executeCustomAction function
3. `src/lib/api/api.js` - Support custom action types in summarizeContent
4. `src/entrypoints/sidepanel/App.svelte` - Add ActionButtons and display logic
5. `src/lib/locales/en.json` & `src/lib/locales/vi.json` - Add translations

## Testing Checklist

- [ ] ActionButtons render correctly in sidepanel
- [ ] Analyze button works with web content
- [ ] Explain button works with web content
- [ ] Reply button works with web content
- [ ] Loading states display correctly
- [ ] Error handling works properly
- [ ] Results save to archive correctly
- [ ] Results log to history correctly
- [ ] Buttons disabled during loading
- [ ] Firefox permissions work
- [ ] Works with YouTube/Course content
- [ ] Localization displays correctly

## Future Enhancements (Phase 2)

- Database storage for custom prompts
- Settings UI for managing actions
- User-defined custom actions
- Import/export action configurations
- Action categories and organization
- Keyboard shortcuts
- Action templates marketplace

## Benefits of This Approach

✅ **Minimal Changes**: Reuses 100% of existing logic  
✅ **Fast Implementation**: 3-5 days vs 2-3 weeks  
✅ **Low Risk**: No breaking changes to existing functionality  
✅ **Extensible**: Easy to add Phase 2 features later  
✅ **User-Focused**: Covers 80% of common use cases  
✅ **Maintainable**: Simple, clean code structure
