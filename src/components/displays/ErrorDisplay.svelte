<script>
  // @ts-nocheck
  import { fetchAndSummarize } from '../../stores/summaryStore.svelte.js'
  import { getHelpInfo } from '../../lib/error/helpSystem.js'
  import { settings } from '../../stores/settingsStore.svelte.js'

  let { error } = $props()

  const helpInfo = $derived(getHelpInfo(error?.type))

  function handleRetry() {
    if (error.canRetry) {
      fetchAndSummarize()
    }
  }

  function handleHelpAction(action) {
    switch (action) {
      case 'Open Settings':
        // This is a simple way to trigger settings. A more robust way would be a dedicated store action.
        document.dispatchEvent(new CustomEvent('openSettings'))
        break
      case 'Refresh Page':
        browser.tabs.reload()
        break
      // Other actions can be handled here
      default:
        alert(`Action: ${action}\n\n${helpInfo.message}`)
        break
    }
  }
</script>

{#if error}
  <div class="error-container font-mono" role="alert">
    <div class="flex w-full flex-col gap-2">
      <div class="flex gap-0.5">
        <div class="bg-error rounded-l-sm w-3"></div>
        <div
          class="flex relative overflow-hidden w-full px-4 py-2 gap-0 flex-col bg-blackwhite/5"
        >
          <span
            class="size-6 rotate-45 absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-surface-1"
          ></span>
          <div class="text-xs font-bold text-error">Error</div>
          <div class=" ">
            {helpInfo.title}
          </div>
        </div>
      </div>

      <p class="text-sm">
        {error.message || 'Something went wrong.'}
      </p>
    </div>
    <!-- <div class="flex justify-end mt-4 space-x-2">
      {#if helpInfo.actions}
        {#each helpInfo.actions as action}
          <button
            onclick={() => handleHelpAction(action)}
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            {action}
          </button>
        {/each}
      {/if}
      {#if error.canRetry && !helpInfo.actions?.includes('Retry')}
        <button
          onclick={handleRetry}
          class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
        >
          Retry
        </button>
      {/if}
    </div> -->
  </div>
{/if}
