<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let state = $state({
    isExporting: false,
    showTooltip: false,
  })

  async function handleExportMarkdown() {
    try {
      state.isExporting = true

      // Dynamic import to keep bundle size small
      const {
        exportMarkdownToZip,
        generateMarkdownExportFilename,
        downloadBlob,
      } = await import('@/lib/exportImport/exportService.js')

      // Export with progress callback
      const zipBlob = await exportMarkdownToZip((progress) => {
        console.log(`[Export Markdown] ${progress.message}`)
      })

      const filename = generateMarkdownExportFilename()

      // Use the existing downloadBlob utility
      await downloadBlob(zipBlob, filename)

      console.log('[ExportMarkdownFAB] Markdown files exported successfully!')
    } catch (error) {
      console.error('[ExportMarkdownFAB] Export failed:', error)
      alert(`Export failed: ${error.message}`)
    } finally {
      state.isExporting = false
    }
  }
</script>

<button
  class="group text-text-secondary w-full mt-1 px-3 mb-4 py-1.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed {state.isExporting
    ? 'cursor-wait'
    : 'hover:text-text-primary'}"
  onclick={handleExportMarkdown}
  disabled={state.isExporting}
  title="Export archives as Markdown"
>
  <div class="relative font-mono flex gap-1.5 items-center size-full">
    {#if state.isExporting}
      <Icon icon="svg-spinners:ring-resize" width="24" height="24" />
      Export all
    {:else}
      <Icon
        icon="heroicons:archive-box-arrow-down-solid"
        width="24"
        height="24"
      />
      Export all
    {/if}
  </div>
</button>

<style>
  button {
    backdrop-filter: blur(8px);
  }
</style>
