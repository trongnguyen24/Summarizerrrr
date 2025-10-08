# Custom Actions Feature - Implementation Plan

## Overview

Thêm tính năng các nút hành động tùy chỉnh (Analyze, Explain, Reply, etc.) vào sidepanel, cho phép người dùng quản lý prompts tùy chọn thông qua prompt entrypoint.

## Requirements

- Người dùng có thể thêm/xóa/sửa/kích hoạt prompts tùy chỉnh
- Chỉ prompts được active mới hiển thị trong sidepanel
- Các nút action hiển thị trong hàng riêng bên dưới nút Summarize
- Không giới hạn số lượng prompts active
- Tích hợp vào menu hiện tại của prompt entrypoint

## Database Schema

### New Table: `custom_prompts`

```javascript
{
  id: string,              // UUID
  name: string,            // Display name (e.g., "Analyze", "Explain")
  systemPrompt: string,    // System instruction
  userPrompt: string,      // User prompt with __CONTENT__ placeholder
  isActive: boolean,       // Show in sidepanel or not
  order: number,           // Display order in sidepanel
  isDefault: boolean,      // Cannot be deleted (for 3 default prompts)
  createdAt: datetime,
  updatedAt: datetime
}
```

### Default Prompts

1. **Analyze**

   - name: "Analyze"
   - systemPrompt: "You are an expert content analyst. Analyze the given content systematically."
   - userPrompt: "Analyze this content focusing on key arguments, logical structure, strengths and weaknesses:\n\n**CONTENT**"
   - isActive: true
   - isDefault: true

2. **Explain**

   - name: "Explain"
   - systemPrompt: "You are an expert educator who excels at making complex topics simple."
   - userPrompt: "Explain this content in clear, simple terms with analogies when helpful:\n\n**CONTENT**"
   - isActive: true
   - isDefault: true

3. **Reply**
   - name: "Reply"
   - systemPrompt: "You are a thoughtful discussion partner who generates meaningful responses."
   - userPrompt: "Generate a thoughtful response to this content with follow-up questions and additional perspectives:\n\n**CONTENT**"
   - isActive: true
   - isDefault: true

## Implementation Steps

### 1. Database Layer

**File: `src/lib/db/indexedDBService.js`**

- [ ] Update DB_VERSION to 4
- [ ] Create `custom_prompts` object store
- [ ] Add CRUD operations:
  - `addCustomPrompt(promptData)`
  - `getAllCustomPrompts()`
  - `getActiveCustomPrompts()`
  - `updateCustomPrompt(prompt)`
  - `deleteCustomPrompt(id)`
  - `updatePromptActiveStatus(id, isActive)`
  - `initializeDefaultPrompts()`

### 2. Prompt Service

**New File: `src/lib/services/promptService.js`**

- [ ] Create service to manage custom prompts
- [ ] Initialize default prompts on first run
- [ ] Handle prompt ordering and validation
- [ ] Format prompts for AI consumption

### 3. Store Updates

**File: `src/stores/summaryStore.svelte.js`**

- [ ] Add `currentActionType` state
- [ ] Add `activeCustomPrompts` state
- [ ] Add functions:
  - `executeCustomAction(promptId, content)`
  - `loadActivePrompts()`
- [ ] Integrate with existing summarization logic

### 4. UI Components

#### ActionButtons Component

**New File: `src/components/buttons/ActionButtons.svelte`**

- [ ] Render dynamic buttons based on active prompts
- [ ] Handle button click events
- [ ] Style consistent with SummarizeButton
- [ ] Support loading states

#### Update SummarizeButton

**File: `src/components/buttons/SummarizeButton.svelte`**

- [ ] Add support for different action types
- [ ] Update loading text based on current action
- [ ] Maintain backward compatibility

### 5. Prompt Management UI

#### Update PromptMenu

**File: `src/entrypoints/prompt/PromptMenu.svelte`**

- [ ] Add "Custom Actions" section
- [ ] List all custom prompts with active/inactive status
- [ ] Add controls for:
  - Toggle active/inactive
  - Delete prompt (except defaults)
  - Reorder prompts

#### Update Prompt App

**File: `src/entrypoints/prompt/App.svelte`**

- [ ] Add "Add New Action" button
- [ ] Add prompt creation/editing form
- [ ] Add active toggle switches
- [ ] Add delete confirmation dialogs
- [ ] Add drag-and-drop reordering

### 6. Sidepanel Integration

**File: `src/entrypoints/sidepanel/App.svelte`**

- [ ] Import ActionButtons component
- [ ] Add ActionButtons below SummarizeButton
- [ ] Update layout to accommodate new buttons
- [ ] Handle action button events

### 7. Localization

**Files: `src/lib/locales/*.json`**

- [ ] Add new translation keys:
  - `custom_actions.title`
  - `custom_actions.add_new`
  - `custom_actions.active`
  - `custom_actions.inactive`
  - `custom_actions.delete_confirm`
  - `actions.analyze`
  - `actions.explain`
  - `actions.reply`

## Technical Architecture

### Component Hierarchy

```
Sidepanel App.svelte
├── SummarizeButton.svelte
└── ActionButtons.svelte
    └── Individual Action Buttons (dynamic)

Prompt App.svelte
├── PromptMenu.svelte (updated)
│   ├── Existing Prompts
│   └── Custom Actions Section
└── Custom Prompt Editor (new)
```

### Data Flow

```
1. User manages prompts in Prompt Entrypoint
   ↓
2. Prompts saved to IndexedDB custom_prompts table
   ↓
3. Sidepanel loads active prompts on init
   ↓
4. ActionButtons renders dynamic buttons
   ↓
5. User clicks action button
   ↓
6. summaryStore executes custom action
   ↓
7. Results displayed in existing summary display
```

### State Management

```javascript
// summaryStore additions
{
  currentActionType: 'summarize' | 'custom',
  currentCustomPromptId: string | null,
  activeCustomPrompts: CustomPrompt[],
  isCustomActionLoading: boolean
}
```

## Files to Modify

### New Files

- `src/lib/services/promptService.js`
- `src/components/buttons/ActionButtons.svelte`
- `CUSTOM_ACTIONS_PLAN.md` (this file)

### Modified Files

- `src/lib/db/indexedDBService.js`
- `src/stores/summaryStore.svelte.js`
- `src/components/buttons/SummarizeButton.svelte`
- `src/entrypoints/sidepanel/App.svelte`
- `src/entrypoints/prompt/App.svelte`
- `src/entrypoints/prompt/PromptMenu.svelte`
- `src/lib/locales/en.json`
- `src/lib/locales/vi.json`
- (other locale files)

## Implementation Order

1. **Database Layer** - Update IndexedDB schema and operations
2. **Prompt Service** - Create service and initialize defaults
3. **Store Updates** - Add custom action support to summaryStore
4. **ActionButtons Component** - Create dynamic button component
5. **Prompt Management UI** - Update prompt entrypoint
6. **Sidepanel Integration** - Add ActionButtons to sidepanel
7. **Localization** - Add translation strings
8. **Testing & Polish** - Test all functionality and UX

## UX Considerations

### Sidepanel Layout

```
┌─────────────────────────┐
│    [Summarize Button]   │
├─────────────────────────┤
│ [Analyze] [Explain]     │
│ [Reply] [Custom1]...    │
└─────────────────────────┘
```

### Prompt Management

- Custom Actions section in left menu
- Toggle switches for active/inactive
- Delete button (disabled for defaults)
- Drag handles for reordering
- "Add New Action" prominent button

### Loading States

- When any action is executing, show loading on SummarizeButton
- Update button text to reflect current action
- Disable all action buttons during execution

## Error Handling

- Graceful fallback if custom prompts fail to load
- Validation for prompt creation (required fields)
- Confirmation dialogs for destructive actions
- Toast notifications for success/error states

## Performance Considerations

- Load active prompts only once on sidepanel init
- Lazy load prompt management UI
- Debounce prompt saving operations
- Optimize database queries with indexes

## Future Enhancements

- Import/export prompt configurations
- Prompt templates marketplace
- Keyboard shortcuts for actions
- Prompt preview functionality
- Usage analytics for prompts
