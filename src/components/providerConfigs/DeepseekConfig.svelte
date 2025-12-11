<script>
  // @ts-nocheck
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import Icon from '@iconify/svelte'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import ReusableCombobox from '../inputs/ReusableCombobox.svelte'
  import { t } from 'svelte-i18n'

  let { selectedDeepseekModel = $bindable() } = $props()

  const deepseekModels = [
    { value: 'deepseek-chat', label: 'deepseek-chat' },
    { value: 'deepseek-reasoner', label: 'deepseek-reasoner' },
  ]

  /**
   * Handles saving the Deepseek API key.
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ deepseekApiKey: key })
  }

  function handleModelChange(value) {
    updateSettings({ selectedDeepseekModel: value })
  }
</script>

<ApiKeyInput
  label={$t('settings.deepseek_config.api_key_label')}
  id="deepseekApiKey"
  apiKey={settings.deepseekApiKey}
  onSave={handleApiKeySave}
  placeholder={$t('settings.deepseek_config.api_key_placeholder')}
  linkHref="https://platform.deepseek.com/api_keys"
  linkText={$t('settings.groq_config.get_a_key')}
/>
<div class="flex flex-col gap-2 relative z-50">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-1 justify-between">
      <label for="deepseek-model-input" class="block"
        >{$t('settings.deepseek_config.model_name_label')}</label
      >
      <a
        href="https://api-docs.deepseek.com/quick_start/pricing"
        target="_blank"
        class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
      >
        {$t('settings.deepseek_config.view_models')}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </a>
    </div>
    <ReusableCombobox
      items={deepseekModels}
      bind:bindValue={selectedDeepseekModel}
      placeholder={$t('settings.deepseek_config.model_placeholder')}
      id="deepseek-model-input"
      ariaLabel="Search Deepseek model"
      onValueChangeCallback={handleModelChange}
    />
  </div>
</div>
