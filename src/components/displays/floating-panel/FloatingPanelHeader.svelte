<script>
  // @ts-nocheck
  let { onSummarize, isLoading, onClose, children } = $props()
</script>

<div class="panel-header">
  <span>Summary</span>
  <div class="header-buttons">
    <button
      onclick={onSummarize}
      disabled={isLoading}
      class="summarize-button"
      title="Summarize current page independently"
    >
      {isLoading ? 'Summarizing...' : 'Summarize (FP)'}
    </button>
    {#if children?.actionButton}
      {@render children.actionButton()}
    {/if}
    <button onclick={onClose} class="close-button" aria-label="Close"
      >&times;</button
    >
  </div>
</div>
