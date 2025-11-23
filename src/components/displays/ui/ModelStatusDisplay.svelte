<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade'

  let { modelStatus } = $props()

  const currentModel = $derived(modelStatus?.currentModel || null)
</script>

{#if currentModel}
  <div
    class="flex items-center gap-1.5 text-xs text-text-secondary bg-blackwhite/5 px-2 py-1 rounded-md w-fit mx-auto font-mono"
    transition:slideScaleFade={{
      duration: 300,
      slideFrom: 'left',
      slideDistance: '0',
      startScale: 0.8,
      startBlur: 2,
    }}
  >
    <Icon icon="lucide:cpu" class="size-3.5" />
    <span>{currentModel}</span>
  </div>
{/if}
