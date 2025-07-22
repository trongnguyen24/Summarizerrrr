<!-- @ts-nocheck -->
<script>
  import { Tooltip } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/slideScaleFade'

  let { content, title = 'summary' } = $props()
  let isDownloaded = $state(false)

  function downloadAsMarkdown() {
    if (!content) {
      console.error('No summary content available to download.')
      // Optionally, display an error message to the user
      return
    }

    // Sanitize title to create a readable filename
    const sanitizedTitle = title
      .replace(/[\/\\:*?"<>|]/g, '') // Remove invalid filename characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^\w\-\.]/g, '') // Remove other special chars except word chars, hyphens, dots
      .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 100) // Limit filename length
    const filename = `${sanitizedTitle || 'summary'}.md`

    const blob = new Blob([content], {
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

    isDownloaded = true
    setTimeout(() => {
      isDownloaded = false
    }, 2000)
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root disableCloseOnTriggerClick delayDuration={100}>
    <Tooltip.Trigger
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
    </Tooltip.Trigger>
    <Tooltip.Content forceMount sideOffset={6}>
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div
              class="py-1.5 px-2 font-mono text-xs bg-surface-2 rounded-sm"
              transition:slideScaleFade={{
                duration: 200,
                slideFrom: 'bottom',
                startScale: 0.95,
                slideDistance: '0.25rem',
              }}
              {...props}
            >
              {isDownloaded ? 'Downloaded!' : 'Download as Markdown'}
            </div>
          </div>
        {/if}
      {/snippet}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
