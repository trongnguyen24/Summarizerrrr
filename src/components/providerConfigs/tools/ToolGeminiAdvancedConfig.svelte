<script>
  // @ts-nocheck
  import { updateSettings } from '../../../stores/settingsStore.svelte.js'
  import ApiKeyInput from '../../inputs/ApiKeyInput.svelte'
  import ReusableCombobox from '../../inputs/ReusableCombobox.svelte'
  import { t } from 'svelte-i18n'

  let {
    apiKey = $bindable(),
    selectedModel = $bindable(),
    onModelChange = () => {},
  } = $props()

  const availableModels = [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
    {
      value: 'gemini-2.5-computer-use-preview-10-2025',
      label: 'Gemini 2.5 Computer Use Preview',
    },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' },
    { value: 'gemma-3-27b-it', label: 'Gemma 3 27B' },
    {
      value: 'gemini-robotics-er-1.5-preview',
      label: 'Gemini Robotics-ER 1.5 Preview',
    },
  ]

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedModel) {
    selectedModel = availableModels[0].value
  }

  /**
   * Handles saving the Gemini Advanced API key to GLOBAL settings
   * @param {string} key The API key value from the input.
   */
  function handleGeminiAdvancedApiKeySave(key) {
    updateSettings({ geminiAdvancedApiKey: key })
  }

  function handleModelSave(newValue) {
    selectedModel = newValue
    onModelChange(newValue)
    updateSettings({ selectedGeminiAdvancedModel: newValue })
  }
</script>

<ApiKeyInput
  bind:apiKey
  label={$t('settings.gemini_advanced_config.api_key_label')}
  onSave={handleGeminiAdvancedApiKeySave}
  linkHref="https://aistudio.google.com/app/apikey"
  linkText={$t('settings.gemini_advanced_config.get_a_key')}
></ApiKeyInput>

<div class="flex flex-col gap-2 relative z-50">
  <label
    for="gemini-tool-model"
    class="block text-xs font-medium text-text-primary"
    >{$t('settings.gemini_advanced_config.select_model_label')}</label
  >
  <ReusableCombobox
    items={availableModels}
    bind:bindValue={selectedModel}
    placeholder={$t('settings.gemini_advanced_config.select_model_placeholder')}
    id="gemini-tool-model"
    ariaLabel="Search Gemini model"
    onValueChangeCallback={handleModelSave}
  />
</div>
