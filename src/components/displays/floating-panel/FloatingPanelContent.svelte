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
    chapterSummary,
    isChapterLoading,
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
        '[FloatingPanelContent] Display selected: YouTubeSummaryDisplayFP'
      )
      return YouTubeSummaryDisplayFP
    }
    if (t === 'course') {
      console.log(
        '[FloatingPanelContent] Display selected: CourseSummaryDisplayFP'
      )
      return CourseSummaryDisplayFP
    }
    console.log(
      '[FloatingPanelContent] Display selected: GenericSummaryDisplayFP (fallback)'
    )
    return GenericSummaryDisplayFP
  }

  // Derived component để render
  let DisplayComponent = $derived(selectDisplay(contentType || 'general'))
</script>

<div class="panel-content">
  <div class="prose text-base mx-auto px-6 py-8">
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
        {chapterSummary}
        isLoading={status === 'loading'}
        {isChapterLoading}
        {activeYouTubeTab}
        onSelectTab={onSelectYouTubeTab}
        {summarization}
      />
    {:else if summary}
      <DisplayComponent
        {summary}
        isLoading={status === 'loading'}
        loadingText="Processing summary..."
        targetId="fp-generic-summary"
        {summarization}
      />
    {:else if status === 'loading'}
      <p class="text-center text-text-secondary animate-pulse">
        Processing summary...
      </p>
    {:else}
      <!-- <p>No summary available.</p> -->
    {/if}
  </div>
</div>
