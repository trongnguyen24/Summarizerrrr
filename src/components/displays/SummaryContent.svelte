<script>
  // @ts-nocheck
  import StreamingMarkdown from '../StreamingMarkdown.svelte';
  import FoooterDisplay from './FoooterDisplay.svelte';
  import TOC from '../TOC.svelte';
  import { summaryState } from '@/stores/summaryStore.svelte';
  import hljs from 'highlight.js';

  let { summary, isLoading, targetId, showTOC = false } = $props();

  let isMarkdownRendered = $state(false);

  function handleMarkdownFinishTyping() {
    isMarkdownRendered = true;
  }

  $effect(() => {
    if (summary && !isLoading) {
      document.querySelectorAll(`#${targetId} pre code`).forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  });
</script>

<div id={targetId}>
  <StreamingMarkdown
    sourceMarkdown={summary}
    speed={1}
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
  {#if showTOC}
    <TOC {targetId} />
  {/if}
{/if}