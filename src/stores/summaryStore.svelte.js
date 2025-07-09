// @ts-nocheck
import { marked } from 'marked'
import { getPageContent } from '../services/contentService.js'
import { getActiveTabInfo } from '../services/chromeService.js'
import { settings, loadSettings } from './settingsStore.svelte.js' // Import settings and loadSettings
import { summarizeContent, summarizeChapters } from '../lib/api.js'

// --- State ---
export const summaryState = $state({
  summary: '',
  chapterSummary: '',
  courseSummary: '', // For Course video summary
  courseConcepts: '', // For Course concepts explanation
  isLoading: false,
  isChapterLoading: false,
  isCourseSummaryLoading: false, // For Course video summary loading state
  isCourseConceptsLoading: false, // For Course concepts loading state
  error: '',
  chapterError: '',
  courseSummaryError: '', // For Course summary error
  courseConceptsError: '', // For Course concepts error
  isYouTubeVideoActive: false,
  isCourseVideoActive: false, // For Course video active state
  currentContentSource: '',
  selectedTextSummary: '',
  isSelectedTextLoading: false,
  selectedTextError: '',
  lastSummaryTypeDisplayed: null,
  activeYouTubeTab: 'videoSummary',
  activeCourseTab: 'courseSummary', // For active Course tab
})

// --- Actions ---

/**
 * Reset all summary-related states.
 */
export function resetState() {
  summaryState.summary = ''
  summaryState.chapterSummary = ''
  summaryState.courseSummary = ''
  summaryState.courseConcepts = ''
  summaryState.selectedTextSummary = ''
  summaryState.isLoading = false
  summaryState.isChapterLoading = false
  summaryState.isCourseSummaryLoading = false
  summaryState.isCourseConceptsLoading = false
  summaryState.isSelectedTextLoading = false
  summaryState.error = ''
  summaryState.chapterError = ''
  summaryState.courseSummaryError = ''
  summaryState.courseConceptsError = ''
  summaryState.isYouTubeVideoActive = false
  summaryState.isCourseVideoActive = false
  summaryState.currentContentSource = ''
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
  summaryState.activeCourseTab = 'courseSummary'
}

/**
 * Resets only the display-related states, clearing current summaries.
 */
export function resetDisplayState() {
  summaryState.summary = ''
  summaryState.chapterSummary = ''
  summaryState.courseSummary = ''
  summaryState.courseConcepts = ''
  summaryState.selectedTextSummary = ''
  summaryState.error = ''
  summaryState.chapterError = ''
  summaryState.courseSummaryError = ''
  summaryState.courseConceptsError = ''
  summaryState.lastSummaryTypeDisplayed = null
  summaryState.activeYouTubeTab = 'videoSummary'
  summaryState.activeCourseTab = 'courseSummary'
}

/**
 * Updates the video active states.
 * @param {boolean} isYouTube - Whether the current tab is a YouTube video.
 * @param {boolean} isCourse - Whether the current tab is a Course video.
 */
export function updateVideoActiveStates(isYouTube, isCourse) {
  summaryState.isYouTubeVideoActive = isYouTube
  summaryState.isCourseVideoActive = isCourse
  console.log(
    `[summaryStore] isYouTubeVideoActive updated to: ${isYouTube}, isCourseVideoActive updated to: ${isCourse}`
  )
}

/**
 * Updates the active YouTube tab state.
 * @param {string} tabName - The ID of the active YouTube tab ('videoSummary' or 'chapterSummary').
 */
export function updateActiveYouTubeTab(tabName) {
  summaryState.activeYouTubeTab = tabName
}

/**
 * Updates the active Course tab state.
 * @param {string} tabName - The ID of the active Course tab ('courseSummary' or 'courseConcepts').
 */
export function updateActiveCourseTab(tabName) {
  summaryState.activeCourseTab = tabName
}

/**
 * Checks if the API key for the selected provider is configured.
 * @param {object} userSettings - The current settings object.
 * @param {string} selectedProviderId - The ID of the selected provider.
 * @throws {Error} If the API key is not configured.
 */
function checkApiKeyConfiguration(userSettings, selectedProviderId) {
  let apiKey
  if (selectedProviderId === 'ollama') {
    apiKey = userSettings.ollamaEndpoint
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'Ollama Endpoint not configured in settings. Please add your Ollama Endpoint in the settings.'
      )
    }
    if (
      !userSettings.selectedOllamaModel ||
      userSettings.selectedOllamaModel.trim() === ''
    ) {
      throw new Error(
        'Ollama Model not configured in settings. Please select an Ollama Model in the settings.'
      )
    }
  } else if (selectedProviderId === 'gemini') {
    apiKey = userSettings.isAdvancedMode
      ? userSettings.geminiAdvancedApiKey
      : userSettings.geminiApiKey
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        'Gemini API Key not configured in settings. Please add your API Key in the settings.'
      )
    }
  } else {
    // For other providers that use API keys
    apiKey = userSettings[`${selectedProviderId}ApiKey`]
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(
        `${selectedProviderId} API Key not configured in settings. Please add your API Key in the settings.`
      )
    }
  }
}

/**
 * Fetches content from the current tab and triggers the summarization process.
 */
export async function fetchAndSummarize() {
  // If a summarization process is already ongoing, reset state and start a new one
  if (summaryState.isLoading || summaryState.isChapterLoading) {
    resetState() // Reset state before starting a new summarization
  }

  // Wait for settings to be initialized
  await loadSettings()

  const userSettings = settings

  // Reset state before starting
  resetState()

  try {
    // Immediately set loading states inside try block
    summaryState.isLoading = true
    summaryState.isChapterLoading = true
    summaryState.isCourseSummaryLoading = true
    summaryState.isCourseConceptsLoading = true

    // Determine the actual provider to use based on isAdvancedMode
    let selectedProviderId = userSettings.selectedProvider || 'gemini'
    if (!userSettings.isAdvancedMode) {
      selectedProviderId = 'gemini' // Force Gemini in basic mode
    }

    // Check API key configuration
    checkApiKeyConfiguration(userSettings, selectedProviderId)

    console.log('[summaryStore] Checking tab type...')
    const tabInfo = await getActiveTabInfo()
    if (!tabInfo || !tabInfo.url) {
      throw new Error(
        'Could not get current tab information or URL. Please try switching to a different tab and back, or ing the extension. if this error persists, please clear your cookie.'
      )
    }
    const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
    const COURSE_MATCH_PATTERN =
      /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i // Kết hợp Udemy và Coursera

    summaryState.isYouTubeVideoActive = YOUTUBE_MATCH_PATTERN.test(tabInfo.url)
    summaryState.isCourseVideoActive = COURSE_MATCH_PATTERN.test(tabInfo.url)

    console.log(
      `[summaryStore] Current tab is: ${tabInfo.url}. YouTube video: ${summaryState.isYouTubeVideoActive}. Course video: ${summaryState.isCourseVideoActive}` // Changed from Udemy video
    )

    let mainContentTypeToFetch = 'webpageText'
    let summaryType = 'general'

    if (summaryState.isYouTubeVideoActive) {
      mainContentTypeToFetch = 'transcript'
      summaryType = 'youtube'
      summaryState.lastSummaryTypeDisplayed = 'youtube' // Set immediately
    } else if (summaryState.isCourseVideoActive) {
      // Changed from isUdemyVideoActive
      mainContentTypeToFetch = 'transcript'
      summaryType = 'courseSummary' // Changed from udemySummary
      summaryState.lastSummaryTypeDisplayed = 'course' // Changed from udemy
    } else {
      summaryState.lastSummaryTypeDisplayed = 'web' // Set immediately for general web
    }
    console.log(
      `[summaryStore] Will fetch main content type: ${mainContentTypeToFetch} for summary type: ${summaryType}`
    )

    const mainContentResult = await getPageContent(
      mainContentTypeToFetch,
      userSettings.summaryLang
    )

    if (mainContentResult.type === 'error' || !mainContentResult.content) {
      throw new Error(
        'Could not get main page content. Please try refreshing the page or reopening the extension. If the error persists, please clear your browser cookies and site data for this site.'
      )
    }

    summaryState.currentContentSource = mainContentResult.content

    if (summaryState.isYouTubeVideoActive) {
      console.log(
        '[summaryStore] Starting to fetch timestamped transcript for chapters and video summary...'
      )
      const chapterPromise = (async () => {
        summaryState.chapterError = ''
        try {
          const chapterContentResult = await getPageContent(
            'timestampedTranscript',
            userSettings.summaryLang
          )
          if (
            chapterContentResult.type === 'error' ||
            !chapterContentResult.content
          ) {
            throw new Error(
              'Could not get timestamped transcript for chapters. Please try refreshing the page or reopening the extension. If the error persists, please clear your YouTube cookies and site data.'
            )
          }
          console.log(
            '[summaryStore] Fetched timestamped transcript, starting chapter summarization...'
          )

          const chapterSummarizedText = await summarizeChapters(
            chapterContentResult.content
          )

          if (!chapterSummarizedText || chapterSummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini returned empty result for chapter summary.'
            )
            summaryState.chapterSummary =
              '<p><i>Could not generate chapter summary from this content.</i></p>'
          } else {
            summaryState.chapterSummary = marked.parse(chapterSummarizedText)
          }
          console.log('[summaryStore] Chapter summary processed.')
        } catch (e) {
          console.error('[summaryStore] Chapter summarization error:', e)
          summaryState.chapterError =
            e.message ||
            'Unexpected error when summarizing chapters. Please try again later.'
        } finally {
          summaryState.isChapterLoading = false
        }
      })()

      const videoSummaryPromise = (async () => {
        summaryState.error = ''
        try {
          const videoSummarizedText = await summarizeContent(
            summaryState.currentContentSource,
            'youtube'
          )

          if (!videoSummarizedText || videoSummarizedText.trim() === '') {
            console.warn(
              '[summaryStore] Gemini returned empty result for YouTube video summary.'
            )
            summaryState.summary =
              '<p><i>Could not generate YouTube video summary from this content.</i></p>'
          } else {
            summaryState.summary = marked.parse(videoSummarizedText)
          }
          console.log('[summaryStore] YouTube video summary processed.')
        } catch (e) {
          console.error('[summaryStore] YouTube video summarization error:', e)
          summaryState.error =
            e.message ||
            'Unexpected error when summarizing YouTube video. Please try again later.'
        } finally {
          summaryState.isLoading = false
        }
      })()
      await Promise.all([chapterPromise, videoSummaryPromise])
    } else if (summaryState.isCourseVideoActive) {
      // Changed from isUdemyVideoActive
      console.log(
        '[summaryStore] Starting Course summary and concept explanation...' // Changed from Udemy
      )

      const courseSummaryPromise = (async () => {
        // Changed from udemySummaryPromise
        summaryState.courseSummaryError = '' // Changed from udemySummaryError
        try {
          const courseSummarizedText = await summarizeContent(
            // Changed from udemySummarizedText
            summaryState.currentContentSource,
            'courseSummary' // Changed from udemySummary
          )

          if (!courseSummarizedText || courseSummarizedText.trim() === '') {
            // Changed from udemySummarizedText
            console.warn(
              '[summaryStore] Gemini returned empty result for Course summary.' // Changed from Udemy
            )
            summaryState.courseSummary = // Changed from udemySummary
              '<p><i>Could not generate Course lecture summary from this content.</i></p>' // Changed from Udemy
          } else {
            summaryState.courseSummary = marked.parse(courseSummarizedText) // Changed from udemySummary, udemySummarizedText
          }
          console.log('[summaryStore] Course summary processed.') // Changed from Udemy
        } catch (e) {
          console.error('[summaryStore] Course summarization error:', e) // Changed from Udemy
          summaryState.courseSummaryError = // Changed from udemySummaryError
            e.message ||
            'Unexpected error when summarizing Course video. Please try again later.' // Changed from Udemy
        } finally {
          summaryState.isCourseSummaryLoading = false // Changed from isUdemySummaryLoading
        }
      })()

      const courseConceptsPromise = (async () => {
        // Changed from udemyConceptsPromise
        summaryState.courseConceptsError = '' // Changed from udemyConceptsError
        try {
          const courseConceptsText = await summarizeContent(
            // Changed from udemyConceptsText
            summaryState.currentContentSource,
            'courseConcepts' // Changed from udemyConcepts
          )

          if (!courseConceptsText || courseConceptsText.trim() === '') {
            // Changed from udemyConceptsText
            console.warn(
              '[summaryStore] Gemini returned empty result for Course concept explanation.' // Changed from Udemy
            )
            summaryState.courseConcepts = // Changed from udemyConcepts
              '<p><i>Could not explain terms from this content.</i></p>'
          } else {
            summaryState.courseConcepts = marked.parse(courseConceptsText) // Changed from udemyConcepts, udemyConceptsText
          }
          console.log('[summaryStore] Course concept explanation processed.') // Changed from Udemy
        } catch (e) {
          console.error('[summaryStore] Course concept explanation error:', e) // Changed from Udemy
          summaryState.courseConceptsError = // Changed from udemyConceptsError
            e.message ||
            'Unexpected error when explaining Course concepts. Please try again later.' // Changed from Udemy
        } finally {
          summaryState.isCourseConceptsLoading = false // Changed from isUdemyConceptsLoading
        }
      })()

      await Promise.allSettled([courseSummaryPromise, courseConceptsPromise]) // Changed from udemySummaryPromise, udemyConceptsPromise
    } else {
      // For general webpages, this is the primary summarization.
      console.log(
        '[summaryStore] Starting main summarization for general webpage...'
      )
      const summarizedText = await summarizeContent(
        summaryState.currentContentSource,
        summaryType
      )

      if (!summarizedText || summarizedText.trim() === '') {
        console.warn(
          '[summaryStore] Gemini returned empty result for main summary.'
        )
        summaryState.summary =
          '<p><i>Could not generate summary from this content.</i></p>'
      } else {
        summaryState.summary = marked.parse(summarizedText)
      }
    }
  } catch (e) {
    console.error('[summaryStore] Error during main summarization process:', e)
    summaryState.error =
      e.message || 'An unexpected error occurred. Please try again later.'
    summaryState.lastSummaryTypeDisplayed = 'web' // Ensure error is displayed in WebSummaryDisplay
  } finally {
    // Ensure all loading states are set to false
    summaryState.isLoading = false
    summaryState.isChapterLoading = false
    summaryState.isCourseSummaryLoading = false
    summaryState.isCourseConceptsLoading = false
  }
}

export async function summarizeSelectedText(text) {
  if (
    summaryState.isSelectedTextLoading ||
    summaryState.isLoading ||
    summaryState.isChapterLoading
  ) {
    console.warn(
      '[summaryStore] Existing summarization in progress. Resetting and starting new selected text summarization.'
    )
    resetState()
  }

  // Wait for settings to be initialized
  await loadSettings()

  const userSettings = settings

  resetDisplayState()
  summaryState.selectedTextSummary = ''
  summaryState.selectedTextError = ''
  summaryState.lastSummaryTypeDisplayed = 'selectedText'

  try {
    summaryState.isSelectedTextLoading = true

    // Determine the actual provider to use based on isAdvancedMode
    let selectedProviderId = userSettings.selectedProvider || 'gemini'
    if (!userSettings.isAdvancedMode) {
      selectedProviderId = 'gemini' // Force Gemini in basic mode
    }

    // Check API key configuration
    checkApiKeyConfiguration(userSettings, selectedProviderId)

    if (!text || text.trim() === '') {
      throw new Error('No text selected for summarization.')
    }

    console.log('[summaryStore] Starting selected text summarization...')
    const summarizedText = await summarizeContent(text, 'selectedText')

    if (!summarizedText || summarizedText.trim() === '') {
      console.warn(
        '[summaryStore] Gemini returned empty result for selected text summary.'
      )
      summaryState.selectedTextSummary =
        '<p><i>Could not generate summary from this selected text.</i></p>'
    } else {
      summaryState.selectedTextSummary = marked.parse(summarizedText)
    }
    console.log('[summaryStore] Selected text summary processed.')
  } catch (e) {
    console.error('[summaryStore] Selected text summarization error:', e)
    summaryState.selectedTextError =
      e.message ||
      'An unexpected error occurred during selected text summarization. Please try again later.'
    summaryState.lastSummaryTypeDisplayed = 'selectedText'
  } finally {
    summaryState.isSelectedTextLoading = false
  }
}
