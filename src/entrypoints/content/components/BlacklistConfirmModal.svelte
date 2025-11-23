<script>
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade.js'

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
  class="fixed inset-0 z-[2147483648] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
  onclick={onclose}
  transition:slideScaleFade={{
    duration: 200,
    startScale: 0.95,
    slideDistance: '0',
  }}
>
  <div
    class="bg-white dark:bg-[#1e1e1e] p-5 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-700 mx-4"
    onclick={(e) => e.stopPropagation()}
  >
    <h3 class="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
      Disable on this site?
    </h3>
    <p class="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
      This will add <code
        class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-xs font-mono"
        >{window.location.hostname}</code
      > to your blacklist and switch FAB mode to "Blacklist".
    </p>
    <div class="flex justify-end gap-3">
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onclick={onclose}
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-sm"
        onclick={handleConfirm}
      >
        Disable & Hide
      </button>
    </div>
  </div>
</div>
