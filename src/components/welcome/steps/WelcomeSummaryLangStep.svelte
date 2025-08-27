<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import LanguageSelect from '@/components/inputs/LanguageSelect.svelte'
  import Icon from '@iconify/svelte'

  let { onBack, onComplete } = $props()

  // Local state initialized from stores
  let selectedSummaryLang = $state(settings.summaryLang)

  function handleLanguageChange(event) {
    selectedSummaryLang = event.detail
  }

  async function handleComplete() {
    console.log(
      '[WelcomeFlow] Starting completion process in SummaryLangStep...'
    )

    try {
      // Only update the summary language, let WelcomeFlow handle the onboarding completion
      await updateSettings({
        summaryLang: selectedSummaryLang,
      })

      console.log(
        '[WelcomeFlow] Summary language updated, calling onComplete()'
      )

      // This will call completeOnboarding() in WelcomeFlow.svelte
      onComplete()
    } catch (error) {
      console.error('[WelcomeFlow] Error updating summary language:', error)
    }
  }
</script>

<div
  class="welcome-summary-lang-step w-full flex flex-col justify-center items-center"
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

<div
  class="absolute max-w-sm mx-auto bottom-8 px-4 left-0 right-0 flex justify-center gap-4"
>
  <button
    class="font-mono text-sm w-16 shrink-0 flex justify-center items-center overflow-hidden relative text-text-primary"
    onclick={onBack}
    title={$t('welcome.back')}
  >
    <div class="absolute inset-0 border border-border bg-surface-2"></div>
    <div class="absolute inset-0 z-10 flex justify-center items-center">
      <Icon icon="heroicons:arrow-left-16-solid" width="16" />
    </div>

    <span
      class="absolute z-10 size-4 border border-border rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
    ></span>
  </button>
  <button
    class="font-mono text-sm w-full overflow-hidden relative text-white"
    onclick={handleComplete}
  >
    <div class="absolute inset-0 border border-orange-400 bg-primary"></div>
    <div class="relative z-10 pl-4 pr-6 py-2">
      {$t('welcome.complete_setup')}
    </div>
    <span
      class="absolute z-10 size-4 border border-orange-400 rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
    ></span>
  </button>
</div>
