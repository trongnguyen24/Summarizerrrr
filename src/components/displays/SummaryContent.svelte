<script>
  // @ts-nocheck
  import StreamingMarkdown from '../StreamingMarkdown.svelte'
  import FoooterDisplay from './FoooterDisplay.svelte'
  import TOC from '../TOC.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js' // Import settings

  let { summary, isLoading, targetId, showTOC = false } = $props()

  let isMarkdownRendered = $state(false)

  function handleMarkdownFinishTyping() {
    isMarkdownRendered = true
  }
</script>

<div id={targetId}>
  <StreamingMarkdown
    sourceMarkdown={summary}
    speed={settings.enableStreaming ? 50 : 0}
    instantDisplay={!settings.enableStreaming}
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
{#if showTOC}
  <TOC targetDivId={targetId} />
{/if}
