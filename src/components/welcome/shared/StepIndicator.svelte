<!-- @ts-nocheck -->
<script>
  let { currentStep, totalSteps } = $props()
</script>

<div
  class="step-indicator sticky top-0 pt-4 flex justify-center items-center space-x-2"
>
  {#each { length: totalSteps } as _, i}
    {@const step = i + 1}
    <div
      class="step-item relative flex justify-center items-center size-3 rounded-full transition-all duration-300"
      class:active={step === currentStep}
      class:in-progress={step !== currentStep}
      class:complaete={step < currentStep}
    >
      <span
        class=" w-0.75 h-3 transition-all rounded-2xl duration-300 ease-in-out"
      ></span>
    </div>
  {/each}
</div>

<style>
  .step-indicator > .step-item {
    transition:
      background-color 0.3s ease,
      opacity 0.3s ease;
  }
  .step-item.active > span {
    background: white;
    position: relative;
  }
  .step-item.active > span::after {
    content: '';
    position: absolute;
    inset: 0;
    background: white;
    filter: blur(4px);
  }
  .step-item.active > span::before {
    content: '';
    position: absolute;
    inset: 0;

    background: white;
    filter: blur(2px);
  }

  .step-item.in-progress > span {
    background: var(--color-border);
  }

  .step-item.complaete > span {
    background: white;
  }
</style>
