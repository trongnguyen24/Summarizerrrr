<script>
  // @ts-nocheck
  import { fetchAndSummarize } from '../../../stores/summaryStore.svelte.js'
  import { getHelpInfo } from '../../../lib/error/helpSystem.js'
  import { settings } from '../../../stores/settingsStore.svelte.js'
  import { t } from 'svelte-i18n' // Import t for i18n

  let { error } = $props()

  const helpInfo = $derived(getHelpInfo(error?.type))

  // Translated properties for display
  const translatedTitle = $derived($t(helpInfo.title))
  const translatedMessage = $derived($t(helpInfo.message))
  // Map suggestions to an array of translated texts
  const translatedSuggestions = $derived(
    helpInfo.suggestions?.map((suggestionKey) => $t(suggestionKey)) || []
  )

  function handleRetry() {
    if (error.canRetry) {
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
            {#if error?.message && error.message !== translatedMessage}
              {error.message}
            {:else}
              {translatedTitle}{/if}
          </div>
        </div>
      </div>

      <p class="text-sm">
        {translatedMessage || 'Something went wrong.'}
      </p>

      {#if translatedSuggestions.length > 0}
        <ul class="list-disc !m-0 list-inside pl-4">
          {#each translatedSuggestions as suggestion}
            <li>{suggestion}</li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Hiển thị raw error message cho UNKNOWN errors -->
    <!-- {#if (error?.type === 'unknown' || !error?.type) && }
      <div
        class="mt-2 relative p-4 overflow-hidden text-sm text-error border border-error font-mono"
      >
        <span
          class="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 size-8 rotate-45 bg-error"
        ></span>
       
      </div>
    {/if} -->
  </div>
{/if}
