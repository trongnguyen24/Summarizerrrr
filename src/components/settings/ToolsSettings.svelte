<script>
  // @ts-nocheck
  import DeepDiveToolSettings from './tools/DeepDiveToolSettings.svelte'
  import CloudSyncToolSettings from './tools/CloudSyncToolSettings.svelte'
</script>

<div class="setting-block flex gap-6 px-5 pt-1 pb-20 flex-col">
  <DeepDiveToolSettings />
  <div>
    <hr class="border-border/50" />
    <hr class="border-border/50" />
  </div>

  <CloudSyncToolSettings />
</div>
