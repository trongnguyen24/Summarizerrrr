<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'

  export let selectedUILang
  export let onNext

  // Language options
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'es', name: 'Spanish' },
    { code: 'zh-CN', name: 'Chinese' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
  ]

  // Handle language selection
  async function selectLanguage(langCode) {
    selectedUILang = langCode
    await updateSettings({ uiLang: langCode })
  }

  // Handle next step
  function handleNext() {
    onNext()
  }
</script>

<div class="welcome-language-step w-full">
  <h2 class="text-lg font-bold text-center mb-2">
    {$t('welcome.choose_interface_language')}
  </h2>
  <p class="text-center text-xs text-text-secondary mb-6">
    {$t('welcome.select_your_language')}
  </p>

  <div class="grid text-xs grid-cols-2 gap-2 mb-8">
    {#each languages as lang}
      <ButtonSet
        title={lang.name}
        Description={lang.code.toUpperCase()}
        class={selectedUILang === lang.code ? 'active' : ''}
        onclick={() => selectLanguage(lang.code)}
      />
    {/each}
  </div>
</div>

<div class="absolute bottom-8 px-4 left-0 right-0 flex justify-center">
  <button
    class=" font-mono text-sm w-full overflow-hidden relative text-white"
    onclick={handleNext}
  >
    <div class=" absolute inset-0 border border-orange-400 bg-primary"></div>
    <div class=" relative z-50 pl-4 pr-6 py-2">{$t('welcome.next')}</div>

    <span
      class="absolute z-50 size-4 border border-orange-400 rotate-45 bg-surface-1 dark:border-surface-2 -bottom-px -left-px -translate-x-1/2 translate-y-1/2"
    ></span>
  </button>
</div>
