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
      const { exportMarkdownToZip, generateMarkdownExportFilename } =
        await import('@/lib/exportImport/exportService.js')

      // Export with progress callback
      const zipBlob = await exportMarkdownToZip((progress) => {
        console.log(`[Export Markdown] ${progress.message}`)
      })

      const filename = generateMarkdownExportFilename()

      // Use File System Access API if available (Chrome/Edge)
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: 'ZIP Archive',
                accept: { 'application/zip': ['.zip'] },
              },
            ],
          })
          const writable = await handle.createWritable()
          await writable.write(zipBlob)
          await writable.close()
          console.log(
            '[ExportMarkdownFAB] Markdown files exported successfully!'
          )
          return
        } catch (err) {
          // User cancelled the save dialog
          if (err.name === 'AbortError') {
            console.log('[ExportMarkdownFAB] Export cancelled by user')
            return
          }
          throw err
        }
      }

      // Fallback for browsers that don't support File System Access API
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

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
