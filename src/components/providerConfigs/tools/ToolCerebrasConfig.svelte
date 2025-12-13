<script>
  // @ts-nocheck
  import ApiKeyInput from '../../inputs/ApiKeyInput.svelte'
  import ReusableCombobox from '../../inputs/ReusableCombobox.svelte'
  import { updateSettings } from '../../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  let {
    apiKey = $bindable(),
    selectedModel = $bindable(),
    onModelChange = () => {},
  } = $props()

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

  /**
   * Handles saving the Cerebras API key to GLOBAL settings
   * @param {string} key The API key value from the input.
   */
  function saveCerebrasApiKey(key) {
    updateSettings({ cerebrasApiKey: key })
  }

  /**
   * Handles model change - calls tool-specific callback and saves to global settings
   * @param {string} value The model value from the input.
   */
  function handleModelChange(value) {
    onModelChange(value)
    updateSettings({ selectedCerebrasModel: value })
  }
</script>

<ApiKeyInput
  bind:apiKey
  label={$t('settings.cerebras_config.api_key_label')}
  linkHref="https://cloud.cerebras.ai/"
  linkText={$t('settings.cerebras_config.get_a_key')}
  onSave={saveCerebrasApiKey}
/>
<div class="flex flex-col gap-2 relative z-50">
  <label
    for="cerebras-tool-model"
    class="block text-xs font-medium text-text-primary"
    >{$t('settings.cerebras_config.model_label')}</label
  >
  <ReusableCombobox
    items={cerebrasModels}
    bind:bindValue={selectedModel}
    placeholder={$t('settings.cerebras_config.model_placeholder')}
    id="cerebras-tool-model"
    ariaLabel="Search Cerebras model"
    onValueChangeCallback={handleModelChange}
  />
</div>
