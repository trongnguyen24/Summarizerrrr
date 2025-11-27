<script>
  // @ts-nocheck
  import { updateSettings } from '../../../stores/settingsStore.svelte'
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import ApiKeyInput from '../../inputs/ApiKeyInput.svelte'
  import TextInput from '../../inputs/TextInput.svelte'
  import { onMount } from 'svelte'
  import { t } from 'svelte-i18n'

  let {
    apiKey = $bindable(),
    selectedModel = '',
    onModelChange = () => {},
  } = $props()

  let openrouterModels = $state([])
  let modelLoadError = $state(null)

  /**
   * Handles saving the OpenRouter API key to GLOBAL settings
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ openrouterApiKey: key })
  }

  onMount(async () => {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const body = await response.json()

      if (body.data) {
        openrouterModels = body.data.map((model) => model.id)
      } else {
        modelLoadError = new Error("Invalid API response: missing 'data' field")
        console.error("Invalid API response: missing 'data' field", body)
      }
    } catch (error) {
      console.error('Could not load OpenRouter models:', error)
      modelLoadError = error
    }
  })

  let saveStatus = $state('')
</script>

<ApiKeyInput
  label={$t('settings.openrouter_config.api_key_label')}
  id="openrouterApiKey"
  bind:apiKey
  onSave={handleApiKeySave}
  placeholder={$t('settings.openrouter_config.api_key_placeholder')}
  linkHref="https://openrouter.ai/keys"
  linkText={$t('settings.openrouter_config.get_a_key')}
/>
<div class="flex flex-col gap-2">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-1 justify-between">
      <label for="openrouter-model-input" class="block"
        >{$t('settings.openrouter_config.model_label')}</label
      >
      {#if saveStatus}
        <p id="save-status" transition:fade class="text-success flex mr-auto">
          {$t('settings.openrouter_config.saved_status')}
        </p>
      {/if}
      <a
        href="https://openrouter.ai/models"
        target="_blank"
        class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
      >
        {$t('settings.openrouter_config.view_models')}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </a>
    </div>
    {#if modelLoadError}
      <p class="text-red-500">Error loading models: {modelLoadError.message}</p>
    {:else}
      <TextInput
        id="openrouter-model-input"
        list="openrouter-model-list"
        value={selectedModel}
        bind:saveStatus
        placeholder="Enter OpenRouter Model"
        onSave={(value) => onModelChange(value)}
      />

      <datalist id="openrouter-model-list">
        {#each openrouterModels as model}
          <option value={model}>
            {model}
          </option>
        {/each}
      </datalist>
    {/if}
  </div>
</div>
