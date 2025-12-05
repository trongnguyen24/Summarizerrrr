<script>
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import Icon from '@iconify/svelte'

  let {
    open = $bindable(false),
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
  } = $props()

  function handleConfirm() {
    onConfirm?.()
    open = false
  }

  function handleClose() {
    open = false
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-[999] bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden flex flex-col font-mono fixed left-[50%] top-1/2 w-[calc(100vw-32px)] max-w-md z-[1000] -translate-y-1/2 rounded-lg overflow-hidden shadow-lg translate-x-[-50%]"
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
            <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                class="block size-3.5 bg-error rounded-full"
                onclick={handleClose}
              >
                <Icon
                  class="text-red-800 transition-opacity duration-150"
                  width={14}
                  icon="heroicons:x-mark-16-solid"
                />
              </button>
            </div>
            <div class="px-4 text-xs top-0 w-full bg-surface-2 py-2">
              <p class="!text-center text-text-primary select-none font-bold">
                {title}
              </p>
            </div>

            <div class="bg-surface-1 flex flex-col p-6 gap-4">
              <p class="text-text-secondary text-sm leading-relaxed">
                {@html description}
              </p>

              <div class="flex justify-end gap-3 pt-2">
                <button
                  class="font-mono flex justify-center items-center group overflow-hidden relative text-text-primary"
                  onclick={handleClose}
                >
                  <div
                    class="absolute inset-0 border border-border group-hover:border-border-2 bg-surface-2"
                  ></div>
                  <div class="relative !text-center z-10 px-6 py-2 text-sm">
                    {cancelText}
                  </div>
                  <span
                    class="absolute z-10 size-4 border border-border group-hover:border-border-2 rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
                  ></span>
                </button>

                <button
                  class="font-mono overflow-hidden group relative text-white"
                  onclick={handleConfirm}
                >
                  <div
                    class="absolute inset-0 border border-orange-400 group-hover:border-orange-300 bg-primary"
                  ></div>
                  <div class="relative !text-center z-10 px-6 py-2 text-sm">
                    {confirmText}
                  </div>
                  <span
                    class="absolute z-10 size-4 border border-orange-400 group-hover:border-orange-300 rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
                  ></span>
                </button>
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
