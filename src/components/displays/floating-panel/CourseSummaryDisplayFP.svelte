<script>
  // @ts-nocheck
  import GenericSummaryDisplayFP from './GenericSummaryDisplayFP.svelte'

  let {
    courseSummary = '',
    isCourseSummaryLoading = false,
    summarization,
  } = $props()
</script>

<GenericSummaryDisplayFP
  summary={courseSummary}
  isLoading={isCourseSummaryLoading}
  loadingText="Processing main Course summary..."
  targetId="fp-course-video-summary-display"
  {summarization}
/>
