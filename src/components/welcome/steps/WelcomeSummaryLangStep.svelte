<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import LanguageSelect from '@/components/inputs/LanguageSelect.svelte'
  import Icon from '@iconify/svelte'

  // Local state initialized from stores
  let selectedSummaryLang = $state(settings.summaryLang)

  function handleLanguageChange(event) {
    selectedSummaryLang = event.detail
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
  <h2 class="text-lg font-bold text-center mb-2">
    {$t('welcome.setup_summary_lang_title')}
  </h2>
  <p class="text-center text-xs text-text-secondary mb-6">
    {$t('welcome.setup_summary_lang_desc')}
  </p>

  <div class="w-full font-mono text-xs max-w-sm space-y-6">
    <!-- Summary Language Selection -->
    <div>
      <h3 class=" font-medium text-text-secondary mb-2">
        {$t('welcome.summary_language')}
      </h3>
      <LanguageSelect
        bind:value={selectedSummaryLang}
        on:change={handleLanguageChange}
      />
    </div>
  </div>
</div>
