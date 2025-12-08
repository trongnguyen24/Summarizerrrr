<script>
  // @ts-nocheck
  import { geminiBasicModels } from '@/lib/prompts/models/geminiModels.js'
  import {
    updateSettings,
    settings,
  } from '../../stores/settingsStore.svelte.js'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import MultiApiKeyInput from '../inputs/MultiApiKeyInput.svelte'
  import { t } from 'svelte-i18n'

  let { selectedGeminiModel = $bindable() } = $props()

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedGeminiModel) {
    selectedGeminiModel = geminiBasicModels[0].value
  }

  // Sử dụng $effect để lưu model khi nó thay đổi
  $effect(() => {
    updateSettings({ selectedGeminiModel })
  })

  const modelOptions = geminiBasicModels.map((model) => ({
    id: model.value,
    name: model.label,
    description: model.description,
  }))

  // Handle keys change - forces reactive update
  function handleKeysChange() {
    // Settings đã được update bởi apiKeyRotationService,
    // nhưng chúng ta có thể thêm logic bổ sung ở đây nếu cần
  }
</script>

<MultiApiKeyInput
  bind:apiKeys={settings.geminiApiKeys}
  bind:currentIndex={settings.currentGeminiApiKeyIndex}
  label={$t('settings.gemini_basic_config.api_key_label')}
  linkHref="https://aistudio.google.com/app/apikey"
  linkText={$t('settings.gemini_basic_config.get_a_key')}
  onKeysChange={handleKeysChange}
/>

<div class="flex flex-col gap-2">
  <!-- svelte-ignore a11y_label_has_associated_control -->
  <label class="block"
    >{$t('settings.gemini_basic_config.select_model_label')}</label
  >
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
