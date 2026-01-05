<!-- @ts-nocheck -->
<script>
  import SaveToArchiveButtonFP from '@/components/buttons/SaveToArchiveButtonFP.svelte'
  import CopyButtonFP from '@/components/buttons/CopyButton.svelte'
  import CopyMarkdownButton from '@/components/buttons/CopyMarkdownButton.svelte'
  import DownloadButtonFP from '@/components/buttons/DownloadButton.svelte'

  let { localSummaryState, onSave, summaryContent, summaryTitle, targetId } =
    $props()
</script>

<div
  class="w-fit mx-auto relative mt-12 pb-16 flex justify-center items-center gap-1.5"
>
  <div class="absolute left-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
      ><path d="M4 0h1v9H4z" fill="currentColor" /><path
        d="M9 4v1H0V4z"
        fill="currentColor"
      /></svg
    >
  </div>
  <span class="h-px w-16 bg-border/70"></span>
  <SaveToArchiveButtonFP {localSummaryState} {onSave} />
  <CopyButtonFP {targetId} />
  <CopyMarkdownButton text={summaryContent} />
  <DownloadButtonFP
    content={summaryContent}
    title={summaryTitle}
    sourceUrl={localSummaryState.pageUrl}
    sourceTitle={localSummaryState.pageTitle}
  />
  <span class="h-px w-16 bg-border/70"></span>
  <div class="absolute right-0">
    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" fill="none"
      ><path d="M4 0h1v9H4z" fill="currentColor" /><path
        d="M9 4v1H0V4z"
        fill="currentColor"
      /></svg
    >
  </div>
</div>
