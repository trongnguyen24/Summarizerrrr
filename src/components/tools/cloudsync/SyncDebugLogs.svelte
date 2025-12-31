<script>
  let { debugLogs = [] } = $props()
</script>

<div
  class="bg-background border thin-scroll border-border rounded p-2 h-32 overflow-y-auto font-mono text-[10px] space-y-1"
>
  {#if debugLogs && debugLogs.length > 0}
    {#each debugLogs as log}
      <div
        class={log.type === 'error'
          ? 'text-red-500'
          : log.type === 'success'
            ? 'text-green-500'
            : 'text-text-secondary'}
      >
        <span class="opacity-50">[{log.time}]</span>
        {log.msg}
      </div>
    {/each}
  {:else}
    <div class="text-muted italic">No logs yet... Try clicking Sync Now.</div>
  {/if}
</div>
