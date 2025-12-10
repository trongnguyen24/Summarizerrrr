<script>
  // @ts-nocheck
  import { geminiBasicModels } from '@/lib/prompts/models/geminiModels.js'
  import { updateSettings } from '../../stores/settingsStore.svelte.js'
  import ButtonSet from '../buttons/ButtonSet.svelte'
  import ApiKeyInputMulti from '../inputs/ApiKeyInputMulti.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { onMount } from 'svelte'

  let {
    geminiApiKey = $bindable(),
    geminiAdditionalApiKeys = $bindable([]),
    selectedGeminiModel = $bindable(),
  } = $props()

  let sharedSaveStatus = $state('')
  let statusTimeout = null

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
    // Create a plain array copy to ensure no Proxy objects are passed to storage
    const plainAdditionalKeys = Array.from(
      $state.snapshot(geminiAdditionalApiKeys),
    )

    updateSettings({
      geminiApiKey,
      geminiAdditionalApiKeys: plainAdditionalKeys,
    })

    // Update shared status
    clearTimeout(statusTimeout)
    sharedSaveStatus = 'saved!'
    statusTimeout = setTimeout(() => {
      sharedSaveStatus = ''
    }, 2000)
  }

  function addKey() {
    geminiAdditionalApiKeys = [...geminiAdditionalApiKeys, '']
  }

  onMount(() => {
    geminiAdditionalApiKeys = settings.geminiAdditionalApiKeys
  })

  function removeKey(index) {
    geminiAdditionalApiKeys = geminiAdditionalApiKeys.filter(
      (_, i) => i !== index,
    )
    saveKeys()
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-1">
    <!-- Main API Key Input -->
    <div class="flex items-end group">
      <div class="flex-1">
        <ApiKeyInputMulti
          bind:apiKey={geminiApiKey}
          label={$t('settings.gemini_basic_config.api_key_label')}
          onSave={saveKeys}
          linkHref={'https://aistudio.google.com/app/apikey'}
          placeholder="Enter Gemini API Key (Primary)"
          id="gemini-api-key-main"
          externalStatus={sharedSaveStatus}
        />
      </div>
    </div>

    <!-- Additional API Keys -->
    {#each geminiAdditionalApiKeys as key, index}
      <div class="flex items-end group">
        <div class="flex-1">
          <ApiKeyInputMulti
            bind:apiKey={geminiAdditionalApiKeys[index]}
            label=""
            onSave={saveKeys}
            placeholder={`Enter Additional Gemini API Key #${index + 1}`}
            id={`gemini-additional-key-${index}`}
            showStatus={false}
          />
        </div>

        <button
          class="text-text-secondary bg-muted/5 border size-8.5 border-l-0 flex justify-center items-center border-border hover:text-text-primary hover:bg-muted/20 transition-colors"
          onclick={() => removeKey(index)}
          title="Remove API Key"
        >
          <Icon icon="heroicons:minus-16-solid" width="16" height="16" />
        </button>
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
