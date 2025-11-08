<script>
  // @ts-nocheck
  import { geminiAdvancedModels } from '../../../lib/prompting/models/geminiModels.js'
  import { updateSettings } from '../../../stores/settingsStore.svelte.js'
  import ApiKeyInput from '../../inputs/ApiKeyInput.svelte'
  import ReusableSelect from '../../inputs/ReusableSelect.svelte'
  import { t } from 'svelte-i18n'

  let {
    apiKey = $bindable(),
    selectedModel = $bindable(),
    onModelChange = () => {},
  } = $props()

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedModel) {
    selectedModel = geminiAdvancedModels[0].value
  }

  /**
   * Handles saving the Gemini Advanced API key to GLOBAL settings
   * @param {string} key The API key value from the input.
   */
  function handleGeminiAdvancedApiKeySave(key) {
    updateSettings({ geminiAdvancedApiKey: key })
  }

  function handleGeminiAdvancedModelChange(newValue) {
    selectedModel = newValue
    // Call tool-specific callback instead of updating global settings
    onModelChange(newValue)
  }
</script>

<ApiKeyInput
  bind:apiKey
  label={$t('settings.gemini_advanced_config.api_key_label')}
  onSave={handleGeminiAdvancedApiKeySave}
  linkHref="https://aistudio.google.com/app/apikey"
  linkText={$t('settings.gemini_advanced_config.get_a_key')}
></ApiKeyInput>

<div class="flex flex-col gap-2">
  <label for="Select a model" class="block"
    >{$t('settings.gemini_advanced_config.select_model_label')}</label
  >
  <ReusableSelect
    items={geminiAdvancedModels}
    bindValue={selectedModel}
    defaultLabel={$t(
      'settings.gemini_advanced_config.select_model_placeholder'
    )}
    ariaLabel={$t(
      'settings.gemini_advanced_config.select_gemini_model_aria_label'
    )}
    onValueChangeCallback={handleGeminiAdvancedModelChange}
  />
</div>
