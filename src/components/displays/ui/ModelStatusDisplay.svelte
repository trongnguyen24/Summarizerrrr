<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'

  let { modelStatus } = $props()

  // Derive display values
  const hasModel = $derived(modelStatus?.currentModel)
  const isFallback = $derived(modelStatus?.isFallback)
  const currentModel = $derived(modelStatus?.currentModel)
  const fallbackFrom = $derived(modelStatus?.fallbackFrom)
</script>

{#if hasModel}
  <div class="model-status-container font-mono text-xs" role="status">
    <div class="flex gap-0.5">
      <div
        class={`${isFallback ? 'bg-amber-500' : 'bg-blue-500'} rounded-l-sm w-2`}
      ></div>
      <div
        class="flex relative overflow-hidden w-full px-3 py-1.5 gap-1 items-center bg-blackwhite/5"
      >
        <span
          class="size-4 rotate-45 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-surface-1"
        ></span>

        {#if isFallback}
          <!-- Fallback mode display -->
          <div class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Icon icon="solar:chart-2-linear" width="14" height="14" />
            <div class="flex flex-col gap-0">
              <span class="font-semibold leading-tight">Model switched</span>
              <span class="text-text-secondary leading-tight">
                {fallbackFrom}
                <Icon
                  icon="solar:arrow-right-linear"
                  class="inline-block mx-0.5"
                  width="12"
                  height="12"
                />
                <span class="text-amber-600 dark:text-amber-400"
                  >{currentModel}</span
                >
              </span>
            </div>
          </div>
        {:else}
          <!-- Normal mode display -->
          <div class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <Icon icon="solar:cpu-linear" width="14" height="14" />
            <div class="flex flex-col gap-0">
              <span class="font-semibold leading-tight">Using model</span>
              <span class="text-text-secondary leading-tight"
                >{currentModel}</span
              >
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
