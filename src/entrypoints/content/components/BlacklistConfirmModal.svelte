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
    class=" shadow-2xl max-w-[28em] w-full border border-border mx-4 relative font-mono rounded-xl text-text-primary dark:text-text-secondar bg-background dark:bg-surface-1 overflow-hidden"
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
      <p class="select-none font-mono text-xs font-bold text-text-primary">
        Hide FAB?
      </p>
    </div>

    <p class="text-text-secondary text-xs p-5 leading-relaxed">
      Add <b>{window.location.hostname}</b> to your FAB blacklist. <br />
      You can enable it from the Settings > FAB > FAB Domain Control.
    </p>
    <div class="flex justify-end gap-3 px-5 pb-5">
      <button
        class="px-4 py-2 rounded-lg font-medium text-text-secondary hover:bg-blackwhite/5 transition-colors"
        onclick={onclose}
      >
        <span class="text-xs">Cancel</span>
      </button>
      <button class="relative overflow-hidden group" onclick={handleConfirm}>
        <div
          class="font-bold flex justify-center items-center h-10 px-6 border transition-colors duration-200 bg-red-600 text-red-100 border-red-500 hover:border-red-400 hover:text-white"
        >
          <span class="text-xs">Hide FAB</span>
        </div>
        <span
          class="size-4 absolute z-10 -left-2 -bottom-2 border bg-background dark:bg-surface-1 rotate-45 transition-colors duration-200 border-red-500 group-hover:border-red-400"
        ></span>
      </button>
    </div>
  </div>
</div>
