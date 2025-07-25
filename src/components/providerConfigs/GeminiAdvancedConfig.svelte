<script>
  // @ts-nocheck
  import { geminiAdvancedModels } from '../../lib/models/geminiModels.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js' // Chỉ import updateSettings
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import Icon from '@iconify/svelte'
  import ReusableSelect from '../inputs/ReusableSelect.svelte'
  import { t } from 'svelte-i18n'

  let {
    geminiAdvancedApiKey = $bindable(),
    selectedGeminiAdvancedModel = $bindable(), // Thêm lại selectedGeminiAdvancedModel là bindable prop
  } = $props()

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedGeminiAdvancedModel) {
    selectedGeminiAdvancedModel = geminiAdvancedModels[0].value
  }

  function handleGeminiAdvancedApiKeySave(apiKey) {
    updateSettings({ geminiAdvancedApiKey: apiKey })
  }

  function handleGeminiAdvancedModelChange(newValue) {
    selectedGeminiAdvancedModel = newValue
  }

  // Sử dụng $effect để lưu model khi nó thay đổi
  $effect(() => {
    updateSettings({ selectedGeminiAdvancedModel })
  })
</script>

<ApiKeyInput
  apiKey={geminiAdvancedApiKey}
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
    bindValue={selectedGeminiAdvancedModel}
    defaultLabel={$t(
      'settings.gemini_advanced_config.select_model_placeholder'
    )}
    ariaLabel={$t(
      'settings.gemini_advanced_config.select_gemini_model_aria_label'
    )}
    onValueChangeCallback={handleGeminiAdvancedModelChange}
  />
</div>
