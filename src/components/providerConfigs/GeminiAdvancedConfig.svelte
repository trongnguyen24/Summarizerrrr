<script>
  // @ts-nocheck
  import { updateSettings } from '../../stores/settingsStore.svelte.js'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import TextInput from '../inputs/TextInput.svelte'
  import { t } from 'svelte-i18n'

  let {
    geminiAdvancedApiKey = $bindable(),
    selectedGeminiAdvancedModel = $bindable(),
  } = $props()

  let saveStatus = $state('')

  const availableModels = [
    {
      name: 'models/gemini-3-pro-preview',
      version: '3-pro-preview-11-2025',
      displayName: 'Gemini 3 Pro Preview',
    },
    {
      name: 'models/gemini-2.5-pro',
      version: '2.5',
      displayName: 'Gemini 2.5 Pro',
    },
    {
      name: 'models/gemini-2.5-flash',
      version: '001',
      displayName: 'Gemini 2.5 Flash',
    },
    {
      name: 'models/gemini-2.5-flash-lite',
      version: '001',
      displayName: 'Gemini 2.5 Flash-Lite',
    },
    {
      name: 'models/gemini-2.5-computer-use-preview-10-2025',
      version: 'Gemini 2.5 Computer Use Preview 10-2025',
      displayName: 'Gemini 2.5 Computer Use Preview 10-2025',
    },
    {
      name: 'models/gemini-2.0-flash',
      version: '2.0',
      displayName: 'Gemini 2.0 Flash',
    },
    {
      name: 'models/gemini-2.0-flash-lite',
      version: '2.0',
      displayName: 'Gemini 2.0 Flash-Lite',
    },
    {
      name: 'models/gemma-3-27b-it',
      version: '001',
      displayName: 'Gemma 3 27B',
    },
    {
      name: 'models/gemini-robotics-er-1.5-preview',
      version: '1.5-preview',
      displayName: 'Gemini Robotics-ER 1.5 Preview',
    },
  ]

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedGeminiAdvancedModel) {
    selectedGeminiAdvancedModel = availableModels[0].name
  }

  function handleGeminiAdvancedApiKeySave(apiKey) {
    updateSettings({ geminiAdvancedApiKey: apiKey })
  }
</script>

<ApiKeyInput
  apiKey={geminiAdvancedApiKey}
  label={$t('settings.gemini_advanced_config.api_key_label')}
  onSave={handleGeminiAdvancedApiKeySave}
  linkHref="https://aistudio.google.com/app/apikey"
  linkText={$t('settings.gemini_advanced_config.get_a_key')}
></ApiKeyInput>

<div class="flex flex-col gap-2">
  <TextInput
    label={$t('settings.gemini_advanced_config.select_model_label')}
    placeholder={$t('settings.gemini_advanced_config.select_model_placeholder')}
    bind:value={selectedGeminiAdvancedModel}
    bind:saveStatus
    list="gemini-models"
    onSave={(val) => updateSettings({ selectedGeminiAdvancedModel: val })}
  />
  <datalist id="gemini-models">
    {#each availableModels as model}
      <option value={model.name}>{model.displayName}</option>
    {/each}
  </datalist>
</div>
