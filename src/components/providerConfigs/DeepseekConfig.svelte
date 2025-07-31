<script>
  // @ts-nocheck
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import { t } from 'svelte-i18n'

  let { selectedDeepseekModel = $bindable() } = $props()

  const deepseekModels = ['deepseek-chat', 'deepseek-reasoner']

  /**
   * Handles saving the Deepseek API key.
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ deepseekApiKey: key })
  }

  $effect(() => {
    if (selectedDeepseekModel) {
      updateSettings({ selectedDeepseekModel })
    }
  })

  let saveStatus = $state('')
  let deepseekModelDebounceTimer = null

  function scheduleDeepseekModelSave(value) {
    clearTimeout(deepseekModelDebounceTimer)
    deepseekModelDebounceTimer = setTimeout(() => {
      updateSettings({
        selectedDeepseekModel: value.trim(),
      })
      saveStatus = 'saved!'
      setTimeout(() => (saveStatus = ''), 2000)
    }, 300)
  }
</script>

<div class="space-y-4">
  <ApiKeyInput
    label={$t('settings.deepseek_config.api_key_label')}
    id="deepseekApiKey"
    apiKey={settings.deepseekApiKey}
    onSave={handleApiKeySave}
    placeholder={$t('settings.deepseek_config.api_key_placeholder')}
  />
  <div class="flex flex-col gap-2">
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-1 justify-between">
        <label for="deepseek-model-input" class="block"
          >{$t('settings.deepseek_config.model_name_label')}</label
        >
        {#if saveStatus}
          <p id="save-status" transition:fade class="text-success flex mr-auto">
            {$t('settings.deepseek_config.saved_status')}
          </p>
        {/if}
        <a
          href="https://api-docs.deepseek.com/quick_start/pricing"
          target="_blank"
          class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
        >
          {$t('settings.deepseek_config.view_models')}
          <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
        </a>
      </div>
      <input
        type="text"
        id="deepseek-model-input"
        list="deepseek-model-list"
        bind:value={selectedDeepseekModel}
        class="select-none font-mono w-full relative text-xs overflow-hidden flex flex-col gap-0 px-3 text-text-primary text-left py-1.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150 deepseek-model-input"
        placeholder={$t('settings.deepseek_config.model_placeholder')}
        oninput={(e) => scheduleDeepseekModelSave(e.target.value)}
      />

      <datalist id="deepseek-model-list">
        {#each deepseekModels as model}
          <option value={model}>
            {model}
          </option>
        {/each}
      </datalist>
    </div>
  </div>
</div>

<style>
  .deepseek-model-input::picker-input {
    appearance: none;
    -moz-appearance: none; /* Firefox */
    -webkit-appearance: none; /* Safari and Chrome */
  }

  input::-webkit-calendar-picker-indicator {
    display: none !important;
  }
</style>
