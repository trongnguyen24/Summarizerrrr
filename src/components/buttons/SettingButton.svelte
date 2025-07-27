<script>
  import { t, locale } from 'svelte-i18n'
  import '../../lib/i18n.js' // Import to initialize
  import Icon from '@iconify/svelte'
  import Setting from '../Setting.svelte' // Assuming Setting.svelte will also be refactored
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { settings } from '../../stores/settingsStore.svelte.js'

  import { slideScaleFade } from '../../lib/slideScaleFade.js' // Corrected path if needed
  // Sync i18n locale with settings store

  let title = $state('')

  $effect(() => {
    const newLocale = settings.uiLang
    if (newLocale && newLocale !== $state.snapshot(locale)) {
      locale.set(newLocale)
    }
    title = $t('settings.open_settings')
  })
  let isOpen = $state(false) // State for the dialog
</script>

<button
  onclick={() => (isOpen = true)}
  class="p-1 setting-animation transition-colors hover:bg-surface-1 rounded-full hover:text-text-primary"
  {title}
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
            <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
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

<!-- <script> -->

<style>
  .setting-animation {
    animation: gear-jiggle 8s ease-in-out infinite;
  }

  @keyframes gear-jiggle {
    0%,
    15%,
    20.001%,
    50%,
    54.001%,
    58.001%,
    85%,
    90.001%,
    100% {
      transform: rotate(0deg);
    }
    20% {
      transform: rotate(60deg);
    }
    52.5% {
      transform: rotate(-6deg);
    }
    56.5% {
      transform: rotate(6deg);
    }
    90% {
      transform: rotate(60deg);
    }
  }
</style>
