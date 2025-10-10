# Kế hoạch tích hợp Custom Actions vào FloatingPanel

## 1. Tổng quan kiến trúc

### Kiến trúc hiện tại:

- **Sidepanel**: Sử dụng global `summaryState` từ `summaryStore.svelte.js`
- **FloatingPanel**: Sử dụng local `localSummaryState` từ `useSummarization.svelte.js` composable
- **Custom Actions**: Hiện tại chỉ có trong sidepanel với `executeCustomAction()` function

### Approach được chọn:

**Extend `useSummarization` composable** thay vì mix global và local state để maintain independence của FloatingPanel architecture.

## 2. Files cần thay đổi

### 2.1. Core Files (Cần modify)

#### `src/entrypoints/content/composables/useSummarization.svelte.js`

**Chức năng**: Extend để support custom actions
**Thay đổi**:

- Thêm custom action state vào `localSummaryState`
- Implement `executeCustomAction()` function
- Thêm logic kiểm tra `areAllSummariesCompleted()`
- Update save functions để handle custom action results

#### `src/entrypoints/content/components/FloatingPanel.svelte`

**Chức năng**: Main floating panel component
**Thay đổi**:

- Import ActionButtons và ActionButtonsMini
- Thêm custom action buttons vào header
- Thêm logic hiển thị ActionButtonsMini khi có summaries
- Import và sử dụng custom action functions từ useSummarization

#### `src/components/displays/floating-panel/FloatingPanelContent.svelte`

**Chức năng**: Content display logic
**Thay đổi**:

- Thêm case để hiển thị custom action results
- Handle `lastCustomActionType` để render đúng display
- Pass custom action state từ summarization

### 2.2. Existing Components (Sử dụng lại)

#### `src/components/buttons/ActionButtons.svelte`

**Chức năng**: Main action buttons (Analyze, Explain, Debate)
**Sử dụng**: Import vào FloatingPanel header

#### `src/components/buttons/ActionButtonsMini.svelte`

**Chức năng**: Mini action buttons (icon-only)
**Thay đổi nhỏ**: Cần modify để sử dụng local state thay vì global summaryState

#### `src/components/displays/floating-panel/GenericSummaryDisplayFP.svelte`

**Chức năng**: Generic summary display
**Sử dụng**: Render custom action results

### 2.3. Services (Sử dụng lại)

#### `src/entrypoints/content/services/SummarizationService.js`

**Sử dụng**: Existing service, có thể cần thêm custom action methods

#### `src/entrypoints/content/services/ContentExtractorService.js`

**Sử dụng**: Content extraction, không thay đổi

#### `src/entrypoints/content/services/FloatingPanelStorageService.js`

**Sử dụng**: Save to history/archive, có thể cần update để handle custom actions

#### `src/lib/api/api.js`

**Sử dụng**: API calls với custom action types ('analyze', 'explain', 'debate')

## 3. Implementation Plan

### Phase 1: Extend useSummarization Composable

#### 3.1. Thêm Custom Action State

```javascript
// Trong localSummaryState
currentActionType: 'summarize', // 'summarize' | 'analyze' | 'explain' | 'debate'
customActionResult: '',
isCustomActionLoading: false,
customActionError: null,
lastActionType: null, // Track loại action cuối cùng
```

#### 3.2. Implement executeCustomAction Function

```javascript
async function executeCustomAction(actionType) {
  // Tương tự summarizePageContent() logic
  // Sử dụng existing SummarizationService
  // Update custom action state
  // Auto-save to history
}
```

#### 3.3. Thêm Helper Functions

```javascript
function areAllSummariesCompleted() {
  // Logic kiểm tra xem có summaries nào completed không
}

function hasAnyCustomActionResult() {
  // Kiểm tra có custom action results không
}
```

### Phase 2: Tích hợp vào FloatingPanel

#### 2.1. Import Components

```javascript
import ActionButtons from '@/components/buttons/ActionButtons.svelte'
import ActionButtonsMini from '@/components/buttons/ActionButtonsMini.svelte'
```

#### 2.2. Thêm vào Header (cạnh SummarizeButton)

```svelte
{#if !needsApiKeySetup()()}
  <SummarizeButton ... />

  <!-- Action Buttons cho main actions -->
  <ActionButtons
    onActionClick={summarization.executeCustomAction}
    isLoading={summarization.localSummaryState().isCustomActionLoading}
  />
{/if}

<!-- Action Buttons Mini khi có summaries -->
{#if summarization.areAllSummariesCompleted()}
  <ActionButtonsMini
    onActionClick={summarization.executeCustomAction}
    isLoading={summarization.localSummaryState().isCustomActionLoading}
  />
{/if}
```

### Phase 3: Update Display Logic

#### 3.1. Cập nhật FloatingPanelContent

```svelte
{:else if contentType === 'custom'}
  <GenericSummaryDisplayFP
    summary={summarization.localSummaryState().customActionResult}
    isLoading={summarization.localSummaryState().isCustomActionLoading}
    loadingText="Processing {summarization.localSummaryState().currentActionType}..."
    targetId="fp-custom-action-display"
    {summarization}
  />
```

#### 3.2. Content Type Detection

Thêm logic để detect khi nào hiển thị custom action results thay vì normal summaries.

### Phase 4: ActionButtons Integration

#### 4.1. Modify ActionButtons.svelte

```svelte
<script>
  let { onActionClick, isLoading } = $props()

  async function handleActionClick(actionType) {
    await onActionClick?.(actionType)
  }
</script>
```

#### 4.2. Modify ActionButtonsMini.svelte

Tương tự, thay đổi để nhận props thay vì dùng global state.

## 4. Data Flow

### 4.1. Normal Summarization Flow

```
FloatingPanel → useSummarization → SummarizationService → API → Display
```

### 4.2. Custom Action Flow

```
ActionButtons → useSummarization.executeCustomAction() → SummarizationService → API → Custom Display
```

### 4.3. State Management

- **Local State**: Tất cả state trong `localSummaryState`
- **Independence**: Không depend vào global `summaryState`
- **Persistence**: Auto-save qua FloatingPanelStorageService

## 5. Testing Checklist

- [ ] ActionButtons render correctly trong FloatingPanel
- [ ] ActionButtonsMini hiển thị khi có summaries completed
- [ ] Custom actions execute correctly (analyze, explain, debate)
- [ ] Loading states display properly
- [ ] Custom action results display in FloatingPanelContent
- [ ] Error handling works for custom actions
- [ ] Custom actions save to history/archive correctly
- [ ] Independence từ global state maintained
- [ ] Không conflict với normal summarization

## 6. File Dependencies

### Import Dependencies

```javascript
// FloatingPanel.svelte
import ActionButtons from '@/components/buttons/ActionButtons.svelte'
import ActionButtonsMini from '@/components/buttons/ActionButtonsMini.svelte'

// useSummarization.svelte.js
import { summarizeContent } from '@/lib/api/api.js'
// (đã có sẵn)
```

### Modified Files Summary

1. **`src/entrypoints/content/composables/useSummarization.svelte.js`** - Core extension
2. **`src/entrypoints/content/components/FloatingPanel.svelte`** - UI integration
3. **`src/components/displays/floating-panel/FloatingPanelContent.svelte`** - Display logic
4. **`src/components/buttons/ActionButtons.svelte`** - Make reusable với props
5. **`src/components/buttons/ActionButtonsMini.svelte`** - Make reusable với props

### Unchanged Files (Reuse)

- `src/entrypoints/content/services/SummarizationService.js`
- `src/entrypoints/content/services/ContentExtractorService.js`
- `src/entrypoints/content/services/FloatingPanelStorageService.js`
- `src/lib/api/api.js`
- `src/components/displays/floating-panel/GenericSummaryDisplayFP.svelte`

## 7. Implementation Order

1. **Extend useSummarization composable** (Phase 1)
2. **Modify ActionButtons để reusable** (Phase 4)
3. **Integrate vào FloatingPanel** (Phase 2)
4. **Update display logic** (Phase 3)
5. **Testing và debugging** (Phase 5)

Approach này đảm bảo FloatingPanel giữ nguyên independence architecture trong khi thêm custom actions functionality tương tự sidepanel.
