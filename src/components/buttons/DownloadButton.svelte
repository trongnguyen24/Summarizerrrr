<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import Icon, { loadIcons } from '@iconify/svelte'

  import { slideScaleFade } from '../../lib/ui/slideScaleFade.js'
  import ShadowTooltip from '../../lib/components/ShadowTooltip.svelte'

  let {
    content,
    title = 'summary',
    sourceUrl = null,
    sourceTitle = null,
  } = $props()
  let isDownloaded = $state(false)

  loadIcons(['heroicons:check-circle-solid', 'heroicons:arrow-down-tray'])

  async function downloadAsMarkdown() {
    if (!content) {
      console.error('No summary content available to download.')
      // Optionally, display an error message to the user
      return
    }

    // Create metadata section if sourceUrl is provided
    let metadataSection = ''
    if (sourceUrl) {
      const displayTitle = sourceTitle || title || 'Page'
      metadataSection = `**Source**: [${displayTitle}](${sourceUrl})\n\n---\n\n`
    }

    // Combine metadata and content
    const contentWithMetadata = metadataSection + content

    // Sanitize title to create a readable filename
    const sanitizedTitle = title
      .replace(/[\/\\:*?"<>|]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^\w\-\.]/g, '') // Remove other special chars except word chars, hyphens, dots
      .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100) // Limit filename length
    const filename = `${sanitizedTitle || 'summary'}.md`

    try {
      // Check if File System Access API is supported
      if ('showSaveFilePicker' in window) {
        const blob = new Blob([contentWithMetadata], {
          type: 'text/markdown;charset=utf-8',
        })

        const options = {
          suggestedName: filename,
          types: [
            {
              description: 'Markdown Files',
              accept: {
                'text/markdown': ['.md'],
              },
            },
          ],
        }

        const fileHandle = await window.showSaveFilePicker(options)
        const writable = await fileHandle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        // Fallback for browsers that don't support File System Access API
        const blob = new Blob([contentWithMetadata], {
          type: 'text/markdown;charset=utf-8',
        })
        const url = URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        URL.revokeObjectURL(url)
      }

      isDownloaded = true
      setTimeout(() => {
        isDownloaded = false
      }, 2000)
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error downloading file:', error)
      }
    }
  }
</script>

<ShadowTooltip
  content={isDownloaded ? $t('button.downloaded') : $t('button.download')}
>
  <button
    onclick={downloadAsMarkdown}
    class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200"
  >
    {#if isDownloaded}
      <span
        class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
        transition:slideScaleFade={{
          duration: 300,
          slideFrom: 'bottom',
          startScale: 0.4,
          slideDistance: '0rem',
        }}
      >
        <Icon icon="heroicons:check-circle-solid" width="20" height="20" />
      </span>
    {:else}
      <span
        class="text-text-primary absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2"
        transition:slideScaleFade={{
          duration: 300,
          slideFrom: 'bottom',
          startScale: 0.4,
          slideDistance: '0rem',
        }}
      >
        <Icon icon="heroicons:arrow-down-tray" width="20" height="20" />
      </span>
    {/if}
  </button>
</ShadowTooltip>
