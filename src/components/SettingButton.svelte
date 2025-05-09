<script>
  import Icon from '@iconify/svelte'
  import Setting from './Setting.svelte' // Assuming Setting.svelte will also be refactored
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '../lib/slideScaleFade.js' // Corrected path if needed

  let isOpen = $state(false) // State for the dialog
</script>

<button
  onclick={() => (isOpen = true)}
  class="p-1 transition-colors hover:bg-surface-1 rounded-full hover:text-text-primary"
  title="Open settings"
>
  <Icon width={24} icon="heroicons:cog-6-tooth" />
</button>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden fixed left-[50%] top-4 w-[calc(100vw-32px)] max-w-lg z-50 translate-x-[-50%]"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:slideScaleFade>
            <div class="absolute z-50 right-3 top-2.5 group flex gap-2">
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                onclick={() => (isOpen = false)}
                class="block size-3.5 bg-error rounded-full"
              >
                <Icon
                  class="text-red-800 transition-opacity duration-150"
                  width={14}
                  icon="heroicons:x-mark-16-solid"
                />
              </button>
            </div>
            <Setting />
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
