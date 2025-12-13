<script>
  // @ts-nocheck
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import ReusableCombobox from '../inputs/ReusableCombobox.svelte'
  import {
    settings,
    updateSettings,
  } from '../../stores/settingsStore.svelte.js'
  import { t } from 'svelte-i18n'

  const cerebrasModels = [
    { value: 'llama3.1-8b', label: 'llama3.1-8b' },
    { value: 'llama-3.3-70b', label: 'llama-3.3-70b' },
    { value: 'gpt-oss-120b', label: 'gpt-oss-120b' },
    { value: 'qwen-3-32b', label: 'qwen-3-32b' },
    {
      value: 'qwen-3-235b-a22b-instruct-2507',
      label: 'qwen-3-235b-a22b-instruct-2507',
    },
    { value: 'zai-glm-4.6', label: 'zai-glm-4.6' },
  ]

  function saveCerebrasApiKey(key) {
    updateSettings({ cerebrasApiKey: key })
  }

  function handleModelChange(value) {
    updateSettings({ selectedCerebrasModel: value })
  }
</script>

<ApiKeyInput
  apiKey={settings.cerebrasApiKey}
  label={$t('settings.cerebras_config.api_key_label')}
  linkHref="https://cloud.cerebras.ai/"
  linkText={$t('settings.cerebras_config.get_a_key')}
  onSave={saveCerebrasApiKey}
/>
<div class="flex flex-col gap-2 relative z-50">
  <label
    for="cerebras-model-input"
    class="block text-xs font-medium text-text-primary"
    >{$t('settings.cerebras_config.model_label')}</label
  >
  <ReusableCombobox
    items={cerebrasModels}
    bind:bindValue={settings.selectedCerebrasModel}
    placeholder={$t('settings.cerebras_config.model_placeholder')}
    id="cerebras-model-input"
    ariaLabel="Search Cerebras model"
    onValueChangeCallback={handleModelChange}
  />
</div>
