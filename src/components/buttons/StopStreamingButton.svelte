<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { stopStreaming } from '@/stores/summaryStore.svelte.js'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'

  // Props received from parent
  let { show = false } = $props()

  // Event handler to stop streaming
  const handleStop = () => {
    stopStreaming()
  }
</script>

{#if show}
  <button
    transition:slideScaleFade
    class="font-mono p-[1em] pl-[1.25em] pr-[1.5em] bg-red-500 hover:bg-red-600 text-white flex outline-offset-2 !outline-red-400 items-center rounded-full gap-[0.5em] w-fit h-[3em] transition-colors"
    onclick={handleStop}
    title="Stop Streaming"
  >
    <div class="relative z-10 size-[1.5em]">
      <Icon
        width={24}
        icon="mdi:stop-circle"
        class="absolute inset-0"
      />
    </div>
    <span class="z-10 text-[1.125em] font-medium">Stop</span>
  </button>
{/if}
