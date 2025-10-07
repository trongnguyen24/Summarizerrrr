<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { fade } from 'svelte/transition'
  import { t } from 'svelte-i18n'

  const handleOpenSettings = () => {
    browser.runtime.sendMessage({ type: 'OPEN_SETTINGS' })
  }
</script>

<div
  class="flex font-mono min-w-[18rem] flex-col text-center w-full justify-center items-center gap-4"
  in:fade={{ duration: 300 }}
  out:fade={{ duration: 200 }}
>
  <div class="flex flex-col gap-3 items-center">
    <div
      class="size-16 shrink-0 flex justify-center items-center overflow-hidden relative"
    >
      <div
        class="absolute z-40 border border-border dark:border-surface-2 inset-0"
      ></div>
      <div class="absolute inset-1 bg-white/50 dark:bg-white/3"></div>
      <span
        class="absolute z-20 size-6 rotate-45 bg-surface-1 bottom-px left-px -translate-x-1/2 translate-y-1/2"
      ></span>
      <span
        class="absolute z-20 size-6 rotate-45 bg-surface-1 top-px right-px translate-x-1/2 -translate-y-1/2"
      ></span>
      <span
        class="absolute z-50 size-4 rotate-45 bg-surface-1 border border-border dark:border-surface-2 bottom-px left-px -translate-x-1/2 translate-y-1/2"
      ></span>
      <span
        class="absolute z-50 size-4 rotate-45 border-surface-1 bg-border dark:bg-muted border dark:border-surface-2 top-px right-px translate-x-1/2 -translate-y-1/2"
      ></span>
      <Icon
        icon="solar:key-bold"
        class="size-6 rotateAnimation text-muted dark:text-text-primary shrink-0 glitch-effect"
      />
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-sm !text-center text-text-secondary text-balance max-w-sm">
        {$t('apiKeyPrompt.description')}
      </p>
    </div>
  </div>

  <div class="flex flex-col gap-8 items-center">
    <button
      onclick={handleOpenSettings}
      class="px-6 py-2 bg-primary text-white rounded-3xl font-medium hover:bg-primary/90 transition-colors"
    >
      {$t('apiKeyPrompt.openSettings')}
    </button>
    <a
      href="https://www.youtube.com/watch?v=g-Uae53Cpmw"
      target="_blank"
      class="text-xs flex items-center text-text-secondary hover:text-primary underline underline-offset-2 transition-colors"
    >
      {$t('apiKeyPrompt.setupGuide')}
      <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
    </a>
  </div>
</div>
