<!-- @ts-nocheck -->
<script>
  import { t } from 'svelte-i18n'
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'
  import Icon from '@iconify/svelte'

  export let selectedUILang

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

  // Export saveSettings method for consistency with other steps
  export async function saveSettings() {
    // Language is already saved when selected, but we keep this for consistency
    if (selectedUILang) {
      await updateSettings({ uiLang: selectedUILang })
    }
  }
</script>

<div class="welcome-language-step w-full">
  <h2 class="text-lg font-bold text-center mb-2">
    {$t('welcome.choose_interface_language')}
  </h2>
  <p class="text-center text-xs text-text-secondary mb-6">
    {$t('welcome.select_your_language')}
  </p>

  <div class="grid max-w-sm mx-auto text-xs grid-cols-2 gap-2 mb-8">
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
