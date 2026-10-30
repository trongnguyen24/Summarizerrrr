<script>
  // @ts-nocheck
  import ExportImport from '@/entrypoints/settings/components/ExportImport.svelte'
  import CloudSyncToolSettings from '@/entrypoints/settings/components/tools/CloudSyncToolSettings.svelte'
</script>

<div class=" flex flex-col gap-8 py-6">
  <div class="px-5">
    <CloudSyncToolSettings />
  </div>

  <div class="border-t border-border/50 pt-4">
    <ExportImport />
  </div>
</div>
