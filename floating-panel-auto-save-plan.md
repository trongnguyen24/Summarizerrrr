# Kế hoạch Implementation: Auto-Save cho FloatingPanel

## Tổng quan

Thêm tính năng tự động lưu bài tóm tắt vào database cho FloatingPanel với approach hybrid:

- **Auto-save vào History** - Tự động sau khi tóm tắt xong
- **Manual save vào Archive** - User tự quyết định thông qua button

## Phân tích hiện tại

### Cơ chế lưu trữ hiện có

- **IndexedDB**: 2 stores (`summaries` cho Archive, `history` cho History)
- **Global summaryStore**: Có `logAllGeneratedSummariesToHistory()` và `saveAllGeneratedSummariesToArchive()`
- **FloatingPanel**: Sử dụng `useSummarization()` với `localSummaryState` độc lập

### Vấn đề

- `useSummarization()` hoạt động độc lập với global `summaryState`
- `SaveToArchiveButton` hiện tại không thể access `localSummaryState`
- FloatingPanel chưa có tự động lưu vào database

## Kế hoạch Implementation

### Phase 1: Core Storage Functions

#### 1.1 Tạo FloatingPanelStorageService

**File**: `src/entrypoints/content/services/FloatingPanelStorageService.js`

**Chức năng**:

- Convert `localSummaryState` sang format database
- Lấy page info (title, URL) từ current tab
- Utilities cho cả History và Archive

**Functions**:

```javascript
// Convert local state sang database format
function prepareDataForStorage(localState, pageInfo)

// Lưu vào History
async function saveToHistory(localState)

// Lưu vào Archive
async function saveToArchive(localState)

// Lấy page info từ current tab
async function getCurrentPageInfo()
```

#### 1.2 Utility Functions

**File**: `src/lib/utils/floatingPanelUtils.js`

**Chức năng**:

- Helper functions cho data processing
- Content type detection
- Data validation

### Phase 2: Modify useSummarization Composable

#### 2.1 Thêm Auto-save Logic

**File**: `src/entrypoints/content/composables/useSummarization.svelte.js`

**Changes**:

```javascript
// Thêm vào localSummaryState
{
  isLoading: false,
  summary: '',
  error: null,
  contentType: 'general',
  // Thêm tracking states
  isSavedToHistory: false,
  isSavedToArchive: false,
  saveError: null,
}

// Thêm function
async function autoSaveToHistory() {
  try {
    await FloatingPanelStorageService.saveToHistory(localSummaryState)
    localSummaryState.isSavedToHistory = true
  } catch (error) {
    localSummaryState.saveError = error
  }
}

// Modify summarizePageContent()
// Thêm auto-save call sau khi tóm tắt xong
```

#### 2.2 Export thêm functions

```javascript
return {
  // Existing exports...

  // New exports
  saveToArchive: () =>
    FloatingPanelStorageService.saveToArchive(localSummaryState),
  autoSaveToHistory,
}
```

### Phase 3: UI Components

#### 3.1 SaveToArchiveButtonFP

**File**: `src/components/buttons/SaveToArchiveButtonFP.svelte`

**Props**:

```javascript
let {
  localSummaryState,
  onSave = null, // callback sau khi save
} = $props()
```

**Features**:

- Sử dụng data từ `localSummaryState` thay vì global state
- Visual state cho saved/unsaved
- Error handling
- Toast feedback

#### 3.2 FloatingPanelFooter

**File**: `src/components/displays/floating-panel/FloatingPanelFooter.svelte`

**Props**:

```javascript
let { localSummaryState, summaryContent, summaryTitle, targetId } = $props()
```

**Components**:

- SaveToArchiveButtonFP
- CopyButton (existing, with targetId)
- DownloadButton (existing, with content)
- Layout tương tự FoooterDisplay

#### 3.3 CopyButtonFP & DownloadButtonFP

**Files**:

- `src/components/buttons/CopyButtonFP.svelte`
- `src/components/buttons/DownloadButtonFP.svelte`

**Reason**: Cần version riêng để work với `localSummaryState` data

### Phase 4: Integration với Display Components

#### 4.1 GenericSummaryDisplayFP

**File**: `src/components/displays/floating-panel/GenericSummaryDisplayFP.svelte`

**Changes**:

```svelte
<script>
  import FloatingPanelFooter from './FloatingPanelFooter.svelte'
  import { useSummarization } from '../../../entrypoints/content/composables/useSummarization.svelte.js'

  // Receive composable instance từ parent
  let {
    summary,
    isLoading,
    loadingText = 'Generating summary...',
    targetId = 'fp-generic-summary',
    showTOC = false,
    noDataContent = null,
    summarizationComposable  // NEW: receive composable instance
  } = $props()
</script>

<SummaryWrapper {isLoading} data={summary} {loadingText}>
  <SummaryContent {summary} {isLoading} {targetId} {showTOC} />

  <!-- Thêm footer -->
  {#if !isLoading && summary && summarizationComposable}
    <FloatingPanelFooter
      localSummaryState={summarizationComposable.localSummaryState()}
      summaryContent={summary}
      summaryTitle={summarizationComposable.localSummaryState().pageTitle}
      {targetId}
    />
  {/if}

  <svelte:fragment slot="no-data">
    {#if noDataContent}
      {@render noDataContent()}
    {/if}
  </svelte:fragment>
</SummaryWrapper>
```

#### 4.2 YouTubeSummaryDisplayFP & CourseSummaryDisplayFP

**Files**:

- `src/components/displays/floating-panel/YouTubeSummaryDisplayFP.svelte`
- `src/components/displays/floating-panel/CourseSummaryDisplayFP.svelte`

**Changes**: Tương tự GenericSummaryDisplayFP, thêm FloatingPanelFooter

#### 4.3 FloatingPanelContent

**File**: `src/components/displays/floating-panel/FloatingPanelContent.svelte`

**Changes**:

```svelte
<script>
  // Import composable để pass down
  import { useSummarization } from '../../../entrypoints/content/composables/useSummarization.svelte.js'

  let {
    // Existing props...
    summarizationComposable  // NEW: receive từ FloatingPanel
  } = $props()
</script>

<!-- Pass composable down to display components -->
<DisplayComponent
  {summary}
  isLoading={status === 'loading'}
  loadingText="Processing summary..."
  targetId="fp-generic-summary"
  {summarizationComposable}  <!-- NEW -->
/>
```

#### 4.4 FloatingPanel

**File**: `src/entrypoints/content/components/FloatingPanel.svelte`

**Changes**:

```svelte
<script>
  // Pass composable instance to content
  const summarization = useSummarization()
</script>

<FloatingPanelContent
  status={statusToDisplay}
  summary={summaryToDisplay}
  error={summarization.localSummaryState().error}
  contentType={summarization.localSummaryState().contentType}
  chapterSummary={summarization.localSummaryState().chapterSummary}
  isChapterLoading={summarization.localSummaryState().isChapterLoading}
  courseConcepts={summarization.localSummaryState().courseConcepts}
  isCourseSummaryLoading={summarization.localSummaryState().isLoading}
  isCourseConceptsLoading={summarization.localSummaryState().isCourseConceptsLoading}
  activeYouTubeTab={panelState.activeYouTubeTab()}
  activeCourseTab={panelState.activeCourseTab()}
  onSelectYouTubeTab={panelState.setActiveYouTubeTab}
  onSelectCourseTab={panelState.setActiveCourseTab}
  {summarization}  <!-- NEW: pass composable instance -->
/>
```

### Phase 5: Data Consistency & Edge Cases

#### 5.1 Duplicate Prevention

- Check existing entries trước khi save
- Use content hash để detect duplicates
- Update existing entry thay vì create new

#### 5.2 Basic Error Handling

- Simple validation & sanitization
- Basic error states via icon changes (existing pattern)

#### 5.3 Performance

- Debounce auto-save calls
- Memory cleanup khi component unmount

## File Structure Summary

```
src/
├── entrypoints/content/
│   ├── services/
│   │   └── FloatingPanelStorageService.js          # NEW
│   └── composables/
│       └── useSummarization.svelte.js              # MODIFIED
├── components/
│   ├── buttons/
│   │   ├── SaveToArchiveButtonFP.svelte           # NEW
│   │   ├── CopyButtonFP.svelte                     # NEW
│   │   └── DownloadButtonFP.svelte                 # NEW
│   ├── displays/floating-panel/
│   │   ├── FloatingPanelFooter.svelte             # NEW
│   │   ├── FloatingPanelContent.svelte            # MODIFIED
│   │   ├── GenericSummaryDisplayFP.svelte         # MODIFIED
│   │   ├── YouTubeSummaryDisplayFP.svelte         # MODIFIED
│   │   └── CourseSummaryDisplayFP.svelte          # MODIFIED
├── lib/utils/
│   └── floatingPanelUtils.js                      # NEW
└── entrypoints/content/components/
    └── FloatingPanel.svelte                        # MODIFIED
```

## Timeline Estimate

- **Phase 1-2**: 2-3 hours (Core functions)
- **Phase 3**: 2-3 hours (UI Components)
- **Phase 4**: 1-2 hours (Integration)
- **Phase 5**: 1 hour (Basic edge cases)

**Total**: 6-9 hours

## Testing Strategy

### Manual Testing

1. **Generic content**: Webpage summarization
2. **YouTube**: Video + chapter summaries
3. **Course**: Udemy/Coursera content
4. **Edge cases**: Network errors, empty content

### Validation Points

- ✅ Auto-save vào History works
- ✅ Manual save vào Archive works
- ✅ No duplicate entries
- ✅ Basic icon state feedback works
- ✅ Performance acceptable

## Success Criteria

1. **Functional**: Auto-save vào History sau tóm tắt, manual save vào Archive
2. **UX**: Clear icon state feedback, smooth interactions
3. **Reliable**: No data loss, basic error handling
4. **Performance**: No noticeable impact on summarization speed
5. **Maintainable**: Clean code structure, reusable components
