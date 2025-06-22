<script>
  import { Dialog } from 'bits-ui'
  import Setting from './Setting.svelte'
  import { fade, fly } from 'svelte/transition'

  let { open = $bindable() } = $props()
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      class="outline-hidden fixed left-[50%] top-0 z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%]  sm:max-w-[490px] md:w-full"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fly>
            <Setting />
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
