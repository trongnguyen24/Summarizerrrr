<script>
  // @ts-nocheck
  import GenericSummaryDisplay from '../core/GenericSummaryDisplay.svelte'
  import { summaryState } from '../../../stores/summaryStore.svelte.js'
</script>

<GenericSummaryDisplay
  summary={summaryState.courseSummary}
  isLoading={summaryState.isCourseSummaryLoading}
  loadingText="Processing main Course summary..."
  targetId="course-video-summary-display"
/>
