<script>
  // @ts-nocheck
  import { fetchAndSummarize } from '../../../stores/summaryStore.svelte.js'
  import { settings } from '../../../stores/settingsStore.svelte.js'

  let { error } = $props()

  // Đơn giản hóa - chỉ hiển thị message và suggestions từ error object
  const errorMessage = $derived(error?.message || 'Something went wrong.')
  const errorSuggestions = $derived(error?.suggestions || [])

  function handleRetry() {
    if (error?.canRetry) {
      fetchAndSummarize()
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
          <div class="font-bold text-error">Error</div>
          <div class="text-xs py-1 text-text-secondary">
            {errorMessage}
          </div>
        </div>
      </div>

      <p class="text-sm">
        {errorMessage}
      </p>

      {#if errorSuggestions.length > 0}
        <ul class="list-disc !m-0 list-inside pl-4">
          {#each errorSuggestions as suggestion}
            <li>{suggestion}</li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}
