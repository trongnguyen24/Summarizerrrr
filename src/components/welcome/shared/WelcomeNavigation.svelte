<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { slideScaleFade } from '@/lib/ui/slideScaleFade'

  let {
    canGoBack = false,
    onBack = () => {},
    onNext = () => {},
    nextLabel = 'welcome.next',
  } = $props()
</script>

<div
  class="absolute max-w-sm mx-auto bottom-8 px-4 left-0 right-0 flex justify-center gap-4"
>
  <button
    class="font-mono text-sm w-16 shrink-0 flex justify-center items-center overflow-hidden relative text-text-primary"
    class:pointer-events-none={!canGoBack}
    onclick={onBack}
    title={$t('welcome.back')}
    disabled={!canGoBack}
  >
    <div class="absolute inset-0 border border-border bg-surface-2"></div>
    <div class="absolute inset-0 z-10 flex justify-center items-center">
      {#if canGoBack}
        <div
          transition:slideScaleFade={{
            duration: 250,
            slideDistance: '0',
            startScale: 0.5,
          }}
        >
          <Icon icon="heroicons:arrow-left-16-solid" width="16" />
        </div>
      {/if}
    </div>
    <span
      class="absolute z-10 size-4 border border-border rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
    ></span>
  </button>
  <button
    class="font-mono text-sm w-full overflow-hidden relative text-white"
    onclick={onNext}
  >
    <div class="absolute inset-0 border border-orange-400 bg-primary"></div>
    <div class="relative z-10 pl-4 pr-6 py-2">{$t(nextLabel)}</div>
    <span
      class="absolute z-10 size-4 border border-orange-400 rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
    ></span>
  </button>
</div>
