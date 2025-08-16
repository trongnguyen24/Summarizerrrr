<script>
  // @ts-nocheck
  import SaveToArchiveFromHistoryButton from '@/components/buttons/SaveToArchiveFromHistoryButton.svelte'
  import CopyButton from '@/components/buttons/CopyButton.svelte'
  import DownloadButton from '@/components/buttons/DownloadButton.svelte'

  let { selectedSummary, currentSummary, activeTab } = $props()
</script>

<div
  id="footer"
  class="w-fit mx-auto relative mt-12 flex justify-center items-center gap-2"
>
  <div class="absolute left-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none">
      <path d="M4 0h1v9H4z" fill="currentColor" />
      <path d="M9 4v1H0V4z" fill="currentColor" />
    </svg>
  </div>
  <span class="h-px w-20 bg-border/70"></span>

  {#if currentSummary && activeTab !== 'archive'}
    <SaveToArchiveFromHistoryButton {selectedSummary} />
  {/if}

  {#if currentSummary}
    <CopyButton />
    <DownloadButton
      content={currentSummary.content}
      title={selectedSummary.title}
    />
  {/if}

  <span class="h-px w-20 bg-border/70"></span>
  <div class="absolute right-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none">
      <path d="M4 0h1v9H4z" fill="currentColor" />
      <path d="M9 4v1H0V4z" fill="currentColor" />
    </svg>
  </div>
</div>
