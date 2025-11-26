<script>
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'
  import Icon from '@iconify/svelte'

  let { onclose } = $props()

  function handleConfirm() {
    const domain = window.location.hostname
    const currentControl = settings.fabDomainControl || {
      mode: 'all',
      whitelist: [],
      blacklist: [],
    }

    // Ensure blacklist exists and is an array
    const blacklist = Array.isArray(currentControl.blacklist)
      ? [...currentControl.blacklist]
      : []

    if (!blacklist.includes(domain)) {
      blacklist.push(domain)
    }

    const newControl = {
      ...currentControl,
      mode: 'blacklist',
      blacklist,
    }

    updateSettings({ fabDomainControl: newControl })
    onclose()
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-[2147483648] flex items-center justify-center bg-black/50"
  onclick={onclose}
  transition:slideScaleFade={{
    duration: 300,
    startScale: 1,
    slideDistance: '0',
  }}
>
  <div
    class=" shadow-2xl max-w-[32em] w-full border border-border mx-4 relative font-mono rounded-xl text-text-primary dark:text-text-secondar bg-background dark:bg-surface-1 overflow-hidden"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
      <span class="block size-3.5 bg-muted/15 rounded-full"></span>
      <span class="block size-3.5 bg-muted/15 rounded-full"></span>
      <!-- svelte-ignore a11y_consider_explicit_label -->
      <button class="block size-3.5 bg-error rounded-full" onclick={onclose}>
        <Icon
          class="text-red-800 transition-opacity duration-150"
          width={14}
          icon="heroicons:x-mark-16-solid"
        />
      </button>
    </div>
    <div class="px-4 bg-surface-2 py-2 border-b border-border">
      <p class="select-none font-mono text-sm font-bold text-text-primary">
        Close Floating Action Button?
      </p>
    </div>

    <p class="text-text-secondary text-sm p-5 leading-relaxed">
      Disable the on <b class=" text-text-primary">{window.location.hostname}</b
      >
      (Can be re-enabled in the
      <a class="text-primary inline-flex items-center gap-1"
        >Settings <Icon
          icon="heroicons:arrow-up-right-16-solid"
          width="12"
        /></a
      >)
    </p>
    <div class="flex justify-end gap-3 px-5 pb-5">
      <button
        class="font-mono text-sm flex justify-center items-center overflow-hidden relative text-text-primary"
        onclick={onclose}
      >
        <div class="absolute inset-0 border border-border bg-surface-2"></div>
        <div class="relative !text-center z-10 px-6 py-2">Cancel</div>
        <span
          class="absolute z-10 size-4 border border-border rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
        ></span>
      </button>

      <button
        class="font-mono text-sm overflow-hidden relative text-white"
        onclick={handleConfirm}
      >
        <div class="absolute inset-0 border border-orange-400 bg-primary"></div>
        <div class="relative !text-center z-10 px-6 py-2">Confirm</div>
        <span
          class="absolute z-10 size-4 border border-orange-400 rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
        ></span>
      </button>
    </div>
  </div>
</div>
