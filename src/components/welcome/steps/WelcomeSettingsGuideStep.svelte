<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import { updateSettings } from '@/stores/settingsStore.svelte.js'

  export let onBack
  export let onGoToSettings
  export let selectedUILang

  async function handleGoToSettings() {
    // Complete onboarding first
    await updateSettings({
      hasCompletedOnboarding: true,
      onboardingStep: 0,
      uiLang: selectedUILang,
    })
    // Then go to settings
    onGoToSettings()
  }

  function handleBack() {
    onBack()
  }
</script>

<div class="welcome-settings-guide-step w-full">
  <!-- <h2 class="text-lg font-bold text-center mb-2">
    {$t('welcome.configure_api_keys')}
  </h2> -->
  <p class="text-center text-sm text-text-primary mb-6">
    {$t('welcome.api_setup_guide')}
  </p>

  <div class="flex flex-col items-center gap-4 mb-8">
    <div
      class="p-4 bg-surface-2 rounded-lg text-sm text-text-secondary max-w-sm text-center"
    >
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        class="text-primary hover:underline text-xs"
      >
        {$t('welcome.setup_guide_link')}
      </a>
    </div>

    <button
      class="px-8 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors duration-200"
      onclick={handleGoToSettings}
    >
      {$t('welcome.go_to_settings')}
    </button>
  </div>
</div>

<div class="absolute px-4 bottom-8 left-0 right-0 flex justify-center">
  <button
    class=" font-mono text-sm w-full overflow-hidden relative text-white"
    onclick={handleBack}
  >
    <div class=" absolute inset-0 border border-border bg-surface-2"></div>
    <div class=" relative z-50 pl-4 pr-6 py-2">{$t('welcome.back')}</div>

    <span
      class="absolute z-50 size-4 border border-border rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
    ></span>
  </button>
</div>

<style>
  .welcome-settings-guide-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
</style>
