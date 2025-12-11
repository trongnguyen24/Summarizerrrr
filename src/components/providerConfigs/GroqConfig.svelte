<script>
  // @ts-nocheck
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import ReusableCombobox from '../inputs/ReusableCombobox.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { t } from 'svelte-i18n'

  const groqModels = [
    { value: 'groq/compound', label: 'groq/compound' },
    { value: 'groq/compound-mini', label: 'groq/compound-mini' },
    { value: 'llama-3.1-8b-instant', label: 'llama-3.1-8b-instant' },
    { value: 'llama-3.3-70b-versatile', label: 'llama-3.3-70b-versatile' },
    {
      value: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      label: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    },
    {
      value: 'meta-llama/llama-4-scout-17b-16e-instruct',
      label: 'meta-llama/llama-4-scout-17b-16e-instruct',
    },
    {
      value: 'meta-llama/llama-guard-4-12b',
      label: 'meta-llama/llama-guard-4-12b',
    },
    {
      value: 'meta-llama/llama-prompt-guard-2-22m',
      label: 'meta-llama/llama-prompt-guard-2-22m',
    },
    {
      value: 'meta-llama/llama-prompt-guard-2-86m',
      label: 'meta-llama/llama-prompt-guard-2-86m',
    },
    {
      value: 'moonshotai/kimi-k2-instruct',
      label: 'moonshotai/kimi-k2-instruct',
    },
    {
      value: 'moonshotai/kimi-k2-instruct-0905',
      label: 'moonshotai/kimi-k2-instruct-0905',
    },
    { value: 'openai/gpt-oss-120b', label: 'openai/gpt-oss-120b' },
    { value: 'openai/gpt-oss-20b', label: 'openai/gpt-oss-20b' },
    {
      value: 'openai/gpt-oss-safeguard-20b',
      label: 'openai/gpt-oss-safeguard-20b',
    },
  ]

  function saveGroqApiKey(key) {
    updateSettings({ groqApiKey: key })
  }

  function handleModelChange(value) {
    updateSettings({ selectedGroqModel: value })
  }
</script>

<ApiKeyInput
  apiKey={settings.groqApiKey}
  label={$t('settings.groq_config.api_key_label')}
  linkHref="https://console.groq.com/keys"
  linkText={$t('settings.groq_config.get_a_key')}
  onSave={saveGroqApiKey}
/>
<div class="flex flex-col gap-2 relative z-50">
  <label
    for="groq-model-input"
    class="block text-xs font-medium text-text-primary"
    >{$t('settings.groq_config.model_label')}</label
  >
  <ReusableCombobox
    items={groqModels}
    bind:bindValue={settings.selectedGroqModel}
    placeholder={$t('settings.groq_config.model_placeholder')}
    id="groq-model-input"
    ariaLabel="Search Groq model"
    onValueChangeCallback={handleModelChange}
  />
</div>
