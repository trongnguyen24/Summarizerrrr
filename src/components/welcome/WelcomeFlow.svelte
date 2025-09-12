<!-- @ts-nocheck -->
<script>
  import { onMount } from 'svelte'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import StepIndicator from './shared/StepIndicator.svelte'
  import WelcomeLanguageStep from './steps/WelcomeLanguageStep.svelte'
  import WelcomeDisplayStep from './steps/WelcomeDisplayStep.svelte'
  import WelcomeSummaryLangStep from './steps/WelcomeSummaryLangStep.svelte'
  import WelcomeNavigation from './shared/WelcomeNavigation.svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade'

  // State management
  let { shadow = false } = $props()
  let currentStep = $state(1)
  let selectedUILang = $state('en')
  let stepComponentInstance = $state()

  // Navigation functions
  function nextStep() {
    currentStep++
  }

  function prevStep() {
    currentStep--
  }

  // Step constants
  const STEPS = {
    LANGUAGE: 1,
    DISPLAY: 2,
    SUMMARY_LANG: 3,
  }

  async function handleNextClick() {
    if (stepComponentInstance?.saveSettings) {
      await stepComponentInstance.saveSettings()
    }
    nextStep()
  }

  async function handleCompleteClick() {
    if (stepComponentInstance?.saveSettings) {
      await stepComponentInstance.saveSettings()
    }
    completeOnboarding()
  }

  // Direct navigation config calculation
  function getNavigationConfig() {
    switch (currentStep) {
      case STEPS.LANGUAGE: // Step 1
        return {
          canGoBack: false,
          onBack: null,
          onNext: handleNextClick,
          nextLabel: 'welcome.next',
        }

      case STEPS.DISPLAY: // Step 2
        return {
          canGoBack: true,
          onBack: prevStep,
          onNext: handleNextClick,
          nextLabel: 'welcome.next',
        }

      case STEPS.SUMMARY_LANG: // Step 3
        return {
          canGoBack: true,
          onBack: prevStep,
          onNext: handleCompleteClick,
          nextLabel: 'welcome.complete_setup',
        }

      default:
        return {
          canGoBack: false,
          onBack: null,
          onNext: () => {},
          nextLabel: 'welcome.next',
        }
    }
  }

  let navigationConfig = $state(getNavigationConfig())

  // Update navigation config when currentStep changes
  $effect(() => {
    navigationConfig = getNavigationConfig()
  })

  // Complete onboarding
  async function completeOnboarding() {
    // This function is called when the final step is completed.
    try {
      // First update the settings to mark onboarding as completed
      await updateSettings({
        hasCompletedOnboarding: true,
        onboardingStep: 0,
      })

      // Don't close tab - let the reactive system hide the WelcomeFlow
      // The WelcomeFlow should disappear automatically when hasCompletedOnboarding becomes true
    } catch (error) {
      console.error('Error updating settings in WelcomeFlow:', error)
    }
  }
</script>

<div class="welcome-flow-container absolute z-50 bg-surface-1 inset-0">
  <StepIndicator {currentStep} totalSteps={3} />

  <div class="grid items-center px-4 pt-0 pb-16 h-full">
    {#if currentStep === STEPS.LANGUAGE}
      <span
        class="col-start-1 row-start-1"
        in:slideScaleFade={{
          duration: 400,
          delay: 150,
          slideFrom: 'right',
          slideDistance: '0',
          startScale: 0.97,
        }}
        out:slideScaleFade={{
          duration: 200,
          slideFrom: 'left',
          slideDistance: '0',
          startScale: 0.97,
        }}
      >
        <WelcomeLanguageStep
          bind:selectedUILang
          bind:this={stepComponentInstance}
        />
      </span>
    {:else if currentStep === STEPS.DISPLAY}
      <span
        class="col-start-1 row-start-1"
        in:slideScaleFade={{
          duration: 400,
          delay: 150,
          slideFrom: 'right',
          slideDistance: '0',
          startScale: 0.97,
        }}
        out:slideScaleFade={{
          duration: 200,
          slideFrom: 'left',
          slideDistance: '0',
          startScale: 0.97,
        }}
      >
        <WelcomeDisplayStep bind:this={stepComponentInstance} />
      </span>
    {:else if currentStep === STEPS.SUMMARY_LANG}
      <span
        class="col-start-1 row-start-1"
        in:slideScaleFade={{
          duration: 400,
          delay: 150,
          slideFrom: 'right',
          slideDistance: '0',
          startScale: 0.97,
        }}
        out:slideScaleFade={{
          duration: 200,
          slideFrom: 'left',
          slideDistance: '0',
          startScale: 0.97,
        }}
      >
        <WelcomeSummaryLangStep bind:this={stepComponentInstance} {shadow} />
      </span>
    {/if}
  </div>
  <WelcomeNavigation
    canGoBack={navigationConfig?.canGoBack ?? false}
    onBack={navigationConfig?.onBack}
    onNext={navigationConfig?.onNext}
    nextLabel={navigationConfig?.nextLabel ?? 'welcome.next'}
  />
</div>

<style>
  .welcome-flow-container {
    min-height: 400px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
</style>
