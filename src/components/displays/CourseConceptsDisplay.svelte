<!-- @ts-nocheck -->
<script>
  import StreamingMarkdown from '../StreamingMarkdown.svelte'
  import FoooterDisplay from './FoooterDisplay.svelte'
  import PlusIcon from '../PlusIcon.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'

  let { courseConcepts, isCourseLoading, courseConceptsError } = $props()

  let isMarkdownRendered = $state(false)

  function handleMarkdownFinishTyping() {
    isMarkdownRendered = true
  }
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
    <div id="course-concepts-display">
      <StreamingMarkdown
        sourceMarkdown={courseConcepts}
        speed={1}
        onFinishTyping={handleMarkdownFinishTyping}
      />
    </div>
    {#if !isCourseLoading && isMarkdownRendered}
      <FoooterDisplay
        summaryContent={courseConcepts}
        summaryTitle={summaryState.pageTitle}
        targetId="course-concepts-display"
      />
    {/if}
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
