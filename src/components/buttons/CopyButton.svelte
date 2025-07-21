<!-- @ts-nocheck -->
<script>
  import { Tooltip } from 'bits-ui'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/slideScaleFade'

  let { targetId = 'copy-cat' } = $props()

  let isCopied = $state(false)

  async function copyToClipboard() {
    const element = document.getElementById(targetId)
    if (!element) {
      console.error(`Element with id "${targetId}" not found`)

      return
    }

    // Create a temporary element to hold the formatted content
    const tempElement = document.createElement('div')
    tempElement.appendChild(element.cloneNode(true)) // Clone the element to preserve formatting
    tempElement.style.position = 'absolute'
    tempElement.style.left = '-9999px'
    document.body.appendChild(tempElement)

    // Select the content
    const selection = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(tempElement)
    selection.removeAllRanges()
    selection.addRange(range)

    try {
      // Copy the selected content to the clipboard
      document.execCommand('copy')
      isCopied = true
      setTimeout(() => {
        isCopied = false
      }, 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
      // Optionally, display an error message to the user
    }

    // Clean up the temporary element
    document.body.removeChild(tempElement)
    selection.removeAllRanges()
  }
</script>

<Tooltip.Provider>
  <Tooltip.Root disableCloseOnTriggerClick delayDuration={100}>
    <Tooltip.Trigger
      onclick={copyToClipboard}
      class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200"
    >
      {#if isCopied}
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
          <Icon icon="heroicons:square-2-stack" width="20" height="20" />
        </span>
      {/if}
    </Tooltip.Trigger>
    <Tooltip.Content forceMount sideOffset={6}>
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div
              class="py-1.5 px-2 font-mono text-xs bg-surface-2 rounded-sm dark:bg-surface-1"
              transition:slideScaleFade={{
                duration: 200,
                slideFrom: 'bottom',
                startScale: 0.95,
                slideDistance: '0.25rem',
              }}
              {...props}
            >
              {isCopied ? 'Copied!' : 'Copy to clipboard'}
            </div>
          </div>
        {/if}
      {/snippet}
    </Tooltip.Content>
  </Tooltip.Root>
</Tooltip.Provider>
