<script>
  // @ts-nocheck
  import YouTubeSummaryDisplayFP from '@/components/displays/floating-panel/YouTubeSummaryDisplayFP.svelte'
  import CourseSummaryDisplayFP from '@/components/displays/floating-panel/CourseSummaryDisplayFP.svelte'
  import GenericSummaryDisplayFP from '@/components/displays/floating-panel/GenericSummaryDisplayFP.svelte'
  import ErrorDisplay from '@/components/displays/ui/ErrorDisplay.svelte'

  let {
    status,
    summary,
    error,
    contentType,
    courseConcepts,
    isCourseSummaryLoading,
    isCourseConceptsLoading,
    activeYouTubeTab,
    activeCourseTab,
    onSelectYouTubeTab,
    onSelectCourseTab,
    summarization,
  } = $props()

  /**
   * Chọn display component dựa trên contentType
   */
  function selectDisplay(type) {
    const t = (type || '').toLowerCase()
    if (t === 'youtube') {
      console.log(
        '[FloatingPanelContent] Display selected: YouTubeSummaryDisplayFP',
      )
      return YouTubeSummaryDisplayFP
    }
    if (t === 'course') {
      console.log(
        '[FloatingPanelContent] Display selected: CourseSummaryDisplayFP',
      )
      return CourseSummaryDisplayFP
    }
    console.log(
      '[FloatingPanelContent] Display selected: GenericSummaryDisplayFP (fallback)',
    )
    return GenericSummaryDisplayFP
  }

  // Derived component để render
  let DisplayComponent = $derived(selectDisplay(contentType || 'general'))

  // Derived loading text
  let loadingText = $derived(() => {
    const action = summarization.localSummaryState().loadingAction
    if (action === 'comments') return 'Processing comments...'
    if (action === 'chapters') return 'Processing chapters...'
    if (action === 'analyze') return 'Analyzing content...'
    if (action === 'explain') return 'Explaining content...'
    if (action === 'debate') return 'Debating content...'
    if (contentType === 'youtube') return 'Processing YouTube summary...'
    if (contentType === 'course') return 'Processing course summary...'
    return 'Processing summary...'
  })
</script>

<div class="panel-content">
  <div class="prose text-base mx-auto px-6">
    {#if status === 'error'}
      <ErrorDisplay {error} />
    {:else if contentType === 'course'}
      <DisplayComponent
        courseSummary={summary}
        {courseConcepts}
        {isCourseSummaryLoading}
        {isCourseConceptsLoading}
        {activeCourseTab}
        onSelectTab={onSelectCourseTab}
        {summarization}
      />
    {:else if contentType === 'youtube'}
      <DisplayComponent
        {summary}
        isLoading={status === 'loading'}
        loadingText={loadingText()}
        {summarization}
      />
    {:else if summary || status === 'loading'}
      <DisplayComponent
        {summary}
        isLoading={status === 'loading'}
        loadingText={loadingText()}
        targetId="fp-generic-summary"
        {summarization}
      />
    {:else}
      <!-- <p>No summary available.</p> -->
    {/if}
  </div>
</div>
