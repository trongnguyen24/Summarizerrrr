# Model Fallback Status Display - Implementation Guide

## Overview

This document describes the implementation of the model fallback status display feature, which makes the auto-fallback mechanism transparent to users by showing which AI model is being used and when fallback occurs.

## Problem Statement

The auto-fallback feature (in `geminiAutoFallback.js`) automatically switches to lighter Gemini models when the current model is overloaded. However, this process was invisible to users, creating a "blackbox" experience.

## Solution Architecture

### 1. State Management Layer (`src/stores/summaryStore.svelte.js`)

**Added state:**

```javascript
modelStatus: {
  currentModel: null,      // Current model being used
  fallbackFrom: null,      // Original model that failed (if fallback occurred)
  isFallback: false,       // Whether we're currently in fallback mode
}
```

**Added function:**

```javascript
export function updateModelStatus(
  currentModel = null,
  fallbackFrom = null,
  isFallback = false
) {
  summaryState.modelStatus = {
    currentModel,
    fallbackFrom,
    isFallback,
  }
}
```

**Updated functions:**

- `resetState()` - Reset modelStatus to initial state
- `resetDisplayState()` - Reset modelStatus to initial state

### 2. API Adapter Layer (`src/lib/api/aiSdkAdapter.js`)

**Import added:**

```javascript
import { updateModelStatus } from '@/stores/summaryStore.svelte.js'
```

**Changes in `generateContent()` function:**

1. Track original model:

```javascript
let originalModel = currentModel // Track original model for fallback display
```

2. Update UI before each API call:

```javascript
// Update UI with current model status
if (autoFallbackEnabled) {
  const isFallback = currentModel !== originalModel
  updateModelStatus(currentModel, isFallback ? originalModel : null, isFallback)
}
```

**Changes in `generateContentStream()` function:**

- Same pattern as `generateContent()`
- Tracks `originalModel` and calls `updateModelStatus()` before streaming

### 3. UI Component Layer

#### Created: `src/components/displays/ui/ModelStatusDisplay.svelte`

**Component responsibilities:**

- Display current model being used
- Show fallback information when model switch occurs
- Color-coded status (blue: normal, amber: fallback)

**Props:**

```javascript
let { modelStatus } = $props()
```

**Display modes:**

1. **Normal Mode** (blue):

   - Icon: CPU icon
   - Text: "Using model"
   - Subtext: Current model name

2. **Fallback Mode** (amber):
   - Icon: Chart icon
   - Text: "Model switched"
   - Subtext: "originalModel → currentModel"

**Styling:**

- Compact design using font-mono text-xs
- Consistent with existing error display pattern
- Uses decorative corner elements for visual consistency

### 4. Integration Layer (`src/components/displays/core/SummaryWrapper.svelte`)

**Import added:**

```javascript
import ModelStatusDisplay from '@/components/displays/ui/ModelStatusDisplay.svelte'
import { summaryState } from '@/stores/summaryStore.svelte.js'
```

**Display logic:**

1. **During loading:**

```svelte
{#if isLoading && !data}
  <div class="flex flex-col gap-3 items-center">
    <div class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse">
      {loadingText || 'Loading...'}
    </div>
    <ModelStatusDisplay modelStatus={summaryState.modelStatus} />
  </div>
```

2. **After completion (only if fallback occurred):**

```svelte
{:else if data}
  <div class="flex flex-col gap-3">
    {#if summaryState.modelStatus?.isFallback}
      <ModelStatusDisplay modelStatus={summaryState.modelStatus} />
    {/if}
    {@render children()}
  </div>
```

## Data Flow

### Normal API Call (No Fallback)

```
1. User triggers summarization
2. aiSdkAdapter starts with gemini-2.5-flash
3. updateModelStatus(currentModel: 'gemini-2.5-flash', fallbackFrom: null, isFallback: false)
4. ModelStatusDisplay shows: "Using model: gemini-2.5-flash" (blue)
5. API call succeeds
6. Status hidden after completion (not a fallback)
```

### Fallback Scenario

```
1. User triggers summarization
2. aiSdkAdapter starts with gemini-2.5-flash
3. updateModelStatus(currentModel: 'gemini-2.5-flash', fallbackFrom: null, isFallback: false)
4. ModelStatusDisplay shows: "Using model: gemini-2.5-flash" (blue)
5. API call fails with overload error
6. Auto-fallback to gemini-2.0-flash
7. updateModelStatus(currentModel: 'gemini-2.0-flash', fallbackFrom: 'gemini-2.5-flash', isFallback: true)
8. ModelStatusDisplay updates: "Model switched: gemini-2.5-flash → gemini-2.0-flash" (amber)
9. API call succeeds
10. Status remains visible after completion (fallback occurred)
```

## Files Modified/Created

### Created:

- `src/components/displays/ui/ModelStatusDisplay.svelte`

### Modified:

- `src/stores/summaryStore.svelte.js`

  - Added modelStatus state
  - Added updateModelStatus() function
  - Updated reset functions

- `src/lib/api/aiSdkAdapter.js`

  - Import updateModelStatus
  - Track originalModel in both generate functions
  - Call updateModelStatus before each API attempt

- `src/components/displays/core/SummaryWrapper.svelte`
  - Import ModelStatusDisplay and summaryState
  - Display status during loading
  - Display status after completion if fallback occurred

## Key Design Decisions

1. **Show during loading, hide after success (unless fallback)**

   - Rationale: Users need to see status while waiting, but normal operations shouldn't clutter the UI

2. **Persist fallback status after completion**

   - Rationale: Users should know that fallback occurred and which model was used

3. **Color coding (blue vs amber)**

   - Blue: Normal operation, informational
   - Amber: Fallback occurred, attention-worthy but not an error

4. **Placement below loading text**

   - Rationale: Natural reading flow, doesn't interrupt main content

5. **Only for auto-fallback enabled scenarios**
   - Rationale: Feature only applies to Gemini Basic mode where auto-fallback is active

## Future Enhancements (Not Implemented)

1. **Animation**

   - Smooth transition when status changes
   - Fade in/out effects

2. **Detailed Error Info**

   - Show why fallback was triggered
   - Link to status page or documentation

3. **Other Provider Fallback**
   - Extend to other providers if they implement fallback
   - Generic fallback status system

## Dependencies

- `@iconify/svelte` - Icons for status display
- Svelte 5 reactivity system - `$state` and `$derived`
- Existing error display patterns - Visual consistency

## Related Files (Reference)

- `src/lib/utils/geminiAutoFallback.js` - Core fallback logic
- `src/components/displays/ui/ErrorDisplay.svelte` - Similar UI pattern
- `src/lib/api/api.js` - API wrapper that calls aiSdkAdapter

## Notes

- This feature is core-only (no i18n) - i18n will be added in a future update
- Works only with Gemini Basic mode (auto-fallback enabled)
- Status updates happen synchronously with API calls
- State is reactive and updates trigger UI re-renders automatically
