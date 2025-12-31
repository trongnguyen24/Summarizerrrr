<script>
  import { Dialog } from 'bits-ui'
  import { slideScaleFade, fadeOnly } from '@/lib/ui/slideScaleFade.js'

  let {
    open = $bindable(false),
    children,
    contentProps = {},
    overlayClass = '',
    contentClass = '',
    ...restProps
  } = $props()

  // Default classes
  const defaultOverlayClass = 'fixed inset-0 z-[99] bg-black/80'
  const defaultContentClass =
    'outline-hidden fixed flex justify-center left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-5xl z-[150] -translate-y-1/2 translate-x-[-50%]'

  // Merge classes - user classes override defaults
  const finalOverlayClass = overlayClass || defaultOverlayClass
  const finalContentClass = contentClass || defaultContentClass
</script>

<Dialog.Root bind:open {...restProps}>
  <Dialog.Portal>
    <Dialog.Overlay class={finalOverlayClass} forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fadeOnly></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      preventScroll={true}
      forceMount
      class={finalContentClass}
      {...contentProps}
      onOpenAutoFocus={(e) => {
        e.preventDefault()
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
