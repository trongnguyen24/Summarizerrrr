<!-- @ts-nocheck -->
<script>
  import { summaryState } from '../../stores/summaryStore.svelte.js' // Keep for isCourseConceptsLoading and courseConcepts
  import SaveToArchiveButton from '@/components/buttons/SaveToArchiveButton.svelte'
  import PlusIcon from '../PlusIcon.svelte'
  import Toc from '../TOC.svelte'
  import { marked } from 'marked'
  import hljs from 'highlight.js'

  let { courseConcepts, isCourseLoading, courseConceptsError } = $props()

  $effect(() => {
    if (courseConcepts && !isCourseLoading) {
      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block)
      })
    }
  })
</script>

<div class="flex flex-col gap-4">
  {#if isCourseLoading && courseConcepts === ''}
    <div
      class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse"
    >
      Processing Course Concepts...
    </div>
  {:else if courseConceptsError}
    <div
      class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
    >
      <p class="text-sm">
        <span class="font-bold block">Course concepts error</span>
        {courseConceptsError}
      </p>
      <PlusIcon color="red" position="top-left" />
      <PlusIcon color="red" position="bottom-right" />
    </div>
  {:else if courseConcepts}
    <div id="course-summary">
      {@html marked.parse(courseConcepts)}
      {#if summaryState.courseConcepts && summaryState.lastSummaryTypeDisplayed === 'course' && summaryState.activeCourseTab === 'courseConcepts'}
        <SaveToArchiveButton
          summaryContent={summaryState.courseConcepts}
          summaryType="courseConcepts"
        />
      {/if}
    </div>
    <Toc targetDivId="course-summary" />
  {:else}
    <div class="text-text-secondary text-center p-4">
      <p>No Course concepts available yet.</p>
      <p>
        Click the "Summarize" button to generate concepts for this Course
        lecture.
      </p>
    </div>
  {/if}
</div>
