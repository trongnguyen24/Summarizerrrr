<script>
  // @ts-nocheck
  import TabbedSummaryDisplay from './TabbedSummaryDisplay.svelte'
  import GenericSummaryDisplay from './GenericSummaryDisplay.svelte'
  import TOC from '../TOC.svelte'
  import {
    summaryState,
    updateActiveCourseTab,
  } from '../../stores/summaryStore.svelte.js'

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
</script>

{#snippet noDataContent()}
  <div class="text-text-secondary text-center p-4">
    <p>No Course concepts available yet.</p>
    <p>
      Click the "Summarize" button to generate concepts for this Course lecture.
    </p>
  </div>
{/snippet}

<TabbedSummaryDisplay
  tabs={courseTabs}
  activeTab={activeCourseTab}
  onSelectTab={updateActiveCourseTab}
>
  <div hidden={activeCourseTab !== 'courseSummary'}>
    <GenericSummaryDisplay
      summary={summaryState.courseSummary}
      isLoading={summaryState.isCourseSummaryLoading}
      loadingText="Processing main Course summary..."
      targetId="course-video-summary-display"
    />
    {#if activeCourseTab === 'courseSummary' && !summaryState.isCourseSummaryLoading}
      <TOC targetDivId="course-video-summary-display" />
    {/if}
  </div>
  <div hidden={activeCourseTab !== 'courseConcepts'}>
    <GenericSummaryDisplay
      summary={summaryState.courseConcepts}
      isLoading={summaryState.isCourseConceptsLoading}
      loadingText="Processing Course Concepts..."
      targetId="course-concepts-display"
      {noDataContent}
    />
    {#if activeCourseTab === 'courseConcepts' && !summaryState.isCourseConceptsLoading}
      <TOC targetDivId="course-concepts-display" />
    {/if}
  </div>
</TabbedSummaryDisplay>
