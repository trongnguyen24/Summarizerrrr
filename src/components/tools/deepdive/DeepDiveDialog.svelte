<script>
  // @ts-nocheck
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import {
    deepDiveState,
    toggleDeepDive,
  } from '@/stores/deepDiveStore.svelte.js'

  let { children } = $props()

  // Bind directly to store state
  let open = $derived(deepDiveState.isExpanded)

  /**
   * Handle dialog open/close state changes
   * Sync with store when dialog closes via overlay or ESC
   */
  function handleOpenChange(newOpen) {
    if (!newOpen && deepDiveState.isExpanded) {
      toggleDeepDive()
    }
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-surface-1" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade={{ duration: 200 }}></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>

    <Dialog.Content
      preventScroll={true}
      forceMount
      interactOutsideBehavior="ignore"
      class="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl 
             -translate-x-1/2 -translate-y-1/2 outline-hidden"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      {#snippet child({ props, open })}
        {#if open}
          <div
            {...props}
            transition:slideScaleFade={{
              duration: 300,
              slideFrom: 'bottom',
              slideDistance: '2rem',
              startScale: 0.95,
            }}
          >
            {@render children?.()}
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
