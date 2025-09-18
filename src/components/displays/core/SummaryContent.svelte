<script>
  // @ts-nocheck
  import StreamingMarkdownV2 from '../ui/StreamingMarkdownV2.svelte'
  import FoooterDisplay from '../ui/FoooterDisplay.svelte'
  import TOC from '@/components/navigation/TOC.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js' // Import settings

  let { summary, isLoading, targetId, showTOC = false } = $props()

  let isMarkdownRendered = $state(false)

  function handleMarkdownFinishTyping() {
    isMarkdownRendered = true
  }
</script>

<div id={targetId}>
  <StreamingMarkdownV2
    sourceMarkdown={summary}
    onFinishTyping={handleMarkdownFinishTyping}
    enableCursor={settings.enableStreaming}
    enableHighlight={true}
    class="custom-markdown-style"
  />
</div>
{#if !isLoading && isMarkdownRendered}
  <FoooterDisplay
    summaryContent={summary}
    summaryTitle={summaryState.pageTitle}
    {targetId}
  />
{/if}
<span id="footer"></span>
{#if showTOC}
  <TOC targetDivId={targetId} />
{/if}
