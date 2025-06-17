<!-- @ts-nocheck -->
<script>
  import { summaryState } from '../../stores/summaryStore.svelte.js' // Keep for isUdemyConceptsLoading and udemyConcepts
  import PlusIcon from '../PlusIcon.svelte'
  import Toc from '../TOC.svelte'
  import TOC from '../TOC.svelte' // TOC is in src/components

  let { udemyConcepts, isUdemyLoading, udemyConceptsError } = $props()
</script>

<div class="flex flex-col gap-4">
  {#if isUdemyLoading && udemyConcepts === ''}
    <div
      class="text-center p-4 mx-auto text-text-secondary w-fit animate-pulse"
    >
      Processing Udemy Concepts...
    </div>
  {:else if udemyConceptsError}
    <div
      class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
    >
      <p class="text-sm">
        <span class="font-bold block">Udemy concepts error</span>
        {udemyConceptsError}
      </p>
      <PlusIcon color="red" position="top-left" />
      <PlusIcon color="red" position="bottom-right" />
    </div>
  {:else if udemyConcepts}
    <div id="udemy-summary">
      {@html udemyConcepts}
    </div>
    <Toc targetDivId="udemy-summary" />
  {:else}
    <div class="text-text-secondary text-center p-4">
      <p>No Udemy concepts available yet.</p>
      <p>
        Click the "Summarize" button to generate concepts for this Udemy
        lecture.
      </p>
    </div>
  {/if}
</div>
