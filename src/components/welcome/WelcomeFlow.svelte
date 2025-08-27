<!-- @ts-nocheck -->
<script>
  import { onMount } from 'svelte'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import StepIndicator from './shared/StepIndicator.svelte'
  import WelcomeLanguageStep from './steps/WelcomeLanguageStep.svelte'
  import WelcomeDisplayStep from './steps/WelcomeDisplayStep.svelte'
  import WelcomeSummaryLangStep from './steps/WelcomeSummaryLangStep.svelte'

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

  // Step constants
  const STEPS = {
    LANGUAGE: 1,
    DISPLAY: 2,
    SUMMARY_LANG: 3,
  }

  // Complete onboarding
  async function completeOnboarding() {
    // This function is called when the final step is completed.
    console.log('Onboarding completed from WelcomeFlow - updating settings')

    try {
      // First update the settings to mark onboarding as completed
      await updateSettings({
        hasCompletedOnboarding: true,
        onboardingStep: 0,
      })

      console.log(
        'Settings updated successfully, hasCompletedOnboarding:',
        settings.hasCompletedOnboarding
      )

      // Don't close tab - let the reactive system hide the WelcomeFlow
      // The WelcomeFlow should disappear automatically when hasCompletedOnboarding becomes true
    } catch (error) {
      console.error('Error updating settings in WelcomeFlow:', error)
    }
  }
</script>

<div class="welcome-flow-container absolute z-50 bg-surface-1 inset-0">
  <StepIndicator {currentStep} totalSteps={3} />

  <div class="flex flex-col justify-center items-center px-4 py-12 h-full">
    {#if currentStep === STEPS.LANGUAGE}
      <WelcomeLanguageStep bind:selectedUILang onNext={nextStep} />
    {:else if currentStep === STEPS.DISPLAY}
      <WelcomeDisplayStep onBack={prevStep} onNext={nextStep} />
    {:else if currentStep === STEPS.SUMMARY_LANG}
      <WelcomeSummaryLangStep
        onBack={prevStep}
        onComplete={completeOnboarding}
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
