<script>
  // @ts-nocheck
  import { geminiBasicModels } from '../../lib/prompting/models/geminiModels.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'

  let { geminiApiKey = $bindable(), selectedGeminiModel = $bindable() } =
    $props()

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedGeminiModel) {
    selectedGeminiModel = geminiBasicModels[0].value
  }

  // $effect để lưu API key đã được loại bỏ.
  // Việc lưu trữ sẽ được xử lý bởi sự kiện `onSave` của `ApiKeyInput`.

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
  label={$t('settings.gemini_basic_config.api_key_label')}
  onSave={(apiKey) => updateSettings({ geminiApiKey: apiKey })}
  linkHref="https://aistudio.google.com/app/apikey"
  linkText={$t('settings.gemini_basic_config.get_a_key')}
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
