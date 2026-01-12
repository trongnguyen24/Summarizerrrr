export function createDefaultSummaryState() {
  return {
    summary: '',
    courseSummary: '',
    courseConcepts: '',
    isLoading: false,
    isCourseSummaryLoading: false,
    isCourseConceptsLoading: false,
    summaryError: null,
    courseSummaryError: null,
    courseConceptsError: null,
    isYouTubeVideoActive: false,
    isCourseVideoActive: false,
    currentContentSource: '',
    selectedTextSummary: '',
    isSelectedTextLoading: false,
    selectedTextError: null,
    lastSummaryTypeDisplayed: null,
    activeYouTubeTab: 'videoSummary',
    activeCourseTab: 'courseSummary',
    pageTitle: '',
    pageUrl: '',
    isArchived: false,
    currentActionType: 'summarize',
    customActionResult: '',
    isCustomActionLoading: false,
    customActionError: null,
    modelStatus: {
      currentModel: null,
      fallbackFrom: null,
      isFallback: false,
    },
    abortController: null,
  }
}

export function createDefaultDeepDiveState() {
  return {
    isExpanded: false,
    isGenerating: false,
    isPreloading: false,
    questions: [],
    hasGenerated: false,
    error: null,
    lastSummaryContent: '',
    lastPageTitle: '',
    lastPageUrl: '',
    lastSummaryLang: 'English',
    customQuestion: '',
    selectedQuestion: null,
    questionHistory: [],
    currentPageIndex: 0,
  }
}
