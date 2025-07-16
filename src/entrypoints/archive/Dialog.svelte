<script lang="ts">
  import type { Snippet } from 'svelte'
  import { Dialog, type WithoutChild } from 'bits-ui'

  type Props = Dialog.RootProps & {
    contentProps?: WithoutChild<Dialog.ContentProps>
    // ...other component props if you wish to pass them
  }

  let {
    open = $bindable(false),
    children,
    contentProps,
    ...restProps
  }: Props = $props()
</script>

<Dialog.Root bind:open {...restProps}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/80" />
    <Dialog.Content
      preventScroll={true}
      class="outline-hidden fixed left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-2xl z-50 -translate-y-1/2 translate-x-[-50%]"
      {...contentProps}
    >
      {@render children?.()}
      <!-- <Dialog.Close>Close Dialog</Dialog.Close> -->
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
