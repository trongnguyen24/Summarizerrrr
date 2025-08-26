<!-- @ts-nocheck -->
<script>
  import { onMount } from 'svelte'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import WelcomeLanguageStep from './steps/WelcomeLanguageStep.svelte'
  import WelcomeSettingsGuideStep from './steps/WelcomeSettingsGuideStep.svelte'

  // State management
  let currentStep = $state(1)
  let selectedUILang = $state('en')
  let direction = $state('right')

  // Navigation functions
  function nextStep() {
    direction = 'right'
    currentStep++
  }

  function prevStep() {
    direction = 'left'
    currentStep--
  }

  function goToSettings() {
    browser.tabs.create({ url: 'settings.html' })
  }

  // Step constants
  const STEPS = {
    LANGUAGE: 1,
    SETTINGS_GUIDE: 2,
  }

  // Navigation conditions
  function canGoNext(step) {
    switch (step) {
      case STEPS.LANGUAGE:
        return selectedUILang !== null
      default:
        return false
    }
  }

  // Complete onboarding
  async function completeOnboarding() {
    await updateSettings({
      hasCompletedOnboarding: true,
      onboardingStep: 0,
      uiLang: selectedUILang,
    })
  }
</script>

<div class="welcome-flow-container absolute z-50 inset-0 bg-surface-1 z-20">
  <!-- <StepIndicator {currentStep} totalSteps={2} /> -->

  <div class="flex flex-col justify-center items-center px-4 py-40 h-full">
    {#if currentStep === STEPS.LANGUAGE}
      <WelcomeLanguageStep bind:selectedUILang onNext={nextStep} />
    {:else if currentStep === STEPS.SETTINGS_GUIDE}
      <WelcomeSettingsGuideStep
        {selectedUILang}
        onBack={prevStep}
        onGoToSettings={goToSettings}
      />
    {/if}
  </div>
</div>

<style>
  .welcome-flow-container {
    min-height: 400px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
</style>
