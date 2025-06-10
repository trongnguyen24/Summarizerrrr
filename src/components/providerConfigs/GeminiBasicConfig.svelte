<script>
  // @ts-nocheck
  import { geminiBasicModels } from '../../lib/models/geminiModels.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js'
  import ButtonSet from '../ButtonSet.svelte'
  import ApiKeyInput from '../ApiKeyInput.svelte'
  import Icon from '@iconify/svelte'

  let { geminiApiKey = $bindable(), selectedGeminiModel = $bindable() } =
    $props()

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedGeminiModel) {
    selectedGeminiModel = geminiBasicModels[0].value
  }

  // Sử dụng $effect để lưu API key khi nó thay đổi
  $effect(() => {
    updateSettings({ geminiApiKey: geminiApiKey.trim() })
  })

  // Sử dụng $effect để lưu model khi nó thay đổi
  $effect(() => {
    updateSettings({ selectedGeminiModel })
  })

  const modelOptions = geminiBasicModels.map((model) => ({
    id: model.value,
    name: model.label,
    description: model.description,
  }))
</script>

<ApiKeyInput
  apiKey={geminiApiKey}
  label="Gemini API Key"
  onSave={(apiKey) => updateSettings({ geminiApiKey: apiKey })}
  linkHref="https://aistudio.google.com/app/apikey"
  linkText="Get a key"
/>

<div class="flex flex-col gap-2">
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class="block">Select Gemini Model</label>
  <div class="grid grid-cols-3 w-full gap-1">
    {#each modelOptions as model}
      <ButtonSet
        title={model.name}
        class="setting-btn {selectedGeminiModel === model.id ? 'active' : ''}"
        onclick={() => (selectedGeminiModel = model.id)}
        Description={model.description}
      ></ButtonSet>
    {/each}
  </div>
</div>
