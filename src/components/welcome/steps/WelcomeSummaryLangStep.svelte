<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import LanguageSelect from '@/components/inputs/LanguageSelect.svelte'
  import ShadowDOMLanguageSelect from '@/components/inputs/ShadowDOMLanguageSelect.svelte'
  import Icon from '@iconify/svelte'

  // Props
  let { shadow = false } = $props()

  // Local state initialized from stores
  let selectedSummaryLang = $state(settings.summaryLang)

  function handleLanguageChange(event) {
    // Handle both native and custom event detail
    const newValue =
      typeof event.detail === 'string' ? event.detail : event.detail?.value
    if (newValue) {
      selectedSummaryLang = newValue
    }
  }

  export async function saveSettings() {
    await updateSettings({
      summaryLang: selectedSummaryLang,
    })
  }
</script>

<div
  class="welcome-summary-lang-step max-w-sm mx-auto w-full flex flex-col justify-center items-center"
>
  <h2 class="text-lg font-bold text-text-primary text-center mb-2">
    {$t('welcome.setup_summary_lang_title')}
  </h2>
  <p class="text-xs !text-center text-text-secondary mb-6">
    {$t('welcome.setup_summary_lang_desc')}
  </p>

  <div class="w-full font-mono max-w-sm space-y-6">
    <div>
      <h3 class="font-medium text-xs text-text-secondary mb-2">
        {$t('welcome.summary_language')}
      </h3>
      {#if shadow}
        <ShadowDOMLanguageSelect
          bind:value={selectedSummaryLang}
          on:change={handleLanguageChange}
        />
      {:else}
        <LanguageSelect
          bind:value={selectedSummaryLang}
          on:change={handleLanguageChange}
        />
      {/if}
    </div>
  </div>
</div>
