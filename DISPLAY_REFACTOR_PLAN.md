# Display Components Refactor Plan

## 📋 Tổng quan

Kế hoạch refactor cho các components trong `src/components/displays` nhằm giảm code duplication, cải thiện maintainability và tạo cấu trúc component hierarchy rõ ràng hơn.

## 🔍 Phân tích hiện tại

### Components hiện tại (loại trừ mobile/ và floating-panel/):

- `CourseSummaryDisplay.svelte` (66 lines)
- `DisplaySettingsControls.svelte` (121 lines)
- `ErrorDisplay.svelte` (68 lines)
- `FoooterDisplay.svelte` (34 lines)
- `GenericSummaryDisplay.svelte` (23 lines)
- `StreamingMarkdownV2.svelte` (183 lines)
- `SummaryContent.svelte` (36 lines)
- `SummaryDisplay.svelte` (196 lines) ⚠️
- `SummaryWrapper.svelte` (39 lines)
- `TabbedSummaryDisplay.svelte` (14 lines)
- `YouTubeSummaryDisplay.svelte` (56 lines)

### 🚨 Vấn đề chính:

#### 1. Code Duplication Nghiêm Trọng

```javascript
// Duplicate trong DisplaySettingsControls.svelte và SummaryDisplay.svelte
const fontSizeClasses = [
  'prose-base prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
  'prose-lg prose-h1:text-[1.675rem] prose-h2:text-2xl prose-h3:text-xl',
  'prose-xl prose-h1:text-3xl prose-h2:text-[1.675rem] prose-h3:[1.425rem]',
  'prose-2xl prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
]

const widthClasses = ['max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl']

const fontMap = {
  default: 'font-default',
  'noto-serif': 'font-noto-serif',
  opendyslexic: 'font-opendyslexic',
  mali: 'font-mali',
}
```

#### 2. Pattern Lặp Lại

**CourseSummaryDisplay.svelte và YouTubeSummaryDisplay.svelte:**

```svelte
<!-- Gần như identical structure -->
<TabbedSummaryDisplay
  tabs={courseTabs/youtubeTabs}
  activeTab={activeCourseTab/activeYouTubeTab}
  onSelectTab={updateActiveCourseTab/updateActiveYouTubeTab}
>
  <div hidden={activeTab !== 'summary'}>
    <GenericSummaryDisplay {...props} />
    {#if activeTab === 'summary' && !isLoading}
      <TOC targetDivId="..." />
    {/if}
  </div>
  <!-- Similar pattern for other tabs -->
</TabbedSummaryDisplay>
```

#### 3. SummaryDisplay.svelte Quá Phức Tạp

- 196 lines with multiple responsibilities
- Settings logic + Rendering logic + State management
- Hard to maintain và test

## 🎯 Kế hoạch Refactor

### Phase 1: Shared Utilities & Constants

#### 1.1 Tạo Display Constants

**File: `src/lib/constants/displayConstants.js`**

```javascript
// @ts-nocheck

export const FONT_SIZE_CLASSES = [
  'prose-base prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
  'prose-lg prose-h1:text-[1.675rem] prose-h2:text-2xl prose-h3:text-xl',
  'prose-xl prose-h1:text-3xl prose-h2:text-[1.675rem] prose-h3:[1.425rem]',
  'prose-2xl prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
]

export const WIDTH_CLASSES = [
  'max-w-3xl',
  'max-w-4xl',
  'max-w-5xl',
  'max-w-6xl',
]

export const WIDTH_BUTTON_TEXTS = ['.', '..', '...', '....']

export const FONT_MAP = {
  default: 'font-default',
  'noto-serif': 'font-noto-serif',
  opendyslexic: 'font-opendyslexic',
  mali: 'font-mali',
}

export const FONT_KEYS = Object.keys(FONT_MAP)
```

#### 1.2 Tạo Display Settings Composable

**File: `src/composables/useDisplaySettings.svelte.js`**

```javascript
// @ts-nocheck
import { fontSizeIndex, widthIndex } from '@/stores/displaySettingsStore.svelte'
import { themeSettings, setTheme } from '@/stores/themeStore.svelte.js'
import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
import {
  FONT_SIZE_CLASSES,
  WIDTH_CLASSES,
  FONT_KEYS,
} from '@/lib/constants/displayConstants.js'

export function useDisplaySettings() {
  function increaseFontSize() {
    if ($fontSizeIndex < FONT_SIZE_CLASSES.length - 1) {
      $fontSizeIndex++
    }
  }

  function decreaseFontSize() {
    if ($fontSizeIndex > 0) {
      $fontSizeIndex--
    }
  }

  function toggleWidth() {
    $widthIndex = ($widthIndex + 1) % WIDTH_CLASSES.length
  }

  function toggleFontFamily() {
    const currentIndex = FONT_KEYS.indexOf(settings.selectedFont)
    const nextIndex = (currentIndex + 1) % FONT_KEYS.length
    updateSettings({ selectedFont: FONT_KEYS[nextIndex] })
  }

  function toggleTheme() {
    const themes = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(themeSettings.theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return {
    increaseFontSize,
    decreaseFontSize,
    toggleWidth,
    toggleFontFamily,
    toggleTheme,
    fontSizeIndex,
    widthIndex,
    themeSettings,
    settings,
  }
}
```

### Phase 2: Base Components

#### 2.1 Tạo Base Tabbed Summary Display

**File: `src/components/displays/BaseTabbedSummaryDisplay.svelte`**

```svelte
<script>
  // @ts-nocheck
  import TabbedSummaryDisplay from './TabbedSummaryDisplay.svelte'
  import GenericSummaryDisplay from './GenericSummaryDisplay.svelte'
  import TOC from '@/components/navigation/TOC.svelte'

  let {
    tabs,
    activeTab,
    onSelectTab,
    summaryData,
    noDataContent = null
  } = $props()
</script>

<TabbedSummaryDisplay {tabs} {activeTab} {onSelectTab}>
  {#each tabs as tab}
    <div hidden={activeTab !== tab.id}>
      <GenericSummaryDisplay
        summary={summaryData[tab.id]?.summary}
        isLoading={summaryData[tab.id]?.isLoading}
        loadingText={summaryData[tab.id]?.loadingText}
        targetId={summaryData[tab.id]?.targetId}
        {noDataContent}
      />
      {#if activeTab === tab.id && !summaryData[tab.id]?.isLoading && summaryData[tab.id]?.summary}
        <TOC targetDivId={summaryData[tab.id]?.targetId} />
      {/if}
    </div>
  {/each}
</TabbedSummaryDisplay>
```

### Phase 3: Refactor Existing Components

#### 3.1 Refactor CourseSummaryDisplay.svelte

```svelte
<script>
  // @ts-nocheck
  import BaseTabbedSummaryDisplay from './BaseTabbedSummaryDisplay.svelte'
  import { summaryState, updateActiveCourseTab } from '../../stores/summaryStore.svelte.js'

  let { activeCourseTab } = $props()

  const courseTabs = $derived([
    { id: 'courseSummary', label: 'Summary', show: true, isLoading: summaryState.isCourseSummaryLoading },
    { id: 'courseConcepts', label: 'Concepts', show: true, isLoading: summaryState.isCourseConceptsLoading },
  ])

  const summaryData = $derived({
    courseSummary: {
      summary: summaryState.courseSummary,
      isLoading: summaryState.isCourseSummaryLoading,
      loadingText: "Processing main Course summary...",
      targetId: "course-video-summary-display"
    },
    courseConcepts: {
      summary: summaryState.courseConcepts,
      isLoading: summaryState.isCourseConceptsLoading,
      loadingText: "Processing Course Concepts...",
      targetId: "course-concepts-display"
    }
  })

  const noDataContent = () => `
    <div class="text-text-secondary text-center p-4">
      <p>No Course concepts available yet.</p>
      <p>Click the "Summarize" button to generate concepts for this Course lecture.</p>
    </div>
  `
</script>

<BaseTabbedSummaryDisplay
  tabs={courseTabs}
  activeTab={activeCourseTab}
  onSelectTab={updateActiveCourseTab}
  {summaryData}
  {noDataContent}
/>
```

#### 3.2 Refactor YouTubeSummaryDisplay.svelte

```svelte
<script>
  // @ts-nocheck
  import BaseTabbedSummaryDisplay from './BaseTabbedSummaryDisplay.svelte'
  import { summaryState, updateActiveYouTubeTab } from '../../stores/summaryStore.svelte.js'

  let { activeYouTubeTab } = $props()

  const youtubeTabs = $derived([
    { id: 'videoSummary', label: 'Summary', show: true, isLoading: summaryState.isLoading },
    { id: 'chapterSummary', label: 'Chapters', show: true, isLoading: summaryState.isChapterLoading },
  ])

  const summaryData = $derived({
    videoSummary: {
      summary: summaryState.summary,
      isLoading: summaryState.isLoading,
      loadingText: "Processing main YouTube summary...",
      targetId: "youtube-video-summary-display"
    },
    chapterSummary: {
      summary: summaryState.chapterSummary,
      isLoading: summaryState.isChapterLoading,
      loadingText: "Generating chapter summary...",
      targetId: "youtube-chapter-summary-display"
    }
  })
</script>

<BaseTabbedSummaryDisplay
  tabs={youtubeTabs}
  activeTab={activeYouTubeTab}
  onSelectTab={updateActiveYouTubeTab}
  {summaryData}
/>
```

#### 3.3 Refactor DisplaySettingsControls.svelte

```svelte
<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { useDisplaySettings } from '@/composables/useDisplaySettings.svelte.js'
  import { WIDTH_BUTTON_TEXTS } from '@/lib/constants/displayConstants.js'

  const {
    increaseFontSize,
    decreaseFontSize,
    toggleWidth,
    toggleFontFamily,
    toggleTheme,
    fontSizeIndex,
    widthIndex,
    themeSettings
  } = useDisplaySettings()
</script>

<!-- UI remains the same, but uses composable functions -->
<div class="absolute text-base flex gap-2 top-2 right-2">
  <!-- Theme button -->
  <button class="size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
          onclick={toggleTheme} title={$t('archive.change_theme')}>
    {#if themeSettings.theme === 'light'}
      <Icon icon="heroicons:sun-16-solid" width="20" height="20" />
    {:else if themeSettings.theme === 'dark'}
      <Icon icon="heroicons:moon-20-solid" width="20" height="20" />
    {:else}
      <Icon icon="heroicons:computer-desktop-20-solid" width="20" height="20" />
    {/if}
  </button>

  <!-- Font size controls -->
  <button class="size-8 font-mono flex justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
          onclick={decreaseFontSize} title={$t('archive.font_dec')}>
    A-
  </button>
  <button class="size-8 flex font-mono justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
          onclick={increaseFontSize} title={$t('archive.font_inc')}>
    A+
  </button>

  <!-- Font family toggle -->
  <button class="size-8 flex justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
          onclick={toggleFontFamily} title={$t('archive.change_font')}>
    aA
  </button>

  <!-- Width toggle -->
  <button class="size-8 pt-1.5 relative flex text-xl justify-center items-center hover:bg-blackwhite/5 rounded-2xl"
          onclick={toggleWidth} title={$t('archive.toggle_width')}>
    <span class="font-default absolute text-sm -translate-y-3">
      {WIDTH_BUTTON_TEXTS[$widthIndex]}
    </span>
    <!-- SVG icon -->
  </button>
</div>
```

### Phase 4: Tách SummaryDisplay.svelte

#### 4.1 ArchiveSummaryHeader.svelte

```svelte
<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let { selectedSummary, formatDate } = $props()
</script>

<div class="flex flex-col gap-2">
  <div class="font-mono text-text-muted text-xs flex gap-8 justify-center items-center">
    <div class="flex justify-center items-center gap-1">
      <Icon height="16" width="16" icon="lucide:clock" />
      {formatDate(selectedSummary.date)}
    </div>
    <div class="flex justify-center items-center gap-1">
      <Icon height="16" width="16" icon="lucide:link" />
      <a href={selectedSummary.url} target="_blank" rel="noopener noreferrer">
        {selectedSummary.url
          ? selectedSummary.url.replace(/(^\w+:|^)\/\//, '').split('/')[0]
          : 'Unknown URL'}
      </a>
    </div>
  </div>
  <h1 class="mx-auto font-noto-serif my-0 p-0 text-blackwhite text-balance text-center font-serif leading-[1.2]">
    {selectedSummary.title}
  </h1>
</div>
```

#### 4.2 ArchiveSummaryContent.svelte

```svelte
<script>
  // @ts-nocheck
  import { marked } from 'marked'
  import hljs from 'highlight.js'
  import TabNavigation from '@/components/navigation/TabNavigation.svelte'

  let { selectedSummary, activeTabId, tabs, onSelectTab } = $props()

  // Effect để highlight code khi content thay đổi
  $effect(() => {
    if (selectedSummary && activeTabId) {
      document.querySelectorAll('.summary-content pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  })

  const currentSummary = $derived(
    selectedSummary.summaries.find((_, index) => `summary-tab-${index}` === activeTabId)
  )
</script>

<div class="flex justify-center">
  {#if tabs.length > 1}
    <TabNavigation {tabs} activeTab={activeTabId} {onSelectTab} />
  {/if}
</div>

<div id="summary-content" class="text-text-secondary">
  {#if currentSummary}
    <div id="copy-cat">{@html marked.parse(currentSummary.content)}</div>
  {/if}
</div>
```

#### 4.3 ArchiveSummaryFooter.svelte

```svelte
<script>
  // @ts-nocheck
  import SaveToArchiveFromHistoryButton from '@/components/buttons/SaveToArchiveFromHistoryButton.svelte'
  import CopyButton from '@/components/buttons/CopyButton.svelte'
  import DownloadButton from '@/components/buttons/DownloadButton.svelte'

  let { selectedSummary, currentSummary, activeTab } = $props()
</script>

<div id="footer" class="w-fit mx-auto relative mt-12 flex justify-center items-center gap-2">
  <div class="absolute left-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none">
      <path d="M4 0h1v9H4z" fill="currentColor" />
      <path d="M9 4v1H0V4z" fill="currentColor" />
    </svg>
  </div>
  <span class="h-px w-20 bg-border/70"></span>

  {#if currentSummary && activeTab !== 'archive'}
    <SaveToArchiveFromHistoryButton {selectedSummary} />
  {/if}

  {#if currentSummary}
    <CopyButton />
    <DownloadButton content={currentSummary.content} title={selectedSummary.title} />
  {/if}

  <span class="h-px w-20 bg-border/70"></span>
  <div class="absolute right-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none">
      <path d="M4 0h1v9H4z" fill="currentColor" />
      <path d="M9 4v1H0V4z" fill="currentColor" />
    </svg>
  </div>
</div>
```

#### 4.4 Refactored SummaryDisplay.svelte

```svelte
<script>
  // @ts-nocheck
  import TOC from '@/components/navigation/TOC.svelte'
  import DisplaySettingsControls from '@/components/displays/DisplaySettingsControls.svelte'
  import ArchiveSummaryHeader from './ArchiveSummaryHeader.svelte'
  import ArchiveSummaryContent from './ArchiveSummaryContent.svelte'
  import ArchiveSummaryFooter from './ArchiveSummaryFooter.svelte'
  import { useDisplaySettings } from '@/composables/useDisplaySettings.svelte.js'
  import { FONT_SIZE_CLASSES, WIDTH_CLASSES, FONT_MAP } from '@/lib/constants/displayConstants.js'

  const { selectedSummary, formatDate, activeTab } = $props()
  const { fontSizeIndex, widthIndex, settings } = useDisplaySettings()

  let activeTabId = $state(null)
  let tabs = $state([])

  // Tab management logic
  $effect(() => {
    if (selectedSummary) {
      const newTabs = selectedSummary.summaries.map((subSummary, index) => ({
        id: `summary-tab-${index}`,
        label: subSummary.title,
      }))

      if (JSON.stringify(tabs) !== JSON.stringify(newTabs)) {
        tabs = newTabs
      }
    } else {
      tabs = []
    }
  })

  $effect(() => {
    if (selectedSummary && tabs.length > 0) {
      if (!activeTabId || !tabs.some((tab) => tab.id === activeTabId)) {
        activeTabId = tabs[0].id
      }
    } else {
      activeTabId = null
    }
  })

  function onSelectTab(tabId) {
    activeTabId = tabId
  }

  const currentSummary = $derived(
    selectedSummary?.summaries.find((_, index) => `summary-tab-${index}` === activeTabId)
  )
</script>

{#if selectedSummary}
  <div class="prose px-8 md:px-12 xl:px-20 w-full {WIDTH_CLASSES[$widthIndex]} mx-auto {FONT_SIZE_CLASSES[$fontSizeIndex]} {FONT_MAP[settings.selectedFont]} pt-12 pb-[35vh] summary-content">
    <DisplaySettingsControls />

    <ArchiveSummaryHeader {selectedSummary} {formatDate} />

    <ArchiveSummaryContent
      {selectedSummary}
      {activeTabId}
      {tabs}
      {onSelectTab}
    />

    <ArchiveSummaryFooter
      {selectedSummary}
      {currentSummary}
      {activeTab}
    />
  </div>

  <TOC targetDivId="summary-content" />
{:else}
  <p class="text-center text-text-secondary">No summary selected.</p>
{/if}
```

## 📊 Kết quả sau Refactor

### Metrics Cải thiện:

| Component               | Before (lines) | After (lines) | Improvement |
| ----------------------- | -------------- | ------------- | ----------- |
| CourseSummaryDisplay    | 66             | ~35           | -47%        |
| YouTubeSummaryDisplay   | 56             | ~30           | -46%        |
| SummaryDisplay          | 196            | ~60           | -69%        |
| DisplaySettingsControls | 121            | ~80           | -34%        |
| **Total**               | **800+**       | **~600**      | **-25%**    |

### Benefits:

1. **✅ Giảm Code Duplication**: Từ ~40% xuống <10%
2. **✅ Better Separation of Concerns**: Mỗi component có 1 responsibility rõ ràng
3. **✅ Improved Maintainability**: Shared logic ở 1 nơi
4. **✅ Consistent Styling**: Shared constants
5. **✅ Easier Testing**: Components nhỏ hơn, focused hơn
6. **✅ Better Reusability**: Base components có thể reuse

### Component Hierarchy mới:

```
src/
├── lib/constants/displayConstants.js
├── composables/useDisplaySettings.svelte.js
└── components/displays/
    ├── BaseTabbedSummaryDisplay.svelte
    ├── CourseSummaryDisplay.svelte (refactored)
    ├── YouTubeSummaryDisplay.svelte (refactored)
    ├── SummaryDisplay.svelte (refactored)
    ├── DisplaySettingsControls.svelte (refactored)
    ├── ArchiveSummaryHeader.svelte (new)
    ├── ArchiveSummaryContent.svelte (new)
    ├── ArchiveSummaryFooter.svelte (new)
    └── [other existing components unchanged]
```

## 🚀 Implementation Steps

1. **Phase 1**: Tạo shared utilities (`displayConstants.js`, `useDisplaySettings.svelte.js`)
2. **Phase 2**: Tạo `BaseTabbedSummaryDisplay.svelte`
3. **Phase 3**: Refactor `CourseSummaryDisplay.svelte` và `YouTubeSummaryDisplay.svelte`
4. **Phase 4**: Tách `SummaryDisplay.svelte` thành 3 components nhỏ
5. **Phase 5**: Update `DisplaySettingsControls.svelte` để sử dụng composable
6. **Phase 6**: Test và verify tất cả components hoạt động đúng

## ⚠️ Migration Notes

- **Backward Compatibility**: Tất cả existing props và APIs giữ nguyên
- **Import Updates**: Cần update imports trong parent components
- **Testing**: Cần test kỹ các edge cases, especially tab switching logic
- **Performance**: Expect slight performance improvement do ít code duplication

## 🎯 Next Steps

1. Review plan này với team
2. Estimate effort (khoảng 2-3 ngày)
3. Implement từng phase một cách systematic
4. Test thoroughly trước khi merge

---

**Tổng kết**: Refactor plan này sẽ giúp codebase trở nên cleaner, more maintainable và easier to extend. Code duplication giảm đáng kể và component hierarchy rõ ràng hơn.
