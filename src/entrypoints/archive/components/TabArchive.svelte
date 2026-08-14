<!-- @ts-nocheck -->
<script>
  import Icon from '@iconify/svelte'
  import { t, locale } from 'svelte-i18n'
  import { settings } from '@/stores/settingsStore.svelte.js'

  let { activeTab, onSelectTab } = $props()

  let activeBarTransformClass = $state('-translate-x-20')

  // Sync i18n locale with settings store
  $effect(() => {
    const newLocale = settings.uiLang
    if (newLocale && newLocale !== $locale) {
      locale.set(newLocale)
    }
  })

  // Two tabs across a w-80 panel: each is 160px wide, so the centres sit
  // 80px (translate-x-20) either side of the bar's centred position.
  $effect(() => {
    activeBarTransformClass =
      activeTab === 'archive' ? 'translate-x-20' : '-translate-x-20'
  })
</script>

<div
  class="flex flex-col relative mt-2 font-mono text-sm text-text-secondary w-full border-t border-b border-border dark:border-border/50"
>
  <div class="flex bg-background w-full items-center justify-evenly gap-0">
    <button
      class="flex p-3 items-center flex-1 justify-center gap-1 cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'history'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => onSelectTab('history')}
    >
      <div class="size-5">
        {#if activeTab === 'history'}
          <Icon icon="heroicons:clock-solid" width="20" height="20" />
        {:else}
          <Icon icon="heroicons:clock" width="20" height="20" />
        {/if}
      </div>
      <span>{$t('archive.tab_history')}</span>
    </button>

    <button
      class="flex p-3 items-center flex-1 justify-center gap-1 cursor-pointer rounded-md transition-colors duration-200 {activeTab ===
      'archive'
        ? ' text-blackwhite '
        : 'text-text-secondary'}"
      onclick={() => onSelectTab('archive')}
    >
      <div class="size-5">
        {#if activeTab === 'archive'}
          <Icon icon="heroicons:archive-box-solid" width="20" height="20" />
        {:else}
          <Icon icon="heroicons:archive-box" width="20" height="20" />
        {/if}
      </div>
      <span>{$t('archive.tab_archive')}</span>
    </button>
  </div>

  <div class="relative bg-background flex justify-center items-center h-1">
    <div
      id="activebar"
      class="w-16 h-1 rounded-xs relative rounded-t-lg bg-white transition-transform duration-400 ease-out {activeBarTransformClass}"
    >
      <div class=" absolute rounded-xs inset-px bg-white"></div>
      <div class="  absolute -inset-px bg-white/50 blur-xs"></div>
      <div class="  absolute -inset-px bg-white/50 blur-[2px]"></div>
    </div>
  </div>
</div>
