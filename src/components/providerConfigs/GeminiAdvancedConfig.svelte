<script>
  // @ts-nocheck
  import { updateSettings } from '../../stores/settingsStore.svelte.js'
  import ApiKeyInputMulti from '../inputs/ApiKeyInputMulti.svelte'
  import ReusableCombobox from '../inputs/ReusableCombobox.svelte'
  import { t } from 'svelte-i18n'
  import { onMount } from 'svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'

  let {
    geminiAdvancedApiKey = $bindable(),
    geminiAdvancedAdditionalApiKeys = $bindable([]),
    selectedGeminiAdvancedModel = $bindable(),
  } = $props()

  let sharedSaveStatus = $state('')
  let statusTimeout = null

  const availableModels = [
    { value: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview' },
    {
      value: 'gemini-3-pro-preview',
      label: 'gemini-3-pro-preview',
    },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
    {
      value: 'gemini-2.5-flash-lite',
      label: 'gemini-2.5-flash-lite',
    },
    {
      value: 'gemini-2.5-computer-use-preview-10-2025',
      label: 'gemini-2.5-computer-use-preview-10-2025',
    },
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
    {
      value: 'gemini-2.0-flash-lite',
      label: 'gemini-2.0-flash-lite',
    },
    { value: 'gemma-3-27b-it', label: 'gemma-3-27b-it' },
    {
      value: 'gemini-robotics-er-1.5-preview',
      label: 'gemini-robotics-er-1.5-preview',
    },
  ]

  // Đảm bảo giá trị mặc định nếu props không được cung cấp
  if (!selectedGeminiAdvancedModel) {
    selectedGeminiAdvancedModel = availableModels[0].value
  }

  function saveKeys() {
    // Create a plain array copy to ensure no Proxy objects are passed to storage
    const plainAdditionalKeys = Array.from(
      $state.snapshot(geminiAdvancedAdditionalApiKeys),
    )

    updateSettings({
      geminiAdvancedApiKey,
      geminiAdvancedAdditionalApiKeys: plainAdditionalKeys,
    })

    // Update shared status
    clearTimeout(statusTimeout)
    sharedSaveStatus = 'saved!'
    statusTimeout = setTimeout(() => {
      sharedSaveStatus = ''
    }, 2000)
  }

  function addKey() {
    geminiAdvancedAdditionalApiKeys = [...geminiAdvancedAdditionalApiKeys, '']
  }

  onMount(() => {
    geminiAdvancedAdditionalApiKeys =
      settings.geminiAdvancedAdditionalApiKeys || []
  })

  function removeKey(index) {
    geminiAdvancedAdditionalApiKeys = geminiAdvancedAdditionalApiKeys.filter(
      (_, i) => i !== index,
    )
    saveKeys()
  }

  function handleModelChange(newValue) {
    if (newValue) {
      updateSettings({ selectedGeminiAdvancedModel: newValue })
    }
  }
</script>

<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-1">
    <!-- Main API Key Input -->
    <div class="flex items-end group">
      <div class="flex-1">
        <ApiKeyInputMulti
          bind:apiKey={geminiAdvancedApiKey}
          label={$t('settings.gemini_advanced_config.api_key_label')}
          onSave={saveKeys}
          linkHref={'https://aistudio.google.com/app/apikey'}
          linkText={$t('settings.gemini_advanced_config.get_a_key')}
          placeholder="Enter Gemini API Key (Primary)"
          id="gemini-advanced-api-key-main"
          externalStatus={sharedSaveStatus}
        />
      </div>
    </div>

    <!-- Additional API Keys -->
    {#each geminiAdvancedAdditionalApiKeys as key, index}
      <div class="flex items-end group">
        <div class="flex-1">
          <ApiKeyInputMulti
            bind:apiKey={geminiAdvancedAdditionalApiKeys[index]}
            label=""
            onSave={saveKeys}
            placeholder={$t(
              'settings.gemini_basic_config.placeholder_additional_key',
              { values: { index: index + 1 } },
            )}
            id={`gemini-advanced-additional-key-${index}`}
            showStatus={false}
          />
        </div>

        <button
          class="text-text-secondary size-8.5 border-l-0 flex justify-center items-center bg-muted/5 dark:bg-muted/5 border border-border focus-within:border-blackwhite/30 dark:border-blackwhite/10 dark:focus-within:border-blackwhite/20 transition-colors duration-150 hover:text-text-primary hover:bg-muted/20"
          onclick={() => removeKey(index)}
          title={$t('settings.gemini_basic_config.remove_api_key')}
          aria-label={$t('settings.gemini_basic_config.remove_api_key')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="size-4"
          >
            <path
              d="M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"
            />
          </svg>
        </button>
      </div>
    {/each}
  </div>

  <button
    class="flex items-center mx-auto gap-2 font-medium text-primary hover:text-primary/80 transition-colors w-fit px-1"
    onclick={addKey}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      class="size-4"
    >
      <path
        fill-rule="evenodd"
        d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0Z"
        clip-rule="evenodd"
      />
    </svg>

    {$t('settings.gemini_basic_config.add_key_for_higher_limit')}
  </button>
</div>

<div class="flex flex-col gap-2 relative z-50">
  <label class="text-xs text-text-secondary" for="gemini-model-select">
    {$t('settings.gemini_advanced_config.select_model_label')}
  </label>
  <ReusableCombobox
    items={availableModels}
    bind:bindValue={selectedGeminiAdvancedModel}
    placeholder={$t('settings.gemini_advanced_config.select_model_placeholder')}
    id="gemini-model-select"
    ariaLabel="Search a model"
    onValueChangeCallback={handleModelChange}
  />
</div>
