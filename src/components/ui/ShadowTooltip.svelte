<script>
  import { fade, fly } from 'svelte/transition'
  import { getContext } from 'svelte'

  let { children, content, side = 'top', delay = 500 } = $props()

  // Try to get shared state from context
  const tooltipState = getContext('shadow-tooltip-state')

  // Local state for standalone usage
  let isVisible = $state(false)
  let timeoutId

  function show() {
    if (tooltipState) {
      tooltipState.triggerEnter(content)
    } else {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        isVisible = true
      }, delay)
    }
  }

  function hide() {
    if (tooltipState) {
      tooltipState.triggerLeave()
    } else {
      clearTimeout(timeoutId)
      isVisible = false
    }
  }

  let tooltipClasses = $derived(
    [
      'absolute z-50 py-1 text-xs text-muted font-medium text-mute shadow-lg  whitespace-nowrap pointer-events-none',
      side === 'bottom' ? 'top-full mt-2' : '',
      side === 'top' ? 'bottom-full mb-2' : '',
      side === 'left' ? 'right-full mr-1' : '',
      side === 'right' ? 'left-full ml-1' : '',
      side === 'top' || side === 'bottom' ? 'left-1/2 -translate-x-1/2' : '',
      side === 'left' || side === 'right' ? 'top-1/2 -translate-y-1/2' : '',
    ]
      .filter(Boolean)
      .join(' '),
  )
</script>

<div
  class="relative inline-flex"
  onmouseenter={show}
  onmouseleave={hide}
  role="tooltip"
>
  {@render children()}

  {#if !tooltipState && isVisible}
    <div
      class={tooltipClasses}
      in:fade={{ duration: 150 }}
      out:fade={{ duration: 0 }}
    >
      {content}
    </div>
  {/if}
</div>
