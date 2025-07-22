<script>
  // @ts-nocheck
  import StreamingMarkdown from '../StreamingMarkdown.svelte'
  import FoooterDisplay from './FoooterDisplay.svelte'
  import TOC from '../TOC.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'

  let { summary, isLoading, targetId, showTOC = false } = $props()

  let isMarkdownRendered = $state(false)

  function handleMarkdownFinishTyping() {
    isMarkdownRendered = true
  }
</script>

<div id={targetId}>
  <StreamingMarkdown
    sourceMarkdown={summary}
    speed={50}
    onFinishTyping={handleMarkdownFinishTyping}
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
<TOC targetDivId={targetId} />
