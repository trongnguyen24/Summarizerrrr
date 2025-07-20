<script>
  // @ts-nocheck
  import TabNavigation from '../TabNavigation.svelte'
  import CourseVideoSummary from './CourseVideoSummary.svelte'
  import CourseConceptsDisplay from './CourseConceptsDisplay.svelte'
  import {
    summaryState,
    updateActiveCourseTab,
  } from '../../stores/summaryStore.svelte.js'

  let { activeCourseTab } = $props()

  function selectCourseTab(tabName) {
    updateActiveCourseTab(tabName)
  }

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
      isLoading: summaryState.isCourseConceptsLoading, // Sử dụng trạng thái loading riêng cho Concepts
    },
  ])
</script>

<div class="course-summary-container">
  <TabNavigation
    tabs={courseTabs}
    activeTab={activeCourseTab}
    onSelectTab={selectCourseTab}
  />

  <div class="course-content mt-6">
    <div hidden={activeCourseTab !== 'courseSummary'}>
      <CourseVideoSummary
        summary={summaryState.courseSummary}
        isLoading={summaryState.isCourseSummaryLoading}
        error={summaryState.courseSummaryError}
      />
    </div>
    <div hidden={activeCourseTab !== 'courseConcepts'}>
      <CourseConceptsDisplay
        courseConcepts={summaryState.courseConcepts}
        isCourseLoading={summaryState.isCourseConceptsLoading}
        courseConceptsError={summaryState.courseConceptsError}
      />
    </div>
  </div>
</div>
