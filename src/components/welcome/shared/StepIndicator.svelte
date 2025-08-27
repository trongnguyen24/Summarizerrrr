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
      class="step-item relative flex justify-center items-center size-4 rounded-full transition-all duration-300"
      class:active={step === currentStep}
      class:in-progress={step !== currentStep}
      class:complaete={step < currentStep}
    >
      <span
        class=" w-1.5 h-4 transition-all rounded-2xl duration-300 ease-in-out"
      ></span>
    </div>
  {/each}
</div>

<style>
  .step-item > span {
    position: relative;
    box-shadow:
      0 0 0 #ffffff00,
      0 0 0 #ffffff00;
    transition: all 0.3s ease;
  }
  .step-item.active > span {
    background: white;
    position: relative;
    box-shadow:
      0 0 8px #fff,
      0 0 4px #fff;
  }

  .step-item.in-progress > span {
    background: var(--color-border);
  }

  .step-item.complaete > span {
    background: white;
  }
</style>
