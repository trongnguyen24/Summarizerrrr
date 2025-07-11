<!-- @ts-nocheck -->
<script>
  import { saveSummaryToArchive } from '@/stores/summaryStore.svelte'

  let { summaryContent, summaryType } = $props()
</script>

<button
  class="py-1 px-4 bg-blackwhite/5 hover:bg-blackwhite/10 rounded-md"
  onclick={() => saveSummaryToArchive(summaryContent, summaryType)}
>
  Save to Archive
</button>
