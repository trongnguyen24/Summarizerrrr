<script>
  // @ts-nocheck
  import BaseTabbedSummaryDisplay from '../core/BaseTabbedSummaryDisplay.svelte'
  import {
    summaryState,
    updateActiveCourseTab,
  } from '../../../stores/summaryStore.svelte.js'

  let { activeCourseTab } = $props()

  const courseTabs = $derived([
    {
      id: 'courseSummary',
      label: 'Summary',
      show: true,
      isLoading: summaryState.isCourseSummaryLoading,
    },
    {
      id: 'courseConcepts',
      label: 'Concepts',
      show: true,
      isLoading: summaryState.isCourseConceptsLoading,
    },
  ])

  const summaryData = $derived({
    courseSummary: {
      summary: summaryState.courseSummary,
      isLoading: summaryState.isCourseSummaryLoading,
      loadingText: 'Processing main Course summary...',
      targetId: 'course-video-summary-display',
    },
    courseConcepts: {
      summary: summaryState.courseConcepts,
      isLoading: summaryState.isCourseConceptsLoading,
      loadingText: 'Processing Course Concepts...',
      targetId: 'course-concepts-display',
    },
  })
</script>

{#snippet noDataContent()}
  <div class="text-text-secondary text-center p-4">
    <p>No Course concepts available yet.</p>
    <p>
      Click the "Summarize" button to generate concepts for this Course lecture.
    </p>
  </div>
{/snippet}

<BaseTabbedSummaryDisplay
  tabs={courseTabs}
  activeTab={activeCourseTab}
  onSelectTab={updateActiveCourseTab}
  {summaryData}
  {noDataContent}
/>
