<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let { modelStatus } = $props()

  // Determine display mode based on modelStatus
  const isFallback = $derived(modelStatus?.isFallback || false)
  const currentModel = $derived(modelStatus?.currentModel || null)
  const fallbackFrom = $derived(modelStatus?.fallbackFrom || null)

  // Color and icon based on mode
  const statusColor = $derived(isFallback ? 'amber' : 'blue')
  const iconName = $derived(isFallback ? 'lucide:trending-up' : 'lucide:cpu')
  const statusText = $derived(isFallback ? 'Model switched' : 'Using model')
  const statusSubtext = $derived(
    isFallback && fallbackFrom && currentModel
      ? `${fallbackFrom} → ${currentModel}`
      : currentModel || 'Loading...'
  )
</script>

{#if currentModel}
  <div class="model-status-container font-mono">
    <div class="flex w-full flex-col gap-2">
      <div class="flex gap-0.5">
        <div
          class="w-3 rounded-l-sm"
          class:bg-blue-500={statusColor === 'blue'}
          class:bg-amber-500={statusColor === 'amber'}
        ></div>
        <div
          class="flex relative overflow-hidden w-full px-4 py-2 gap-0 flex-col bg-blackwhite/5"
        >
          <span
            class="size-6 rotate-45 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-surface-1"
          ></span>
          <div
            class="font-bold flex items-center gap-2"
            class:text-blue-500={statusColor === 'blue'}
            class:text-amber-500={statusColor === 'amber'}
          >
            <Icon icon={iconName} class="size-4" />
            <span>{statusText}</span>
          </div>
          <div class="text-xs py-1 text-text-secondary">
            {statusSubtext}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .model-status-container {
    width: fit-content;
    margin: 0 auto;
  }
</style>
