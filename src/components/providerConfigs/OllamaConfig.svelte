<script>
  // @ts-nocheck
  import TextInput from '../inputs/TextInput.svelte'
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { fade } from 'svelte/transition'
  import { t } from 'svelte-i18n'
  import ButtonIcon from '../buttons/ButtonIcon.svelte'
  import Icon from '@iconify/svelte'
  import { onMount } from 'svelte'

  let ollamaModels = $state([])
  let endpointDebounceTimer = null

  const DEFAULT_OLLAMA_ENDPOINT = 'http://127.0.0.1:11434/'

  async function fetchOllamaModels(endpoint) {
    if (!endpoint) return
    try {
      const response = await fetch(`${endpoint}api/tags`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      ollamaModels = data.models.map((model) => model.name)
    } catch (error) {
      console.error('Error fetching Ollama models:', error)
      ollamaModels = []
    }
  }

  function resetOllamaEndpoint() {
    settings.ollamaEndpoint = DEFAULT_OLLAMA_ENDPOINT
    // Also trigger the update in the store
    handleEndpointInput(DEFAULT_OLLAMA_ENDPOINT)
  }

  function handleEndpointInput(value) {
    clearTimeout(endpointDebounceTimer)
    endpointDebounceTimer = setTimeout(() => {
      let normalizedValue = value.trim()
      if (normalizedValue && !normalizedValue.endsWith('/')) {
        normalizedValue += '/'
      }
      updateSettings({ ollamaEndpoint: normalizedValue })
    }, 500) // 500ms debounce
  }

  // Fetch models when the component mounts and whenever the endpoint changes
  $effect(() => {
    fetchOllamaModels(settings.ollamaEndpoint)
  })
</script>

<div class="relative w-full">
  <TextInput
    label={$t('settings.ollama_config.endpoint_label')}
    id="Endpoint"
    placeholder={DEFAULT_OLLAMA_ENDPOINT}
    bind:value={settings.ollamaEndpoint}
    oninput={(e) => handleEndpointInput(e.target.value)}
  />
  <button
    class="absolute right-2 top-8 p-0.5 text-text-secondary hover:text-text-primary transition-colors"
    onclick={resetOllamaEndpoint}
    title={$t('settings.ollama_config.reset_endpoint_tooltip')}
  >
    <Icon icon="heroicons:arrow-path-16-solid" width="16" height="16" />
  </button>
</div>

<div class="flex flex-col gap-2">
  <div class="flex flex-col gap-2">
    <TextInput
      label={$t('settings.ollama_config.model_label')}
      id="ollama-model-input"
      list="ollama-model-list"
      bind:value={settings.selectedOllamaModel}
      placeholder={$t('settings.ollama_config.model_placeholder')}
      onSave={(value) => updateSettings({ selectedOllamaModel: value })}
    />

    <datalist id="ollama-model-list">
      {#each ollamaModels as model}
        <option value={model}>{model}</option>
      {/each}
    </datalist>
  </div>
</div>
