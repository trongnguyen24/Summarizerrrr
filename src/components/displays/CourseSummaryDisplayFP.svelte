<script>
  // @ts-nocheck
  import TabbedSummaryDisplay from './TabbedSummaryDisplay.svelte'
  import GenericSummaryDisplayFP from './GenericSummaryDisplayFP.svelte'
  import TOC from '@/components/navigation/TOC.svelte'

  let {
    courseSummary = '',
    courseConcepts = '',
    isCourseSummaryLoading = false,
    isCourseConceptsLoading = false,
    activeCourseTab = 'courseSummary',
    onSelectTab = null,
  } = $props()

  const courseTabs = $derived([
    {
      id: 'courseSummary',
      label: 'Summary',
      show: true,
      isLoading: isCourseSummaryLoading,
    },
    {
      id: 'courseConcepts',
      label: 'Concepts',
      show: true,
      isLoading: isCourseConceptsLoading,
    },
  ])

  function handleSelectTab(tabId) {
    onSelectTab?.(tabId)
  }
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
  onSelectTab={handleSelectTab}
>
  <div hidden={activeCourseTab !== 'courseSummary'}>
    <GenericSummaryDisplayFP
      summary={courseSummary}
      isLoading={isCourseSummaryLoading}
      loadingText="Processing main Course summary..."
      targetId="fp-course-video-summary-display"
    />
    {#if activeCourseTab === 'courseSummary' && !isCourseSummaryLoading && courseSummary}
      <TOC targetDivId="fp-course-video-summary-display" />
    {/if}
  </div>
  <div hidden={activeCourseTab !== 'courseConcepts'}>
    <GenericSummaryDisplayFP
      summary={courseConcepts}
      isLoading={isCourseConceptsLoading}
      loadingText="Processing Course Concepts..."
      targetId="fp-course-concepts-display"
      {noDataContent}
    />
    {#if activeCourseTab === 'courseConcepts' && !isCourseConceptsLoading && courseConcepts}
      <TOC targetDivId="fp-course-concepts-display" />
    {/if}
  </div>
</TabbedSummaryDisplay>
