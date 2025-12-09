<script>
  // @ts-nocheck
  import { geminiBasicModels } from '@/lib/prompts/models/geminiModels.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'

  let {
    geminiApiKey = $bindable(),
    geminiApiKeys = $bindable([]),
    selectedGeminiModel = $bindable(),
  } = $props()

  // Ensure array is initialized
  $effect(() => {
    if (!geminiApiKeys) {
      geminiApiKeys = []
    }
    // Migration fallback for component ref init
    if (geminiApiKeys.length === 0 && geminiApiKey) {
      geminiApiKeys = [geminiApiKey]
    }
    // Ensure at least one input exists if everything is empty
    if (geminiApiKeys.length === 0) {
      geminiApiKeys = ['']
    }
  })

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

  function saveKeys() {
    // Sync legacy key with the first key for backward compatibility
    let firstKey = ''
    if (geminiApiKeys && geminiApiKeys.length > 0) {
      firstKey = geminiApiKeys[0]
    }

    // Update store with both new array and legacy string
    updateSettings({
      geminiApiKeys,
      geminiApiKey: firstKey,
    })

    // Also update localized bindable if needed (though store update should handle it)
    geminiApiKey = firstKey
  }

  function addKey() {
    geminiApiKeys = [...geminiApiKeys, '']
  }

  function removeKey(index) {
    geminiApiKeys = geminiApiKeys.filter((_, i) => i !== index)
    saveKeys()
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-3">
    {#each geminiApiKeys as key, index}
      <div class="flex items-end gap-2 group">
        <div class="flex-1">
          <ApiKeyInput
            bind:apiKey={geminiApiKeys[index]}
            label={index === 0
              ? $t('settings.gemini_basic_config.api_key_label')
              : ''}
            onSave={saveKeys}
            linkHref={index === 0
              ? 'https://aistudio.google.com/app/apikey'
              : ''}
            linkText={index === 0
              ? $t('settings.gemini_basic_config.get_a_key')
              : ''}
            placeholder={$t(
              'settings.gemini_basic_config.api_key_placeholder',
            ) || 'Enter Gemini API Key'}
          />
        </div>

        {#if geminiApiKeys.length > 1}
          <button
            class="mb-1.5 p-2 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
            onclick={() => removeKey(index)}
            title="Remove API Key"
          >
            <Icon icon="heroicons:trash-20-solid" width="20" height="20" />
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <button
    class="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors w-fit px-1"
    onclick={addKey}
  >
    <Icon icon="heroicons:plus-circle-20-solid" width="18" height="18" />
    Add another API key
  </button>
</div>

<div class="flex flex-col gap-2 mt-2">
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
