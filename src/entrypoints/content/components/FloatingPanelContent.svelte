<script>
  // @ts-nocheck
  import YouTubeSummaryDisplayFP from '@/components/displays/YouTubeSummaryDisplayFP.svelte'
  import CourseSummaryDisplayFP from '@/components/displays/CourseSummaryDisplayFP.svelte'
  import GenericSummaryDisplayFP from '@/components/displays/GenericSummaryDisplayFP.svelte'

  let {
    status,
    summary,
    error,
    contentType,
    chapterSummary,
    isChapterLoading,
    courseConcepts,
    isCourseConceptsLoading,
    activeYouTubeTab,
    activeCourseTab,
    onSelectYouTubeTab,
    onSelectCourseTab,
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

<div class="panel-conten overflow-scroll">
  <div class="prose">
    {#if status === 'loading'}
      <p>Loading... (FloatingPanel)</p>
    {:else if status === 'error'}
      <p>Error: {error?.message || 'An error occurred.'}</p>
    {:else if summary}
      {#if contentType === 'youtube'}
        <DisplayComponent
          {summary}
          {chapterSummary}
          isLoading={status === 'loading'}
          {isChapterLoading}
          {activeYouTubeTab}
          onSelectTab={onSelectYouTubeTab}
        />
      {:else if contentType === 'course'}
        <DisplayComponent
          courseSummary={summary}
          {courseConcepts}
          isCourseSummaryLoading={status === 'loading'}
          {isCourseConceptsLoading}
          {activeCourseTab}
          onSelectTab={onSelectCourseTab}
        />
      {:else}
        <DisplayComponent
          {summary}
          isLoading={status === 'loading'}
          loadingText="Processing summary..."
          targetId="fp-generic-summary"
        />
      {/if}
    {:else}
      <p>No summary available.</p>
    {/if}
  </div>
</div>
