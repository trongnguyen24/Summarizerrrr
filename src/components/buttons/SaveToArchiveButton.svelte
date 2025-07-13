<!-- @ts-nocheck -->
<script>
  import { saveAllGeneratedSummariesToArchive } from '@/stores/summaryStore.svelte'
</script>

<button
  class="py-1 px-4 bg-blackwhite/5 hover:bg-blackwhite/10 rounded-md"
  onclick={saveAllGeneratedSummariesToArchive}
>
  Lưu vào Lưu trữ
</button>
