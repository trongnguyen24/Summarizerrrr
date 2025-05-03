<script>
  import Icon from '@iconify/svelte'
  import Setting from './Setting.svelte' // Assuming Setting.svelte will also be refactored
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '../lib/slideScaleFade.js' // Corrected path if needed
  import '../app.css'
  import { settingsStore } from '../stores/settingsStore.svelte.js' // Import the settingsStore object

  let isOpen = $state(false) // State for the dialog

  // Access state and action via the imported object
  const { settings, updateSettings } = settingsStore

  // No need for onMount or updateSetting function anymore
  // State (currentLength, currentFormat) is now directly from the 'settings' store ($state)
</script>

<div
  class="settingbar relative rounded-lg bg-surface-2/100 dark:bg-surface-1/50 border border-border dark:border-border/25 dark:border-t-border/100"
>
  <div class="flex text-muted">
    <div class="flex p-0.5 gap-0.5 border-r border-border/50">
      <button
        onclick={() => updateSettings({ summaryLength: 'short' })}
        class={settingsStore.settings.summaryLength === 'short' ? 'active' : ''}
        title="Short summary"
      >
        <Icon width={16} icon="heroicons:minus-16-solid" />
      </button>
      <button
        onclick={() => updateSettings({ summaryLength: 'medium' })}
        class={settingsStore.settings.summaryLength === 'medium'
          ? 'active'
          : ''}
        title="Medium summary"
      >
        <Icon width={16} icon="heroicons:bars-2-16-solid" />
      </button>
      <button
        onclick={() => updateSettings({ summaryLength: 'long' })}
        class={settingsStore.settings.summaryLength === 'long' ? 'active' : ''}
        title="Long summary"
      >
        <Icon width={16} icon="heroicons:bars-3-16-solid" />
      </button>
    </div>
    <div class="flex p-0.5 gap-0.5 border-r border-border/50">
      <button
        onclick={() => updateSettings({ summaryFormat: 'heading' })}
        class={settingsStore.settings.summaryFormat === 'heading'
          ? 'active'
          : ''}
        title="Heading format"
      >
        <Icon width={16} icon="heroicons:list-bullet-16-solid" />
      </button>
      <button
        onclick={() => updateSettings({ summaryFormat: 'paragraph' })}
        class={settingsStore.settings.summaryFormat === 'paragraph'
          ? 'active'
          : ''}
        title="Paragraph format"
      >
        <Icon width={16} icon="heroicons:bars-4-16-solid" />
      </button>
    </div>
    <div class="flex p-0.5 gap-0.5">
      <button onclick={() => (isOpen = true)} title="Open settings">
        <Icon width={16} icon="heroicons:cog-6-tooth-16-solid" />
      </button>
    </div>
  </div>
</div>

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
      class="outline-hidden fixed left-[50%] top-4 px-4 xs:px-8 max-w-2xl z-50 w-full translate-x-[-50%]"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:slideScaleFade>
            <div
              class="absolute z-50 right-7 xs:right-11 top-3 group flex gap-2"
            >
              <span class="block size-3 bg-surface-2 rounded-full"></span>
              <span class="block size-3 bg-surface-2 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                onclick={() => (isOpen = false)}
                class="block size-3 bg-error rounded-full"
              >
                <Icon
                  class="text-red-800 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  width={12}
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
