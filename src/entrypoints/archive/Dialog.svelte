<script>
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '@/lib/slideScaleFade.js'

  let {
    open = $bindable(false),
    children,
    contentProps,
    ...restProps
  } = $props()
</script>

<Dialog.Root bind:open {...restProps}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      interactOutsideBehavior="ignore"
      preventScroll={true}
      forceMount
      class="outline-hidden fixed left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-5xl z-50 -translate-y-1/2 translate-x-[-50%]"
      {...contentProps}
      onOpenAutoFocus={(e) => {
        e.preventDefault()
        nameInput?.focus()
      }}
    >
      {#snippet child({ props, open })}
        {#if open}
          <div
            {...props}
            transition:slideScaleFade={{
              duration: 300,
              slideFrom: 'bottom',
              slideDistance: '0rem',
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
