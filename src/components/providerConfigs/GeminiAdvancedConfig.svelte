<script>
  // @ts-nocheck
  import { updateSettings } from '../../stores/settingsStore.svelte.js'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import ReusableCombobox from '../inputs/ReusableCombobox.svelte'
  import { t } from 'svelte-i18n'

  let {
    geminiAdvancedApiKey = $bindable(),
    selectedGeminiAdvancedModel = $bindable(),
  } = $props()

  const availableModels = [
    {
      value: 'gemini-3-pro-preview',
      label: 'gemini-3-pro-preview',
    },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    {
      value: 'gemini-2.5-flash-lite',
      label: 'gemini-2.5-flash-lite',
    },
    {
      value: 'gemini-2.5-computer-use-preview-10-2025',
      label: 'gemini-2.5-computer-use-preview-10-2025',
    },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    {
      value: 'gemini-2.0-flash-lite',
      label: 'gemini-2.0-flash-lite',
    },
    { value: 'gemma-3-27b-it', label: 'gemma-3-27b-it' },
    {
      value: 'gemini-robotics-er-1.5-preview',
      label: 'gemini-robotics-er-1.5-preview',
    },
  ]

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedGeminiAdvancedModel) {
    selectedGeminiAdvancedModel = availableModels[0].value
  }

  function handleGeminiAdvancedApiKeySave(apiKey) {
    updateSettings({ geminiAdvancedApiKey: apiKey })
  }

  function handleModelChange(newValue) {
    if (newValue) {
      updateSettings({ selectedGeminiAdvancedModel: newValue })
    }
  }
</script>

<ApiKeyInput
  apiKey={geminiAdvancedApiKey}
  label={$t('settings.gemini_advanced_config.api_key_label')}
  onSave={handleGeminiAdvancedApiKeySave}
  linkHref="https://aistudio.google.com/app/apikey"
  linkText={$t('settings.gemini_advanced_config.get_a_key')}
></ApiKeyInput>

<div class="flex flex-col gap-2 relative z-50">
  <label
    class="text-xs font-medium text-text-primary"
    for="gemini-model-select"
  >
    {$t('settings.gemini_advanced_config.select_model_label')}
  </label>
  <ReusableCombobox
    items={availableModels}
    bind:bindValue={selectedGeminiAdvancedModel}
    placeholder={$t('settings.gemini_advanced_config.select_model_placeholder')}
    id="gemini-model-select"
    ariaLabel="Search a model"
    onValueChangeCallback={handleModelChange}
  />
</div>
