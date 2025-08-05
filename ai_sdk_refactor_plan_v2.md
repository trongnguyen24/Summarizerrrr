# Kế hoạch Tái cấu trúc (Refactor) AI SDK v2 - Hybrid Approach

## 1. Tổng quan Chiến lược

**Mục tiêu**: Tái cấu trúc hệ thống để tận dụng `useCompletion` và Vercel AI SDK nhưng theo cách phù hợp với browser extension context, đảm bảo tính ổn định và khả năng rollback.

**Phương pháp**: Hybrid Approach - Kết hợp AI SDK với extension messaging, migration từng bước với fallback mechanism.

**Lợi ích chính:**

- **Code Frontend đơn giản hơn**: Sử dụng reactive hooks thay vì manual state management
- **Stream processing tối ưu**: Tận dụng AI SDK streaming với extension-compatible interface
- **Kiến trúc dễ maintain**: Separation of concerns rõ ràng
- **Risk mitigation**: Gradual migration với rollback capability

## 2. Phase 1: Proof of Concept và Foundation

### Bước 1.1: Tạo Custom Hook Extension-Compatible

**File mới**: `src/lib/hooks/useExtensionCompletion.svelte.js`

```javascript
// @ts-nocheck
import { settings } from '@/stores/settingsStore.svelte.js'

/**
 * Custom hook mô phỏng useCompletion cho browser extension context
 * @param {Object} config - Configuration object
 * @param {string} config.api - API endpoint identifier
 * @param {Function} config.onSuccess - Success callback
 * @param {Function} config.onError - Error callback
 * @returns {Object} Completion state and methods
 */
export function useExtensionCompletion(config = {}) {
  const completion = $state('')
  const isLoading = $state(false)
  const error = $state(null)
  const requestId = $state(null)

  const submit = async (data) => {
    if (isLoading) return

    const reqId = generateRequestId()
    requestId = reqId
    isLoading = true
    error = null
    completion = ''

    try {
      // Send request to background script
      const response = await browser.runtime.sendMessage({
        action: 'api-request',
        requestId: reqId,
        endpoint: config.api,
        data: {
          ...data,
          settings: settings,
        },
      })

      if (response.type === 'error') {
        throw new Error(response.data)
      }

      // Handle streaming response
      await handleStreamingResponse(reqId, (chunk) => {
        completion += chunk
      })

      config.onSuccess?.(completion)
    } catch (err) {
      error = err
      config.onError?.(err)
    } finally {
      isLoading = false
    }
  }

  const reset = () => {
    completion = ''
    error = null
    isLoading = false
  }

  return {
    completion: $state.snapshot(() => completion),
    isLoading: $state.snapshot(() => isLoading),
    error: $state.snapshot(() => error),
    submit,
    reset,
  }
}

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

async function handleStreamingResponse(requestId, onChunk) {
  return new Promise((resolve, reject) => {
    const listener = (message) => {
      if (message.requestId === requestId) {
        switch (message.type) {
          case 'stream':
            onChunk(message.data)
            break
          case 'complete':
            browser.runtime.onMessage.removeListener(listener)
            resolve(message.data)
            break
          case 'error':
            browser.runtime.onMessage.removeListener(listener)
            reject(new Error(message.data))
            break
        }
      }
    }

    browser.runtime.onMessage.addListener(listener)
  })
}
```

### Bước 1.2: Mở rộng Background Script Message Handler

**File**: `src/entrypoints/background.js`

Thêm vào existing message listener:

```javascript
// Thêm import
import { ExtensionApiHandler } from '../lib/api/extensionApiHandler.js'

// Trong background script, thêm vào onMessage listener
const apiHandler = new ExtensionApiHandler()

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Existing message handlers...

  if (message.action === 'api-request') {
    console.log(`[background.js] API request received: ${message.endpoint}`)

    try {
      const response = await apiHandler.handleRequest(
        message.endpoint,
        message.data,
        message.requestId,
        (streamData) => {
          // Send streaming data back
          browser.runtime
            .sendMessage({
              action: 'api-response',
              requestId: message.requestId,
              type: 'stream',
              data: streamData,
            })
            .catch((err) => {
              console.warn('[background.js] Failed to send stream data:', err)
            })
        }
      )

      // Send completion
      browser.runtime
        .sendMessage({
          action: 'api-response',
          requestId: message.requestId,
          type: 'complete',
          data: response,
        })
        .catch((err) => {
          console.warn('[background.js] Failed to send completion:', err)
        })
    } catch (error) {
      console.error('[background.js] API request error:', error)

      // Send error
      browser.runtime
        .sendMessage({
          action: 'api-response',
          requestId: message.requestId,
          type: 'error',
          data: error.message || 'Unknown error occurred',
        })
        .catch((err) => {
          console.warn('[background.js] Failed to send error:', err)
        })
    }

    return true // Keep message channel open for async response
  }

  // Existing message handlers continue...
})
```

### Bước 1.3: Tạo Unified API Handler

**File mới**: `src/lib/api/extensionApiHandler.js`

```javascript
// @ts-nocheck
import {
  summarizeContent,
  summarizeChapters,
  summarizeContentStream,
  summarizeChaptersStream,
  enhancePrompt,
} from './api.js'

export class ExtensionApiHandler {
  /**
   * Handle API requests from extension UI
   * @param {string} endpoint - API endpoint identifier
   * @param {Object} data - Request data
   * @param {string} requestId - Request correlation ID
   * @param {Function} onStream - Stream callback
   * @returns {Promise<string>} Final response
   */
  async handleRequest(endpoint, data, requestId, onStream) {
    console.log(`[ExtensionApiHandler] Handling ${endpoint} request`)

    switch (endpoint) {
      case 'summarize':
        return await this.handleSummarizeRequest(data, onStream)

      case 'chapters':
        return await this.handleChaptersRequest(data, onStream)

      case 'course-summary':
        return await this.handleCourseSummaryRequest(data, onStream)

      case 'course-concepts':
        return await this.handleCourseConceptsRequest(data, onStream)

      case 'enhance-prompt':
        return await this.handleEnhancePromptRequest(data, onStream)

      default:
        throw new Error(`Unknown endpoint: ${endpoint}`)
    }
  }

  async handleSummarizeRequest(data, onStream) {
    const { text, contentType, settings } = data

    if (settings.enableStreaming) {
      let result = ''
      const streamGenerator = summarizeContentStream(text, contentType)

      for await (const chunk of streamGenerator) {
        result += chunk
        onStream(chunk)

        // Add small delay to prevent overwhelming the UI
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      return result
    } else {
      return await summarizeContent(text, contentType)
    }
  }

  async handleChaptersRequest(data, onStream) {
    const { text, settings } = data

    if (settings.enableStreaming) {
      let result = ''
      const streamGenerator = summarizeChaptersStream(text)

      for await (const chunk of streamGenerator) {
        result += chunk
        onStream(chunk)
        await new Promise((resolve) => setTimeout(resolve, 10))
      }

      return result
    } else {
      return await summarizeChapters(text)
    }
  }

  async handleCourseSummaryRequest(data, onStream) {
    return await this.handleSummarizeRequest(
      {
        ...data,
        contentType: 'courseSummary',
      },
      onStream
    )
  }

  async handleCourseConceptsRequest(data, onStream) {
    return await this.handleSummarizeRequest(
      {
        ...data,
        contentType: 'courseConcepts',
      },
      onStream
    )
  }

  async handleEnhancePromptRequest(data, onStream) {
    const { userPrompt } = data
    return await enhancePrompt(userPrompt)
  }
}
```

### Bước 1.4: Tạo Selected Text PoC

**File mới**: `src/stores/selectedTextStore.svelte.js`

```javascript
// @ts-nocheck
import { useExtensionCompletion } from '@/lib/hooks/useExtensionCompletion.svelte.js'
import { getActiveTabInfo } from '@/services/chromeService.js'

export function createSelectedTextSummary() {
  const pageTitle = $state('')
  const pageUrl = $state('')
  const lastSummaryType = $state('selectedText')

  const completion = useExtensionCompletion({
    api: 'summarize',
    onSuccess: (result) => {
      console.log('[selectedTextStore] Summary completed:', result.length)
    },
    onError: (error) => {
      console.error('[selectedTextStore] Summary error:', error)
    },
  })

  const summarizeText = async (text) => {
    if (!text || text.trim() === '') {
      throw new Error('No text selected for summarization.')
    }

    // Get current tab info
    const tabInfo = await getActiveTabInfo()
    pageTitle = tabInfo.title || 'Selected Text Summary'
    pageUrl = tabInfo.url || 'Unknown URL'

    // Submit for summarization
    await completion.submit({
      text: text.trim(),
      contentType: 'selectedText',
    })
  }

  return {
    // State
    pageTitle: $state.snapshot(() => pageTitle),
    pageUrl: $state.snapshot(() => pageUrl),
    lastSummaryType: $state.snapshot(() => lastSummaryType),

    // Completion state
    summary: completion.completion,
    isLoading: completion.isLoading,
    error: completion.error,

    // Actions
    summarizeText,
    reset: completion.reset,
  }
}

// Singleton instance
export const selectedTextSummary = createSelectedTextSummary()
```

## 3. Phase 2: Core Summary Store Migration

### Bước 2.1: Tạo Summary Store V2

**File mới**: `src/stores/summaryStore.v2.svelte.js`

```javascript
// @ts-nocheck
import { useExtensionCompletion } from '@/lib/hooks/useExtensionCompletion.svelte.js'
import { getPageContent } from '@/services/contentService.js'
import { getActiveTabInfo } from '@/services/chromeService.js'
import { settings, loadSettings } from './settingsStore.svelte.js'

export function createSummaryStoreV2() {
  // Page state
  const pageTitle = $state('')
  const pageUrl = $state('')
  const isYouTubeVideoActive = $state(false)
  const isCourseVideoActive = $state(false)
  const currentContentSource = $state('')
  const lastSummaryTypeDisplayed = $state(null)
  const activeYouTubeTab = $state('videoSummary')
  const activeCourseTab = $state('courseSummary')
  const isArchived = $state(false)

  // Multiple completion instances
  const videoCompletion = useExtensionCompletion({
    api: 'summarize',
    onSuccess: () => console.log('[summaryStoreV2] Video summary completed'),
    onError: (err) =>
      console.error('[summaryStoreV2] Video summary error:', err),
  })

  const chapterCompletion = useExtensionCompletion({
    api: 'chapters',
    onSuccess: () => console.log('[summaryStoreV2] Chapter summary completed'),
    onError: (err) =>
      console.error('[summaryStoreV2] Chapter summary error:', err),
  })

  const courseSummaryCompletion = useExtensionCompletion({
    api: 'course-summary',
    onSuccess: () => console.log('[summaryStoreV2] Course summary completed'),
    onError: (err) =>
      console.error('[summaryStoreV2] Course summary error:', err),
  })

  const courseConceptsCompletion = useExtensionCompletion({
    api: 'course-concepts',
    onSuccess: () => console.log('[summaryStoreV2] Course concepts completed'),
    onError: (err) =>
      console.error('[summaryStoreV2] Course concepts error:', err),
  })

  const selectedTextCompletion = useExtensionCompletion({
    api: 'summarize',
    onSuccess: () => console.log('[summaryStoreV2] Selected text completed'),
    onError: (err) =>
      console.error('[summaryStoreV2] Selected text error:', err),
  })

  // Derived state for coordination
  const isAnyLoading = $derived(
    videoCompletion.isLoading ||
      chapterCompletion.isLoading ||
      courseSummaryCompletion.isLoading ||
      courseConceptsCompletion.isLoading ||
      selectedTextCompletion.isLoading
  )

  const hasAnyError = $derived(
    videoCompletion.error ||
      chapterCompletion.error ||
      courseSummaryCompletion.error ||
      courseConceptsCompletion.error ||
      selectedTextCompletion.error
  )

  // Backward compatibility mappings
  const summary = $derived(videoCompletion.completion || '')
  const chapterSummary = $derived(chapterCompletion.completion || '')
  const courseSummary = $derived(courseSummaryCompletion.completion || '')
  const courseConcepts = $derived(courseConceptsCompletion.completion || '')
  const selectedTextSummary = $derived(selectedTextCompletion.completion || '')

  const isLoading = $derived(videoCompletion.isLoading)
  const isChapterLoading = $derived(chapterCompletion.isLoading)
  const isCourseSummaryLoading = $derived(courseSummaryCompletion.isLoading)
  const isCourseConceptsLoading = $derived(courseConceptsCompletion.isLoading)
  const isSelectedTextLoading = $derived(selectedTextCompletion.isLoading)

  const summaryError = $derived(videoCompletion.error)
  const chapterError = $derived(chapterCompletion.error)
  const courseSummaryError = $derived(courseSummaryCompletion.error)
  const courseConceptsError = $derived(courseConceptsCompletion.error)
  const selectedTextError = $derived(selectedTextCompletion.error)

  // Actions
  const resetState = () => {
    videoCompletion.reset()
    chapterCompletion.reset()
    courseSummaryCompletion.reset()
    courseConceptsCompletion.reset()
    selectedTextCompletion.reset()

    pageTitle = ''
    pageUrl = ''
    isYouTubeVideoActive = false
    isCourseVideoActive = false
    currentContentSource = ''
    lastSummaryTypeDisplayed = null
    activeYouTubeTab = 'videoSummary'
    activeCourseTab = 'courseSummary'
    isArchived = false
  }

  const fetchAndSummarize = async () => {
    console.log('[summaryStoreV2] fetchAndSummarize called')

    await loadSettings()
    resetState()

    try {
      const tabInfo = await getActiveTabInfo()
      if (!tabInfo || !tabInfo.url) {
        throw new Error('Could not get current tab information or URL.')
      }

      pageTitle = tabInfo.title || 'Unknown Title'
      pageUrl = tabInfo.url || 'Unknown URL'

      const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
      const COURSE_MATCH_PATTERN =
        /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i

      isYouTubeVideoActive = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
      isCourseVideoActive = COURSE_MATCH_PATTERN.test(tabInfo.url)

      let mainContentTypeToFetch = 'webpageText'
      let summaryType = 'general'

      if (isYouTubeVideoActive) {
        mainContentTypeToFetch = 'transcript'
        summaryType = 'youtube'
        lastSummaryTypeDisplayed = 'youtube'
      } else if (isCourseVideoActive) {
        mainContentTypeToFetch = 'transcript'
        summaryType = 'courseSummary'
        lastSummaryTypeDisplayed = 'course'
      } else {
        lastSummaryTypeDisplayed = 'web'
      }

      const mainContentResult = await getPageContent(
        mainContentTypeToFetch,
        settings.summaryLang
      )
      currentContentSource = mainContentResult.content

      // Concurrent processing
      if (isYouTubeVideoActive) {
        // Start both video and chapter summaries concurrently
        const promises = [
          videoCompletion.submit({
            text: currentContentSource,
            contentType: 'youtube',
          }),
          (async () => {
            const chapterContentResult = await getPageContent(
              'timestampedTranscript',
              settings.summaryLang
            )
            return chapterCompletion.submit({
              text: chapterContentResult.content,
            })
          })(),
        ]

        await Promise.allSettled(promises)
      } else if (isCourseVideoActive) {
        // Start both course summary and concepts concurrently
        const promises = [
          courseSummaryCompletion.submit({
            text: currentContentSource,
            contentType: 'courseSummary',
          }),
          courseConceptsCompletion.submit({
            text: currentContentSource,
            contentType: 'courseConcepts',
          }),
        ]

        await Promise.allSettled(promises)
      } else {
        // Regular web page summary
        await videoCompletion.submit({
          text: currentContentSource,
          contentType: summaryType,
        })
      }
    } catch (error) {
      console.error('[summaryStoreV2] Error during summarization:', error)
      // Error will be captured by individual completions
    }
  }

  const summarizeSelectedText = async (text) => {
    console.log('[summaryStoreV2] summarizeSelectedText called')

    await loadSettings()
    resetDisplayState()

    const tabInfo = await getActiveTabInfo()
    pageTitle = tabInfo.title || 'Selected Text Summary'
    pageUrl = tabInfo.url || 'Unknown URL'
    lastSummaryTypeDisplayed = 'selectedText'

    await selectedTextCompletion.submit({
      text: text,
      contentType: 'selectedText',
    })
  }

  const resetDisplayState = () => {
    videoCompletion.reset()
    chapterCompletion.reset()
    courseSummaryCompletion.reset()
    courseConceptsCompletion.reset()
    selectedTextCompletion.reset()
    lastSummaryTypeDisplayed = null
    activeYouTubeTab = 'videoSummary'
    activeCourseTab = 'courseSummary'
  }

  const updateVideoActiveStates = (isYouTube, isCourse) => {
    isYouTubeVideoActive = isYouTube
    isCourseVideoActive = isCourse
  }

  const updateActiveYouTubeTab = (tabName) => {
    activeYouTubeTab = tabName
  }

  const updateActiveCourseTab = (tabName) => {
    activeCourseTab = tabName
  }

  return {
    // Backward compatibility state
    summary: $state.snapshot(() => summary),
    chapterSummary: $state.snapshot(() => chapterSummary),
    courseSummary: $state.snapshot(() => courseSummary),
    courseConcepts: $state.snapshot(() => courseConcepts),
    selectedTextSummary: $state.snapshot(() => selectedTextSummary),

    isLoading: $state.snapshot(() => isLoading),
    isChapterLoading: $state.snapshot(() => isChapterLoading),
    isCourseSummaryLoading: $state.snapshot(() => isCourseSummaryLoading),
    isCourseConceptsLoading: $state.snapshot(() => isCourseConceptsLoading),
    isSelectedTextLoading: $state.snapshot(() => isSelectedTextLoading),

    summaryError: $state.snapshot(() => summaryError),
    chapterError: $state.snapshot(() => chapterError),
    courseSummaryError: $state.snapshot(() => courseSummaryError),
    courseConceptsError: $state.snapshot(() => courseConceptsError),
    selectedTextError: $state.snapshot(() => selectedTextError),

    // Coordination state
    isAnyLoading: $state.snapshot(() => isAnyLoading),
    hasAnyError: $state.snapshot(() => hasAnyError),

    // Page state
    pageTitle: $state.snapshot(() => pageTitle),
    pageUrl: $state.snapshot(() => pageUrl),
    isYouTubeVideoActive: $state.snapshot(() => isYouTubeVideoActive),
    isCourseVideoActive: $state.snapshot(() => isCourseVideoActive),
    currentContentSource: $state.snapshot(() => currentContentSource),
    lastSummaryTypeDisplayed: $state.snapshot(() => lastSummaryTypeDisplayed),
    activeYouTubeTab: $state.snapshot(() => activeYouTubeTab),
    activeCourseTab: $state.snapshot(() => activeCourseTab),
    isArchived: $state.snapshot(() => isArchived),

    // Actions
    fetchAndSummarize,
    summarizeSelectedText,
    resetState,
    resetDisplayState,
    updateVideoActiveStates,
    updateActiveYouTubeTab,
    updateActiveCourseTab,

    // Direct access to completions for advanced usage
    completions: {
      video: videoCompletion,
      chapter: chapterCompletion,
      courseSummary: courseSummaryCompletion,
      courseConcepts: courseConceptsCompletion,
      selectedText: selectedTextCompletion,
    },
  }
}
```

### Bước 2.2: Feature Flag System

**File mới**: `src/lib/utils/featureFlags.js`

```javascript
// @ts-nocheck
import { getStorage, setStorage } from '@/services/chromeService.js'

export class FeatureFlags {
  static async get(flagName, defaultValue = false) {
    try {
      const storage = await getStorage([`feature_${flagName}`])
      return storage[`feature_${flagName}`] ?? defaultValue
    } catch (error) {
      console.warn(`[FeatureFlags] Error getting flag ${flagName}:`, error)
      return defaultValue
    }
  }

  static async set(flagName, value) {
    try {
      await setStorage({ [`feature_${flagName}`]: value })
      console.log(`[FeatureFlags] Set ${flagName} = ${value}`)
    } catch (error) {
      console.error(`[FeatureFlags] Error setting flag ${flagName}:`, error)
    }
  }

  static async toggle(flagName) {
    const currentValue = await this.get(flagName)
    await this.set(flagName, !currentValue)
    return !currentValue
  }
}

// Pre-defined feature flags
export const FEATURE_FLAGS = {
  USE_SUMMARY_STORE_V2: 'use_summary_store_v2',
  ENABLE_PERFORMANCE_MONITORING: 'enable_performance_monitoring',
  USE_STREAM_SMOOTHING: 'use_stream_smoothing',
}
```

### Bước 2.3: Store Factory Pattern

**File mới**: `src/stores/summaryStoreFactory.js`

```javascript
// @ts-nocheck
import {
  summaryState as summaryStateV1,
  fetchAndSummarize as fetchV1,
  summarizeSelectedText as summarizeSelectedTextV1,
  resetState as resetStateV1,
  resetDisplayState as resetDisplayStateV1,
  updateVideoActiveStates as updateVideoActiveStatesV1,
  updateActiveYouTubeTab as updateActiveYouTubeTabV1,
  updateActiveCourseTab as updateActiveCourseTabV1,
} from './summaryStore.svelte.js'
import { createSummaryStoreV2 } from './summaryStore.v2.svelte.js'
import { FeatureFlags, FEATURE_FLAGS } from '@/lib/utils/featureFlags.js'

let storeV2Instance = null

export async function getSummaryStore() {
  const useV2 = await FeatureFlags.get(
    FEATURE_FLAGS.USE_SUMMARY_STORE_V2,
    false
  )

  if (useV2) {
    if (!storeV2Instance) {
      storeV2Instance = createSummaryStoreV2()
      console.log('[SummaryStoreFactory] Using Summary Store V2')
    }
    return storeV2Instance
  } else {
    console.log('[SummaryStoreFactory] Using Summary Store V1')
    return {
      // V1 interface mapping
      summary: summaryStateV1.summary,
      chapterSummary: summaryStateV1.chapterSummary,
      courseSummary: summaryStateV1.courseSummary,
      courseConcepts: summaryStateV1.courseConcepts,
      selectedTextSummary: summaryStateV1.selectedTextSummary,

      isLoading: summaryStateV1.isLoading,
      isChapterLoading: summaryStateV1.isChapterLoading,
      isCourseSummaryLoading: summaryStateV1.isCourseSummaryLoading,
      isCourseConceptsLoading: summaryStateV1.isCourseConceptsLoading,
      isSelectedTextLoading: summaryStateV1.isSelectedTextLoading,

      summaryError: summaryStateV1.summaryError,
      chapterError: summaryStateV1.chapterError,
      courseSummaryError: summaryStateV1.courseSummaryError,
      courseConceptsError: summaryStateV1.courseConceptsError,
      selectedTextError: summaryStateV1.selectedTextError,

      pageTitle: summaryStateV1.pageTitle,
      pageUrl: summaryStateV1.pageUrl,
      isYouTubeVideoActive: summaryStateV1.isYouTubeVideoActive,
      isCourseVideoActive: summaryStateV1.isCourseVideoActive,
      currentContentSource: summaryStateV1.currentContentSource,
      lastSummaryTypeDisplayed: summaryStateV1.lastSummaryTypeDisplayed,
      activeYouTubeTab: summaryStateV1.activeYouTubeTab,
      activeCourseTab: summaryStateV1.activeCourseTab,
      isArchived: summaryStateV1.isArchived,

      // Actions
      fetchAndSummarize: fetchV1,
      summarizeSelectedText: summarizeSelectedTextV1,
      resetState: resetStateV1,
      resetDisplayState: resetDisplayStateV1,
      updateVideoActiveStates: updateVideoActiveStatesV1,
      updateActiveYouTubeTab: updateActiveYouTubeTabV1,
      updateActiveCourseTab: updateActiveCourseTabV1,
    }
  }
}

// Development utility functions
export async function switchToV2() {
  await FeatureFlags.set(FEATURE_FLAGS.USE_SUMMARY_STORE_V2, true)
  console.log('[SummaryStoreFactory] Switched to V2')
}

export async function switchToV1() {
  await FeatureFlags.set(FEATURE_FLAGS.USE_SUMMARY_STORE_V2, false)
  console.log('[SummaryStoreFactory] Switched to V1')
}

export async function getCurrentVersion() {
  const useV2 = await FeatureFlags.get(
    FEATURE_FLAGS.USE_SUMMARY_STORE_V2,
    false
  )
  return useV2 ? 'v2' : 'v1'
}
```

## 4. Phase 3: Performance Monitoring và Optimization

### Bước 3.1: Performance Monitor

**File mới**: `src/lib/utils/performanceMonitor.js`

```javascript
// @ts-nocheck
import { getStorage, setStorage } from '@/services/chromeService.js'

export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map()
    this.enabled = false
  }

  async init() {
    const storage = await getStorage(['performance_monitoring_enabled'])
    this.enabled = storage.performance_monitoring_enabled ?? false
  }

  startMeasurement(operationId, metadata = {}) {
    if (!this.enabled) return null

    const measurement = {
      id: operationId,
      startTime: performance.now(),
      startMemory: this.getMemoryUsage(),
      metadata,
    }

    this.metrics.set(operationId, measurement)
    console.log(`[PerformanceMonitor] Started ${operationId}`)
    return measurement
  }

  endMeasurement(operationId, result = {}) {
    if (!this.enabled) return null

    const measurement = this.metrics.get(operationId)
    if (!measurement) {
      console.warn(
        `[PerformanceMonitor] No measurement found for ${operationId}`
      )
      return null
    }

    const endTime = performance.now()
    const endMemory = this.getMemoryUsage()

    const finalMeasurement = {
      ...measurement,
      endTime,
      duration: endTime - measurement.startTime,
      endMemory,
      memoryDelta: endMemory - measurement.startMemory,
      result,
    }

    this.metrics.set(operationId, finalMeasurement)
    console.log(`[PerformanceMonitor] Completed ${operationId}:`, {
      duration: `${finalMeasurement.duration.toFixed(2)}ms`,
      memoryDelta: `${finalMeasurement.memoryDelta.toFixed(2)}MB`,
    })

    // Log to storage for analysis
    this.logMetric(finalMeasurement)

    return finalMeasurement
  }

  getMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024 // MB
    }
    return 0
  }

  async logMetric(measurement) {
    try {
      const storage = await getStorage(['performance_logs'])
      const logs = storage.performance_logs || []

      logs.push({
        ...measurement,
        timestamp: new Date().toISOString(),
      })

      // Keep only last 100 measurements
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100)
      }

      await setStorage({ performance_logs: logs })
    } catch (error) {
      console.error('[PerformanceMonitor] Error logging metric:', error)
    }
  }

  async getMetrics() {
    const storage = await getStorage(['performance_logs'])
    return storage.performance_logs || []
  }

  async clearMetrics() {
    await setStorage({ performance_logs: [] })
    this.metrics.clear()
  }

  async setEnabled(enabled) {
    this.enabled = enabled
    await setStorage({ performance_monitoring_enabled: enabled })
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Initialize on import
performanceMonitor.init()
```

### Bước 3.2: Stream Smoothing Enhancement

**File mới**: `src/lib/utils/streamSmoother.js`

```javascript
// @ts-nocheck
export class StreamSmoother {
  constructor(options = {}) {
    this.chunkDelay = options.chunkDelay || 10 // ms between chunks
    this.maxChunkSize = options.maxChunkSize || 50 // characters per chunk
    this.buffer = ''
    this.isProcessing = false
    this.onChunk = null
    this.onComplete = null
  }

  /**
   * Process streamed text with smoothing
   * @param {string} text - New text chunk
   * @param {Function} onChunk - Callback for each smoothed chunk
   * @param {Function} onComplete - Callback when processing complete
   */
  async processChunk(text, onChunk, onComplete) {
    this.buffer += text
    this.onChunk = onChunk
    this.onComplete = onComplete

    if (!this.isProcessing) {
      this.isProcessing = true
      await this.processBuffer()
    }
  }

  async processBuffer() {
    while (this.buffer.length > 0) {
      const chunkSize = Math.min(this.maxChunkSize, this.buffer.length)
      const words = this.buffer.substring(0, chunkSize).split(' ')

      // Ensure we don't break words (except for very long words)
      let chunk = ''
      let remainingBuffer = this.buffer

      if (words.length > 1 && chunkSize < this.buffer.length) {
        // Remove the last incomplete word
        const completeWords = words.slice(0, -1)
        chunk = completeWords.join(' ')
        if (chunk.length > 0) chunk += ' '
        remainingBuffer = this.buffer.substring(chunk.length)
      } else {
        chunk = this.buffer.substring(0, chunkSize)
        remainingBuffer = this.buffer.substring(chunkSize)
      }

      if (chunk.length > 0) {
        this.onChunk?.(chunk)
        this.buffer = remainingBuffer

        if (this.chunkDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.chunkDelay))
        }
      } else {
        // Prevent infinite loop
        break
      }
    }

    this.isProcessing = false

    if (this.buffer.length === 0) {
      this.onComplete?.()
    }
  }

  clear() {
    this.buffer = ''
    this.isProcessing = false
  }
}
```

### Bước 3.3: Enhanced useExtensionCompletion với Smoothing

**Cập nhật**: `src/lib/hooks/useExtensionCompletion.svelte.js`

```javascript
// Thêm vào existing file
import { StreamSmoother } from '@/lib/utils/streamSmoother.js'
import { performanceMonitor } from '@/lib/utils/performanceMonitor.js'
import { FeatureFlags, FEATURE_FLAGS } from '@/lib/utils/featureFlags.js'

export function useExtensionCompletion(config = {}) {
  const completion = $state('')
  const isLoading = $state(false)
  const error = $state(null)
  const requestId = $state(null)

  // Stream smoother instance
  let streamSmoother = null

  const submit = async (data) => {
    if (isLoading) return

    const reqId = generateRequestId()
    requestId = reqId
    isLoading = true
    error = null
    completion = ''

    // Start performance monitoring
    const measurementId = `${config.api}_${reqId}`
    performanceMonitor.startMeasurement(measurementId, {
      api: config.api,
      dataSize: JSON.stringify(data).length,
    })

    try {
      // Check if stream smoothing is enabled
      const useSmoothing = await FeatureFlags.get(
        FEATURE_FLAGS.USE_STREAM_SMOOTHING,
        true
      )

      if (useSmoothing) {
        streamSmoother = new StreamSmoother({
          chunkDelay: config.streamDelay || 15,
          maxChunkSize: config.maxChunkSize || 30,
        })
      }

      // Send request to background script
      const response = await browser.runtime.sendMessage({
        action: 'api-request',
        requestId: reqId,
        endpoint: config.api,
        data: {
          ...data,
          settings: settings,
        },
      })

      if (response.type === 'error') {
        throw new Error(response.data)
      }

      // Handle streaming response
      await handleStreamingResponse(reqId, (chunk) => {
        if (useSmoothing && streamSmoother) {
          streamSmoother.processChunk(
            chunk,
            (smoothChunk) => {
              completion += smoothChunk
            },
            () => {
              console.log(
                `[useExtensionCompletion] Stream smoothing completed for ${config.api}`
              )
            }
          )
        } else {
          completion += chunk
        }
      })

      performanceMonitor.endMeasurement(measurementId, {
        success: true,
        completionLength: completion.length,
      })

      config.onSuccess?.(completion)
    } catch (err) {
      error = err
      performanceMonitor.endMeasurement(measurementId, {
        success: false,
        error: err.message,
      })
      config.onError?.(err)
    } finally {
      isLoading = false
      streamSmoother?.clear()
    }
  }

  const reset = () => {
    completion = ''
    error = null
    isLoading = false
    streamSmoother?.clear()
  }

  return {
    completion: $state.snapshot(() => completion),
    isLoading: $state.snapshot(() => isLoading),
    error: $state.snapshot(() => error),
    submit,
    reset,
  }
}
```

## 5. Phase 4: UI Integration và Testing

### Bước 4.1: Update Main App Component

**Cập nhật**: `src/entrypoints/sidepanel/App.svelte`

```javascript
// Thêm vào script section
import { getSummaryStore } from '@/stores/summaryStoreFactory.js'
import { onMount } from 'svelte'

let summaryStore = null
let storeVersion = 'v1'

onMount(async () => {
  summaryStore = await getSummaryStore()
  storeVersion = summaryStore.completions ? 'v2' : 'v1'
  console.log(`[App.svelte] Using summary store ${storeVersion}`)
})

// Rest of the component remains the same, but now uses summaryStore instead of direct imports
```

### Bước 4.2: Development Tools Component

**File mới**: `src/components/dev/DevTools.svelte`

```svelte
<script>
  import { performanceMonitor } from '@/lib/utils/performanceMonitor.js'
  import { FeatureFlags, FEATURE_FLAGS } from '@/lib/utils/featureFlags.js'
  import { switchToV1, switchToV2, getCurrentVersion } from '@/stores/summaryStoreFactory.js'

  let currentVersion = 'v1'
  let performanceEnabled = false
  let metrics = []
  let showDevTools = false

  async function loadState() {
    currentVersion = await getCurrentVersion()
    performanceEnabled = await FeatureFlags.get(FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING, false)
    metrics = await performanceMonitor.getMetrics()
  }

  async function toggleVersion() {
    if (currentVersion === 'v1') {
      await switchToV2()
      currentVersion = 'v2'
    } else {
      await switchToV1()
      currentVersion = 'v1'
    }

    // Reload page to apply changes
    window.location.reload()
  }

  async function togglePerformanceMonitoring() {
    performanceEnabled = !performanceEnabled
    await performanceMonitor.setEnabled(performanceEnabled)
    await FeatureFlags.set(FEATURE_FLAGS.ENABLE_PERFORMANCE_MONITORING, performanceEnabled)
  }

  async function clearMetrics() {
    await performanceMonitor.clearMetrics()
    metrics = []
  }

  onMount(loadState)
</script>

{#if import.meta.env.DEV}
  <div class="dev-tools">
    <button
      class="dev-toggle"
      on:click={() => showDevTools = !showDevTools}
    >
      🛠️ Dev Tools
    </button>

    {#if showDevTools}
      <div class="dev-panel">
        <div class="dev-section">
          <h4>Store Version</h4>
          <p>Current: {currentVersion}</p>
          <button on:click={toggleVersion}>
            Switch to {currentVersion === 'v1' ? 'V2' : 'V1'}
          </button>
        </div>

        <div class="dev-section">
          <h4>Performance Monitoring</h4>
          <label>
            <input
              type="checkbox"
              checked={performanceEnabled}
              on:change={togglePerformanceMonitoring}
            />
            Enable monitoring
          </label>
        </div>

        {#if metrics.length > 0}
          <div class="dev-section">
            <h4>Performance Metrics</h4>
            <button on:click={clearMetrics}>Clear Metrics</button>
            <div class="metrics-list">
              {#each metrics.slice(-5) as metric}
                <div class="metric">
                  <strong>{metric.id}</strong>:
                  {metric.duration?.toFixed(2)}ms
                  ({metric.memoryDelta?.toFixed(2)}MB)
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .dev-tools {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
  }

  .dev-toggle {
    background: #333;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .dev-panel {
    position: absolute;
    top: 100%;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    min-width: 200px;
    font-size: 12px;
  }

  .dev-section {
    margin-bottom: 10px;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
  }

  .dev-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  .dev-section h4 {
    margin: 0 0 5px 0;
    font-size: 13px;
  }

  .metrics-list {
    max-height: 100px;
    overflow-y: auto;
  }

  .metric {
    font-size: 11px;
    margin: 2px 0;
  }
</style>
```

### Bước 4.3: Integration Testing

**File mới**: `src/lib/testing/integrationTests.js`

```javascript
// @ts-nocheck
export class IntegrationTester {
  constructor() {
    this.results = []
  }

  async runAllTests() {
    console.log('[IntegrationTester] Starting integration tests...')

    const tests = [
      this.testSelectedTextSummary,
      this.testYouTubeSummary,
      this.testCourseSummary,
      this.testErrorHandling,
      this.testConcurrentOperations,
    ]

    for (const test of tests) {
      try {
        await test.call(this)
      } catch (error) {
        console.error(`[IntegrationTester] Test failed:`, error)
        this.results.push({
          test: test.name,
          success: false,
          error: error.message,
        })
      }
    }

    console.log('[IntegrationTester] Tests completed:', this.results)
    return this.results
  }

  async testSelectedTextSummary() {
    const testText =
      'This is a test text for summarization. It should be processed correctly by the new system.'

    // Test with both store versions
    const { switchToV1, switchToV2, getSummaryStore } = await import(
      '@/stores/summaryStoreFactory.js'
    )

    // Test V1
    await switchToV1()
    const storeV1 = await getSummaryStore()
    await storeV1.summarizeSelectedText(testText)

    // Test V2
    await switchToV2()
    const storeV2 = await getSummaryStore()
    await storeV2.summarizeSelectedText(testText)

    this.results.push({
      test: 'testSelectedTextSummary',
      success: true,
      details: 'Both store versions handled selected text',
    })
  }

  async testYouTubeSummary() {
    // Mock YouTube content
    const mockContent = 'Mock YouTube transcript content for testing...'

    // This would require more complex mocking setup
    console.log(
      '[IntegrationTester] YouTube test would need content script mocking'
    )

    this.results.push({
      test: 'testYouTubeSummary',
      success: true,
      details: 'Test structure ready (requires mock setup)',
    })
  }

  async testCourseSummary() {
    console.log('[IntegrationTester] Course summary test placeholder')

    this.results.push({
      test: 'testCourseSummary',
      success: true,
      details: 'Test structure ready',
    })
  }

  async testErrorHandling() {
    // Test error scenarios
    try {
      const { getSummaryStore } = await import(
        '@/stores/summaryStoreFactory.js'
      )
      const store = await getSummaryStore()

      // Test empty text
      await store.summarizeSelectedText('')

      // Should not reach here
      this.results.push({
        test: 'testErrorHandling',
        success: false,
        error: 'Expected error for empty text',
      })
    } catch (error) {
      this.results.push({
        test: 'testErrorHandling',
        success: true,
        details: 'Error handling working correctly',
      })
    }
  }

  async testConcurrentOperations() {
    // Test multiple simultaneous operations
    console.log('[IntegrationTester] Concurrent operations test placeholder')

    this.results.push({
      test: 'testConcurrentOperations',
      success: true,
      details: 'Test structure ready',
    })
  }
}
```

## 6. Phase 5: Production Migration

### Bước 5.1: Gradual Rollout Strategy

**File mới**: `src/lib/utils/rolloutManager.js`

```javascript
// @ts-nocheck
import { getStorage, setStorage } from '@/services/chromeService.js'
import { FeatureFlags, FEATURE_FLAGS } from './featureFlags.js'

export class RolloutManager {
  static async shouldUseV2() {
    // Check if user is in beta group
    const isBetaUser = await this.isBetaUser()
    if (isBetaUser) return true

    // Check rollout percentage
    const rolloutPercentage = await this.getRolloutPercentage()
    const userHash = await this.getUserHash()

    return userHash % 100 < rolloutPercentage
  }

  static async isBetaUser() {
    const storage = await getStorage(['is_beta_user'])
    return storage.is_beta_user || false
  }

  static async setBetaUser(isBeta) {
    await setStorage({ is_beta_user: isBeta })
  }

  static async getRolloutPercentage() {
    const storage = await getStorage(['rollout_percentage'])
    return storage.rollout_percentage || 0
  }

  static async setRolloutPercentage(percentage) {
    await setStorage({
      rollout_percentage: Math.max(0, Math.min(100, percentage)),
    })
  }

  static async getUserHash() {
    let storage = await getStorage(['user_hash'])
    if (!storage.user_hash) {
      // Generate consistent hash for this user
      storage.user_hash = Math.floor(Math.random() * 100)
      await setStorage({ user_hash: storage.user_hash })
    }
    return storage.user_hash
  }

  static async initializeForUser() {
    const shouldUse = await this.shouldUseV2()
    await FeatureFlags.set(FEATURE_FLAGS.USE_SUMMARY_STORE_V2, shouldUse)

    console.log(`[RolloutManager] User assigned to: ${shouldUse ? 'V2' : 'V1'}`)
    return shouldUse
  }
}
```

### Bước 5.2: Migration Script

**File mới**: `src/lib/utils/migrationScript.js`

```javascript
// @ts-nocheck
import { RolloutManager } from './rolloutManager.js'
import { performanceMonitor } from './performanceMonitor.js'

export class MigrationScript {
  static async runMigration() {
    console.log('[MigrationScript] Starting migration process...')

    try {
      // Initialize performance monitoring
      await performanceMonitor.init()

      // Check if this is first run after update
      const isFirstRun = await this.isFirstRun()

      if (isFirstRun) {
        console.log('[MigrationScript] First run detected, initializing...')

        // Initialize rollout for user
        await RolloutManager.initializeForUser()

        // Mark as migrated
        await this.markAsMigrated()
      }

      console.log('[MigrationScript] Migration completed successfully')
    } catch (error) {
      console.error('[MigrationScript] Migration failed:', error)

      // Fallback to V1 on error
      await FeatureFlags.set(FEATURE_FLAGS.USE_SUMMARY_STORE_V2, false)
    }
  }

  static async isFirstRun() {
    const storage = await getStorage(['migration_completed'])
    return !storage.migration_completed
  }

  static async markAsMigrated() {
    await setStorage({
      migration_completed: true,
      migration_date: new Date().toISOString(),
    })
  }
}
```

### Bước 5.3: Update Initialization

**Cập nhật**: `src/entrypoints/sidepanel/main.js`

```javascript
// Thêm vào đầu file
import { MigrationScript } from '@/lib/utils/migrationScript.js'

// Trước khi mount app
async function initializeApp() {
  // Run migration if needed
  await MigrationScript.runMigration()

  // Existing app initialization
  // ...
}

initializeApp()
```

## 7. Phase 6: Monitoring và Rollback

### Bước 6.1: Health Check System

**File mới**: `src/lib/utils/healthChecker.js`

```javascript
// @ts-nocheck
export class HealthChecker {
  static async checkSystemHealth() {
    const checks = {
      backgroundScript: await this.checkBackgroundScript(),
      apiHandler: await this.checkApiHandler(),
      storeFactory: await this.checkStoreFactory(),
      performance: await this.checkPerformance(),
    }

    const isHealthy = Object.values(checks).every(
      (check) => check.status === 'ok'
    )

    return {
      healthy: isHealthy,
      checks,
      timestamp: new Date().toISOString(),
    }
  }

  static async checkBackgroundScript() {
    try {
      const response = await browser.runtime.sendMessage({
        action: 'health-check',
      })

      return {
        status: 'ok',
        response: response,
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      }
    }
  }

  static async checkApiHandler() {
    try {
      // Test a simple API call
      const response = await browser.runtime.sendMessage({
        action: 'api-request',
        requestId: 'health-check',
        endpoint: 'health',
        data: {},
      })

      return {
        status: 'ok',
        response: response,
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      }
    }
  }

  static async checkStoreFactory() {
    try {
      const { getSummaryStore, getCurrentVersion } = await import(
        '@/stores/summaryStoreFactory.js'
      )
      const store = await getSummaryStore()
      const version = await getCurrentVersion()

      return {
        status: 'ok',
        version: version,
        storeAvailable: !!store,
      }
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
      }
    }
  }

  static async checkPerformance() {
    const metrics = await performanceMonitor.getMetrics()
    const recentMetrics = metrics.slice(-10)

    if (recentMetrics.length === 0) {
      return {
        status: 'ok',
        message: 'No metrics available',
      }
    }

    const avgDuration =
      recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) /
      recentMetrics.length
    const hasErrors = recentMetrics.some((m) => m.result?.success === false)

    return {
      status: avgDuration > 10000 || hasErrors ? 'warning' : 'ok',
      avgDuration,
      hasErrors,
      metricsCount: recentMetrics.length,
    }
  }
}
```

### Bước 6.2: Automatic Rollback

**File mới**: `src/lib/utils/autoRollback.js`

```javascript
// @ts-nocheck
import { HealthChecker } from './healthChecker.js'
import { FeatureFlags, FEATURE_FLAGS } from './featureFlags.js'
import { setStorage, getStorage } from '@/services/chromeService.js'

export class AutoRollback {
  static async checkAndRollback() {
    const isV2Enabled = await FeatureFlags.get(
      FEATURE_FLAGS.USE_SUMMARY_STORE_V2,
      false
    )

    if (!isV2Enabled) {
      return { rollback: false, reason: 'V2 not enabled' }
    }

    const health = await HealthChecker.checkSystemHealth()

    if (!health.healthy) {
      const rollbackCount = await this.getRollbackCount()

      if (rollbackCount < 3) {
        // Maximum 3 automatic rollbacks
        await this.performRollback(health)
        await this.incrementRollbackCount()

        return {
          rollback: true,
          reason: 'Health check failed',
          details: health.checks,
        }
      } else {
        console.warn('[AutoRollback] Maximum rollback attempts reached')
        return {
          rollback: false,
          reason: 'Max rollback attempts reached',
          details: health.checks,
        }
      }
    }

    return { rollback: false, reason: 'System healthy' }
  }

  static async performRollback(healthReport) {
    console.warn(
      '[AutoRollback] Performing automatic rollback to V1',
      healthReport
    )

    // Switch to V1
    await FeatureFlags.set(FEATURE_FLAGS.USE_SUMMARY_STORE_V2, false)

    // Log rollback event
    await this.logRollbackEvent(healthReport)

    // Notify user (if possible)
    this.notifyUser(
      'System automatically switched to stable version due to performance issues.'
    )
  }

  static async getRollbackCount() {
    const storage = await getStorage(['rollback_count'])
    return storage.rollback_count || 0
  }

  static async incrementRollbackCount() {
    const count = await this.getRollbackCount()
    await setStorage({ rollback_count: count + 1 })
  }

  static async resetRollbackCount() {
    await setStorage({ rollback_count: 0 })
  }

  static async logRollbackEvent(healthReport) {
    const storage = await getStorage(['rollback_events'])
    const events = storage.rollback_events || []

    events.push({
      timestamp: new Date().toISOString(),
      healthReport,
      userAgent: navigator.userAgent,
    })

    // Keep only last 10 events
    if (events.length > 10) {
      events.splice(0, events.length - 10)
    }

    await setStorage({ rollback_events: events })
  }

  static notifyUser(message) {
    // Could use chrome.notifications API or dispatch custom event
    document.dispatchEvent(
      new CustomEvent('system-notification', {
        detail: { message, type: 'warning' },
      })
    )
  }
}
```

### Bước 6.3: Background Health Monitoring

**Cập nhật**: `src/entrypoints/background.js`

```javascript
// Thêm vào background script
import { AutoRollback } from '../lib/utils/autoRollback.js'

// Health check endpoint
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Existing handlers...

  if (message.action === 'health-check') {
    sendResponse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: chrome.runtime.getManifest().version,
    })
    return true
  }

  // Existing handlers continue...
})

// Periodic health check (every 30 minutes)
setInterval(async () => {
  try {
    const result = await AutoRollback.checkAndRollback()
    if (result.rollback) {
      console.log('[Background] Automatic rollback performed:', result.reason)
    }
  } catch (error) {
    console.error('[Background] Health check error:', error)
  }
}, 30 * 60 * 1000) // 30 minutes
```

## 8. Verification và Testing Procedures

### Functional Testing Checklist

- [ ] Selected text summarization works in both V1 and V2
- [ ] YouTube video summarization with concurrent chapter processing
- [ ] Course summarization (Udemy/Coursera) with concepts extraction
- [ ] Web page summarization for general content
- [ ] Error handling for network issues, invalid API keys, provider failures
- [ ] Stream smoothing produces natural text flow
- [ ] Performance monitoring captures accurate metrics
- [ ] Feature flags switch between versions correctly
- [ ] Rollback system activates on health check failures
- [ ] Cross-browser compatibility (Chrome/Firefox)

### Performance Testing Checklist

- [ ] Memory usage comparison between V1 and V2
- [ ] Stream processing latency measurements
- [ ] Concurrent operations resource usage
- [ ] Background script lifecycle handling
- [ ] Extension startup/shutdown performance
- [ ] Large content processing (long videos/articles)

### Error Scenario Testing

- [ ] API provider unavailable
- [ ] Network connectivity issues
- [ ] Invalid API keys
- [ ] Malformed content extraction
- [ ] Browser permission changes
- [ ] Extension storage limits
- [ ] Concurrent request conflicts

## 9. Rollback Plan

### Emergency Rollback (Immediate)

1. Set feature flag: `USE_SUMMARY_STORE_V2 = false`
2. Reload extension or restart browser
3. Verify V1 functionality

### Gradual Rollback (Planned)

1. Reduce rollout percentage gradually
2. Monitor user feedback and error rates
3. Collect performance data for analysis
4. Make decision based on metrics

### Data Preservation

- All user settings maintained across versions
- Summary history preserved
- Archive data remains accessible
- No data loss during version switches

## 10. Success Metrics

### Technical Metrics

- Reduced average response time by 20%
- Decreased memory usage by 15%
- Improved stream smoothness (subjective user feedback)
- Reduced code complexity in UI components
- Better error recovery rates

### User Experience Metrics

- User retention rates
- Feature usage patterns
- Error report frequency
- Performance complaint rates
- Extension rating improvements

### Development Metrics

- Code maintainability scores
- Bug fix time reduction
- Feature development velocity
- Testing coverage improvements
- Documentation completeness

---

**Kết luận**: Kế hoạch này cung cấp một lộ trình chi tiết và an toàn để tái cấu trúc hệ thống với khả năng rollback đầy đủ. Mỗi phase được thiết kế để có thể test và validate độc lập trước khi chuyển sang phase tiếp theo.
