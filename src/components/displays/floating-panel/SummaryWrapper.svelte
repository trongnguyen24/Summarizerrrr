<script>
  // @ts-nocheck
  import PlusIcon from '@/components/icons/PlusIcon.svelte'
  import ModelStatusDisplay from '@/components/displays/ui/ModelStatusDisplay.svelte'
  import { summaryState } from '@/stores/summaryStore.svelte.js'

  let {
    isLoading,
    data,
    error,
    loadingText,
    errorTitle,
    children,
    'no-data': noDataSlot,
  } = $props()
</script>

<div class="flex flex-col gap-4">
  {#if isLoading && !data}
    <div class="flex flex-col gap-3 py-4 items-center">
      <div
        class="text-center px-2 mx-auto text-text-secondary w-fit animate-pulse"
      >
        {loadingText || 'Loading...'}
      </div>
      <ModelStatusDisplay modelStatus={summaryState.modelStatus} />
    </div>
  {:else if error}
    <div
      class="flex relative flex-col w-fit mx-auto text-red-400 px-4 bg-red-500/10 border border-red-500/20"
    >
      <p class="text-sm">
        <span class="font-bold block">{errorTitle || 'Error'}</span>
        {error}
      </p>
      <PlusIcon color="red" position="top-left" />
      <PlusIcon color="red" position="bottom-right" />
    </div>
  {:else if data}
    {@render children()}
  {:else if noDataSlot}
    {@render noDataSlot()}
  {/if}
</div>
