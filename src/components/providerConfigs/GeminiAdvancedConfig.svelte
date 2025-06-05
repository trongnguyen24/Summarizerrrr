<script>
  // @ts-nocheck
  import { geminiAdvancedModels } from '../../lib/models/geminiModels.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js' // Chỉ import updateSettings
  import ApiKeyInput from '../ApiKeyInput.svelte'
  import Icon from '@iconify/svelte'
  import ReusableSelect from '../ReusableSelect.svelte'

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
  label="Gemini API Key"
  onSave={handleGeminiAdvancedApiKeySave}
  linkHref="https://aistudio.google.com/app/apikey"
  linkText="Get a key"
></ApiKeyInput>

<div class="flex flex-col gap-2">
  <label for="Select a model" class="block text-text-primary font-bold"
    >Gemini Advanced Model</label
  >
  <ReusableSelect
    items={geminiAdvancedModels}
    bindValue={selectedGeminiAdvancedModel}
    defaultLabel="Select a model"
    ariaLabel="Select Gemini Model"
    onValueChangeCallback={handleGeminiAdvancedModelChange}
  />
</div>
